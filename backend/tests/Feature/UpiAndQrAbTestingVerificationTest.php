<?php

namespace Tests\Feature;

use App\Domain\FrontOffice\Models\Booking;
use App\Domain\FrontOffice\Models\FolioItem;
use App\Domain\FrontOffice\Models\Guest;
use App\Domain\FrontOffice\Models\Payment;
use App\Domain\FrontOffice\Models\Room;
use App\Domain\Restaurant\Models\RestaurantMenuCategory;
use App\Domain\Restaurant\Models\RestaurantMenuItem;
use App\Domain\Restaurant\Models\RestaurantOrder;
use App\Domain\Restaurant\Models\RestaurantOrderItem;
use App\Domain\Restaurant\Models\RestaurantTable;
use App\Domain\Tenancy\Models\Hotel;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Comprehensive A/B Testing Verification Suite
 * Scenario A: Default Baseline Hotel (No custom UPI set)
 * Scenario B: Configured Custom Hotel (Custom UPI VPA, Payee Name & Standee)
 */
class UpiAndQrAbTestingVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected User $owner;
    protected User $cashierHotelA;
    protected User $cashierHotelB;
    protected Hotel $hotelA;
    protected Hotel $hotelB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        $this->owner = User::where('email', 'owner@apexhospitality.com')->first();
        $this->hotelA = Hotel::where('hotel_code', 'HTL-1001')->first();
        $this->hotelB = Hotel::where('hotel_code', 'HTL-1002')->first();
        $this->cashierHotelA = User::where('email', 'frontdesk.priya@apexhospitality.com')->first();
        $this->cashierHotelB = User::where('email', 'cashier.rahul@apexhospitality.com')->first();
    }

    /**
     * SCENARIO A (Baseline): Default Unconfigured Hotel
     * Hotel A has no custom UPI set. Verify smart fallback and clean dynamic QR details in Front Desk.
     */
    public function test_scenario_a_unconfigured_hotel_uses_clean_defaults(): void
    {
        // 1. Fetch settings for unconfigured Hotel A
        $response = $this->actingAs($this->owner)
            ->withHeader('X-Hotel-Context', $this->hotelA->id)
            ->getJson('/api/v1/hotel/payment-settings');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'hotel' => [
                    'id' => $this->hotelA->id,
                    'hotel_code' => 'HTL-1001',
                ],
                'settings' => [
                    'upi_payee_name' => $this->hotelA->name,
                    'is_configured' => false,
                ],
            ]);

        $upiId = $response->json('settings.upi_id');
        $this->assertNotEmpty($upiId);
        $this->assertStringContainsString('@', $upiId);

        // 2. Front Office Desk Payment settlement with default UPI on Hotel A
        $room = Room::where('hotel_id', $this->hotelA->id)->first();
        $guest = Guest::where('hotel_id', $this->hotelA->id)->first()
            ?? Guest::create([
                'hotel_id' => $this->hotelA->id,
                'first_name' => 'Vikram',
                'last_name' => 'Sharma',
                'phone' => '+919988776655',
                'id_type' => 'AADHAAR',
                'id_number' => '123499998888',
                'nationality' => 'India',
                'country' => 'India',
            ]);

        $booking = Booking::create([
            'hotel_id' => $this->hotelA->id,
            'guest_id' => $guest->id,
            'room_id' => $room->id,
            'booking_number' => 'BKG-AB-TEST-A01',
            'check_in_at' => now(),
            'expected_check_out_at' => now()->addDays(2),
            'room_rate_per_night' => 2500,
            'total_nights' => 2,
            'total_room_charges' => 5000,
            'grand_total' => 5000,
            'paid_amount' => 0,
            'balance_amount' => 5000,
            'payment_status' => 'PENDING',
        ]);

        $paymentRes = $this->actingAs($this->cashierHotelA)
            ->withHeader('X-Hotel-Context', $this->hotelA->id)
            ->postJson("/api/v1/front-office/bookings/{$booking->id}/payments", [
                'amount' => 5000,
                'payment_method' => 'UPI_QR',
                'transaction_reference' => 'UPI-DEF-REF-999',
                'payment_type' => 'SETTLEMENT',
                'notes' => 'Scanned default dynamic hotel UPI QR',
            ]);

        $paymentRes->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $this->assertDatabaseHas('payments', [
            'booking_id' => $booking->id,
            'amount' => 5000.00,
            'payment_method' => 'UPI_QR',
            'transaction_reference' => 'UPI-DEF-REF-999',
        ]);
    }

    /**
     * SCENARIO B: Configured Custom Hotel
     * Hotel B configures official UPI ID, custom Payee Name, Standee Image & Merchant Code.
     */
    public function test_scenario_b_custom_configured_hotel_reflects_everywhere(): void
    {
        // 1. Owner updates UPI configuration for Hotel B
        $updateRes = $this->actingAs($this->owner)
            ->withHeader('X-Hotel-Context', $this->hotelB->id)
            ->putJson('/api/v1/hotel/payment-settings', [
                'upi_id' => 'apexseabreeze@icici',
                'upi_payee_name' => 'Apex Sea Breeze Goa Resort',
                'upi_qr_image' => 'https://cdn.example.com/standee-seabreeze.png',
                'upi_merchant_code' => '7011',
            ]);

        $updateRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'settings' => [
                    'upi_id' => 'apexseabreeze@icici',
                    'upi_payee_name' => 'Apex Sea Breeze Goa Resort',
                    'upi_qr_image' => 'https://cdn.example.com/standee-seabreeze.png',
                    'upi_merchant_code' => '7011',
                    'is_configured' => true,
                ],
            ]);

        // 2. Verify cashiers or staff fetching Hotel B settings receive the custom configuration
        $fetchRes = $this->actingAs($this->cashierHotelB)
            ->withHeader('X-Hotel-Context', $this->hotelB->id)
            ->getJson('/api/v1/hotel/payment-settings');

        $fetchRes->assertStatus(200)
            ->assertJson([
                'settings' => [
                    'upi_id' => 'apexseabreeze@icici',
                    'upi_payee_name' => 'Apex Sea Breeze Goa Resort',
                    'upi_qr_image' => 'https://cdn.example.com/standee-seabreeze.png',
                    'is_configured' => true,
                ],
            ]);

        // 3. Settle restaurant bill with UTR on Hotel B
        $tableB = RestaurantTable::where('hotel_id', $this->hotelB->id)->first()
            ?? RestaurantTable::create([
                'hotel_id' => $this->hotelB->id,
                'table_no' => 'T-B01',
                'capacity' => 2,
                'seating_area' => 'Poolside Deck',
                'status' => 'OCCUPIED',
            ]);

        $orderB = RestaurantOrder::create([
            'hotel_id' => $this->hotelB->id,
            'table_id' => $tableB->id,
            'order_number' => 'ORD-TEST-B202',
            'order_type' => 'DINE_IN',
            'status' => 'SERVED',
            'subtotal' => 320,
            'tax_amount' => 16,
            'discount_amount' => 0,
            'grand_total' => 336,
            'payment_status' => 'PENDING',
        ]);

        $settleResB = $this->actingAs($this->cashierHotelB)
            ->withHeader('X-Hotel-Context', $this->hotelB->id)
            ->postJson("/api/v1/restaurant/orders/{$orderB->id}/settle", [
                'settlement_method' => 'UPI_QR',
                'transaction_reference' => 'UTR-430219928312',
            ]);

        $settleResB->assertStatus(200)
            ->assertJson([
                'success' => true,
                'order' => [
                    'status' => 'SETTLED',
                    'settlement_method' => 'UPI_QR',
                    'settlement_reference' => 'UTR-430219928312',
                ],
            ]);

        $this->assertDatabaseHas('restaurant_orders', [
            'id' => $orderB->id,
            'grand_total' => 336.00,
            'settlement_method' => 'UPI_QR',
            'settlement_reference' => 'UTR-430219928312',
            'status' => 'SETTLED',
        ]);
    }

    /**
     * MULTI-TENANT ISOLATION A/B TEST:
     * Updating Hotel B's UPI settings must NOT alter Hotel A's settings.
     */
    public function test_ab_multi_tenant_isolation_between_hotel_a_and_b(): void
    {
        // Set Hotel B
        $this->actingAs($this->owner)
            ->withHeader('X-Hotel-Context', $this->hotelB->id)
            ->putJson('/api/v1/hotel/payment-settings', [
                'upi_id' => 'seabreeze.goa@paytm',
                'upi_payee_name' => 'Goa Sea Breeze Hotel',
            ]);

        // Verify Hotel A remains untouched
        $resA = $this->actingAs($this->owner)
            ->withHeader('X-Hotel-Context', $this->hotelA->id)
            ->getJson('/api/v1/hotel/payment-settings');

        $this->assertNotEquals('seabreeze.goa@paytm', $resA->json('settings.upi_id'));
        $this->assertNotEquals('Goa Sea Breeze Hotel', $resA->json('settings.upi_payee_name'));
    }

    /**
     * VALIDATION & SECURITY TEST:
     * Invalid UPI IDs must be strictly rejected with HTTP 422.
     */
    public function test_ab_validation_rejects_malformed_upis(): void
    {
        $invalidUpis = [
            'no-at-sign-here',
            'space in@upi',
            '@onlybank.com',
            'user@',
            'user@bank@extra',
        ];

        foreach ($invalidUpis as $badUpi) {
            $res = $this->actingAs($this->owner)
                ->withHeader('X-Hotel-Context', $this->hotelA->id)
                ->putJson('/api/v1/hotel/payment-settings', [
                    'upi_id' => $badUpi,
                ]);

            $res->assertStatus(422)
                ->assertJsonValidationErrors(['upi_id']);
        }
    }
}
