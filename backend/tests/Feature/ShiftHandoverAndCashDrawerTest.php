<?php

namespace Tests\Feature;

use App\Domain\Finance\Models\CashDrawerTransaction;
use App\Domain\Finance\Models\ShiftHandover;
use App\Domain\FrontOffice\Models\Booking;
use App\Domain\FrontOffice\Models\Guest;
use App\Domain\FrontOffice\Models\Payment;
use App\Domain\FrontOffice\Models\Room;
use App\Domain\Restaurant\Models\RestaurantOrder;
use App\Domain\Tenancy\Models\Hotel;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShiftHandoverAndCashDrawerTest extends TestCase
{
    use RefreshDatabase;

    protected User $owner;
    protected User $cashier;
    protected Hotel $hotel;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        $this->owner = User::where('email', 'owner@apexhospitality.com')->first();
        $this->cashier = User::where('email', 'frontdesk.priya@apexhospitality.com')->first();
        $this->hotel = Hotel::where('hotel_code', 'HTL-1001')->first();
    }

    public function test_user_can_open_shift_with_opening_float(): void
    {
        $response = $this->actingAs($this->cashier)
            ->withHeader('X-Hotel-Context', $this->hotel->id)
            ->postJson('/api/v1/shifts/open', [
                'department' => 'FRONT_DESK',
                'shift_type' => 'MORNING',
                'opening_float' => 3000,
                'opening_notes' => 'Received ₹3000 float from night safe.',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'shift' => [
                    'department' => 'FRONT_DESK',
                    'shift_type' => 'MORNING',
                    'opening_float' => '3000.00',
                    'status' => 'OPEN',
                ],
            ]);

        $this->assertDatabaseHas('shift_handovers', [
            'hotel_id' => $this->hotel->id,
            'department' => 'FRONT_DESK',
            'status' => 'OPEN',
            'opening_float' => 3000,
        ]);
    }

    public function test_cannot_open_duplicate_shift_for_same_department_when_active(): void
    {
        // First shift opened
        $this->actingAs($this->cashier)
            ->withHeader('X-Hotel-Context', $this->hotel->id)
            ->postJson('/api/v1/shifts/open', [
                'department' => 'FRONT_DESK',
                'shift_type' => 'MORNING',
                'opening_float' => 2000,
            ])
            ->assertStatus(201);

        // Try opening another FRONT_DESK shift while active
        $response = $this->actingAs($this->cashier)
            ->withHeader('X-Hotel-Context', $this->hotel->id)
            ->postJson('/api/v1/shifts/open', [
                'department' => 'FRONT_DESK',
                'shift_type' => 'MORNING',
                'opening_float' => 1000,
            ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
            ]);
    }

    public function test_can_record_mid_shift_cash_transactions(): void
    {
        $openResponse = $this->actingAs($this->cashier)
            ->withHeader('X-Hotel-Context', $this->hotel->id)
            ->postJson('/api/v1/shifts/open', [
                'department' => 'FRONT_DESK',
                'shift_type' => 'MORNING',
                'opening_float' => 5000,
            ]);

        $shiftId = $openResponse->json('shift.id');

        // Record petty cash payout
        $payoutResponse = $this->actingAs($this->cashier)
            ->withHeader('X-Hotel-Context', $this->hotel->id)
            ->postJson("/api/v1/shifts/{$shiftId}/cash-transaction", [
                'transaction_type' => 'PAYOUT',
                'amount' => 450,
                'reason' => 'Guest laundry urgent vendor payout',
                'recipient_name' => 'Speedy Dry Cleaners',
                'receipt_voucher_no' => 'VCH-001',
            ]);

        $payoutResponse->assertStatus(201)
            ->assertJson([
                'success' => true,
                'live_financials' => [
                    'opening_float' => 5000,
                    'cash_payouts' => 450,
                    'expected_cash' => 4550, // 5000 - 450
                ],
            ]);

        $this->assertDatabaseHas('cash_drawer_transactions', [
            'shift_handover_id' => $shiftId,
            'transaction_type' => 'PAYOUT',
            'amount' => 450,
        ]);

        // Attempt to payout more than remaining available cash (₹4550) -> e.g. ₹10,000
        $excessPayout = $this->actingAs($this->cashier)
            ->withHeader('X-Hotel-Context', $this->hotel->id)
            ->postJson("/api/v1/shifts/{$shiftId}/cash-transaction", [
                'transaction_type' => 'PAYOUT',
                'amount' => 10000,
                'reason' => 'Excess unauthorized payout',
            ]);

        $excessPayout->assertStatus(422)
            ->assertJson([
                'success' => false,
            ]);
    }

    public function test_can_close_shift_and_verify_computed_collections_and_variance(): void
    {
        // 1. Open shift with 2000 float
        $openResponse = $this->actingAs($this->cashier)
            ->withHeader('X-Hotel-Context', $this->hotel->id)
            ->postJson('/api/v1/shifts/open', [
                'department' => 'FRONT_DESK',
                'shift_type' => 'MORNING',
                'opening_float' => 2000,
            ]);

        $shiftId = $openResponse->json('shift.id');

        // 2. Simulate Front Desk Cash Collection
        $room = $this->hotel->rooms()->first();
        $guest = Guest::create([
            'hotel_id' => $this->hotel->id,
            'first_name' => 'Vikram',
            'last_name' => 'Rajput',
            'phone' => '+919876500000',
            'id_type' => 'AADHAAR',
            'id_number' => '123456789012',
        ]);

        $booking = Booking::create([
            'hotel_id' => $this->hotel->id,
            'guest_id' => $guest->id,
            'room_id' => $room->id,
            'booking_number' => 'BKG-TEST-01',
            'check_in_at' => now(),
            'expected_check_out_at' => now()->addDays(2),
            'status' => 'CHECKED_IN',
            'room_rate_per_night' => 2500,
            'total_nights' => 2,
            'total_room_charges' => 5000,
            'grand_total' => 5000,
            'paid_amount' => 1500,
            'balance_amount' => 3500,
        ]);

        Payment::create([
            'booking_id' => $booking->id,
            'receipt_number' => 'RCP-TEST-001',
            'amount' => 1500,
            'payment_method' => 'CASH',
            'payment_type' => 'ADVANCE_DEPOSIT',
        ]);

        // 3. Simulate Restaurant Order Cash Collection
        RestaurantOrder::create([
            'hotel_id' => $this->hotel->id,
            'order_number' => 'ORD-POS-001',
            'order_type' => 'DINE_IN',
            'status' => 'SETTLED',
            'subtotal' => 500,
            'grand_total' => 500,
            'settlement_method' => 'CASH',
            'settled_at' => now(),
        ]);

        // Expected Cash = 2000 (float) + 1500 (FD cash) + 500 (POS cash) = 4000
        // Physical count = 4000 -> variance = 0
        $closeResponse = $this->actingAs($this->cashier)
            ->withHeader('X-Hotel-Context', $this->hotel->id)
            ->postJson("/api/v1/shifts/{$shiftId}/close", [
                'actual_cash_counted' => 4000,
                'denominations' => [
                    '500' => 8,
                ],
                'handover_to_user_id' => $this->owner->id,
                'handover_notes' => 'Room 101 owes balance ₹3500, keys handed over to Owner.',
            ]);

        $closeResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'variance_summary' => [
                    'expected_cash' => 4000,
                    'actual_cash_counted' => 4000,
                    'variance' => 0,
                    'status' => 'BALANCED',
                ],
            ]);

        // 4. Fetch Printable Slip
        $slipResponse = $this->actingAs($this->cashier)
            ->withHeader('X-Hotel-Context', $this->hotel->id)
            ->getJson("/api/v1/shifts/{$shiftId}/slip");

        $slipResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'slip' => [
                    'hotel_code' => 'HTL-1001',
                    'department' => 'FRONT_DESK',
                    'opened_by' => 'Priya Sharma (Front Desk)',
                    'handed_over_to' => 'Rajesh Sharma',
                    'financials' => [
                        'opening_float' => 2000,
                        'system_cash_sales' => 2000,
                        'expected_cash' => 4000,
                        'actual_cash_counted' => 4000,
                        'variance' => 0,
                    ],
                ],
            ]);
    }
}
