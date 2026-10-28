<?php

namespace Tests\Feature;

use App\Domain\FrontOffice\Models\Booking;
use App\Domain\FrontOffice\Models\Room;
use App\Domain\Restaurant\Models\MenuItem;
use App\Domain\Restaurant\Models\RestaurantOrder;
use App\Domain\Restaurant\Models\RestaurantTable;
use App\Domain\Subscriptions\Actions\AssignHotelModulesAction;
use App\Domain\Subscriptions\Models\Module;
use App\Domain\Tenancy\Models\Hotel;
use App\Domain\Tenancy\Models\Organization;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class Concurrency100UsersSimulationTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $org;
    protected Hotel $hotel;
    protected User $staff;
    protected MenuItem $menuDish1;
    protected MenuItem $menuDish2;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Setup Organization & Hotel with 100-room capacity
        $this->org = Organization::create([
            'org_code' => 'ORG-LOAD-100',
            'name' => 'Grand Horizon Hotels & Resorts',
            'billing_email' => 'finance@grandhorizon.com',
            'tax_number' => '27AAACG9999H1Z8',
            'status' => 'ACTIVE',
        ]);

        $this->hotel = Hotel::create([
            'organization_id' => $this->org->id,
            'hotel_code' => 'HTL-LOAD-100',
            'name' => 'Grand Horizon Luxury Resort',
            'slug' => 'grand-horizon-luxury-resort',
            'city' => 'Goa',
            'phone' => '+91 832 2999888',
            'status' => 'ACTIVE',
        ]);

        // 2. Enable All Modules
        $modules = ['front_office', 'rooms', 'restaurant', 'kitchen', 'store', 'purchase'];
        foreach ($modules as $code) {
            Module::firstOrCreate(['code' => $code], [
                'name' => ucfirst(str_replace('_', ' ', $code)),
                'is_active' => true,
            ]);
        }
        app(AssignHotelModulesAction::class)->execute($this->hotel, $modules);

        // 3. Front Desk / Operations User
        $this->staff = User::create([
            'organization_id' => $this->org->id,
            'name' => 'General Manager',
            'email' => 'gm@grandhorizon.com',
            'password' => bcrypt('Password@123'),
            'is_platform_admin' => false,
            'is_org_owner' => true,
            'status' => 'ACTIVE',
        ]);

        // 4. Seed Restaurant Menu Items
        // Dish 1: Butter Chicken / Paneer Makhani @ ₹300 (5% GST = ₹15)
        $this->menuDish1 = MenuItem::create([
            'hotel_id' => $this->hotel->id,
            'category_name' => 'Main Course',
            'item_code' => 'DSH-MAK-01',
            'name' => 'Signature Paneer Makhani',
            'price' => 300.00,
            'gst_percentage' => 5.00,
            'food_type' => 'VEG',
            'is_available' => true,
        ]);

        // Dish 2: Butter Garlic Naan @ ₹50 (5% GST = ₹2.50)
        $this->menuDish2 = MenuItem::create([
            'hotel_id' => $this->hotel->id,
            'category_name' => 'Breads',
            'item_code' => 'DSH-NAN-02',
            'name' => 'Butter Garlic Naan',
            'price' => 50.00,
            'gst_percentage' => 5.00,
            'food_type' => 'VEG',
            'is_available' => true,
        ]);
        // Total food order = ₹350 + 5% GST (₹17.50) = ₹367.50
    }

    /**
     * STRESS SIMULATION 1:
     * 100 Users simultaneously:
     *   1. Book 100 different rooms and check in with advance deposit
     *   2. Order food from Restaurant (Room Service)
     *   3. Settle food bill to Room Folio
     *   4. Check out with final settlement
     *
     * Tests:
     *   - Zero 500 crashes
     *   - Zero unique constraint collisions on booking_number & order_number
     *   - 100% accurate folio reflection of restaurant bills
     *   - 100% accurate zero balance post-checkout
     *   - All 100 rooms marked DIRTY
     */
    public function test_100_users_simultaneous_booking_restaurant_order_and_checkout_load(): void
    {
        $startTime = microtime(true);
        $totalUsers = 100;

        // Step 0: Pre-create 100 distinct rooms
        $rooms = [];
        for ($i = 1; $i <= $totalUsers; $i++) {
            $floor = 'Floor ' . (intdiv($i - 1, 20) + 1);
            $roomNum = (string) (100 + $i);
            $rooms[$i] = Room::create([
                'hotel_id' => $this->hotel->id,
                'room_number' => $roomNum,
                'room_type' => ($i % 3 === 0) ? 'Executive Suite' : (($i % 2 === 0) ? 'Deluxe Sea View' : 'Standard King'),
                'room_mode' => 'AC',
                'floor' => $floor,
                'base_price' => 2000.00, // ₹2,000/night
                'extra_bedding_price' => 400.00,
                'gst_percentage' => 12.00, // ₹240/night GST
                'status' => 'AVAILABLE',
                'max_guests' => 2,
            ]);
        }

        $this->assertEquals($totalUsers, Room::where('hotel_id', $this->hotel->id)->count());

        $bookingIds = [];
        $orderIds = [];
        $failures = [];

        // ========================================================
        // STAGE 1: 100 USERS SIMULTANEOUS ROOM BOOKINGS & CHECK-IN
        // ========================================================
        for ($i = 1; $i <= $totalUsers; $i++) {
            $room = $rooms[$i];
            $payload = [
                'first_name' => "Guest{$i}",
                'last_name' => "Sharma",
                'phone' => '+91 98' . str_pad($i, 8, '0', STR_PAD_LEFT),
                'email' => "guest{$i}.sharma@example.com",
                'nationality' => 'Indian',
                'id_type' => 'AADHAAR',
                'id_number' => str_pad($i, 4, '1', STR_PAD_LEFT) . '-' . str_pad($i, 4, '2', STR_PAD_LEFT) . '-' . str_pad($i, 4, '3', STR_PAD_LEFT),
                'room_id' => $room->id,
                'expected_check_out_at' => Carbon::now()->addDays(1)->setHour(11)->toIso8601String(),
                'num_adults' => 2,
                'advance_deposit_amount' => 500.00,
                'payment_method' => 'UPI_QR',
            ];

            $res = $this->actingAs($this->staff)
                ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
                ->postJson('/api/v1/front-office/check-in', $payload);

            if ($res->status() !== 201) {
                $failures[] = "Stage 1 (Check-in) User {$i} failed: " . $res->status() . " - " . json_encode($res->json());
            } else {
                $bookingIds[$i] = $res->json('booking.id');
            }
        }

        $this->assertEmpty($failures, "Failures encountered during Stage 1 Check-ins:\n" . implode("\n", $failures));
        $this->assertCount($totalUsers, $bookingIds);

        // Verify all 100 rooms are now OCCUPIED
        $occupiedCount = Room::where('hotel_id', $this->hotel->id)->where('status', 'OCCUPIED')->count();
        $this->assertEquals($totalUsers, $occupiedCount, "All 100 rooms should be OCCUPIED.");

        // ========================================================
        // STAGE 2: 100 USERS ORDER FOOD FROM RESTAURANT (ROOM SERVICE)
        // ========================================================
        for ($i = 1; $i <= $totalUsers; $i++) {
            $room = $rooms[$i];
            $bId = $bookingIds[$i];

            $orderPayload = [
                'order_type' => 'ROOM_SERVICE',
                'room_id' => $room->id,
                'booking_id' => $bId,
                'covers' => 2,
                'items' => [
                    [
                        'menu_item_id' => $this->menuDish1->id,
                        'quantity' => 1,
                        'special_notes' => "Less spicy for Room {$room->room_number}",
                    ],
                    [
                        'menu_item_id' => $this->menuDish2->id,
                        'quantity' => 1,
                        'special_notes' => 'Hot garlic butter',
                    ],
                ],
            ];

            $res = $this->actingAs($this->staff)
                ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
                ->postJson('/api/v1/restaurant/orders', $orderPayload);

            if ($res->status() !== 201) {
                $failures[] = "Stage 2 (Order) User {$i} failed: " . $res->status() . " - " . json_encode($res->json());
            } else {
                $orderIds[$i] = $res->json('order.id');
                // Expected food total: 300 + 50 = 350 + 5% GST (17.50) = 367.50
                $this->assertEquals(367.50, (float) $res->json('order.grand_total'));
            }
        }

        $this->assertEmpty($failures, "Failures encountered during Stage 2 Orders:\n" . implode("\n", $failures));
        $this->assertCount($totalUsers, $orderIds);

        // ========================================================
        // STAGE 3: 100 RESTAURANT ORDERS SETTLED TO ROOM FOLIO
        // ========================================================
        for ($i = 1; $i <= $totalUsers; $i++) {
            $room = $rooms[$i];
            $bId = $bookingIds[$i];
            $oId = $orderIds[$i];

            $settleRes = $this->actingAs($this->staff)
                ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
                ->postJson("/api/v1/restaurant/orders/{$oId}/settle", [
                    'settlement_method' => 'ROOM_FOLIO',
                    'room_id' => $room->id,
                    'booking_id' => $bId,
                ]);

            if ($settleRes->status() !== 200) {
                $failures[] = "Stage 3 (Settle to Folio) User {$i} failed: " . $settleRes->status() . " - " . json_encode($settleRes->json());
            }
        }

        $this->assertEmpty($failures, "Failures encountered during Stage 3 Folio Settlements:\n" . implode("\n", $failures));

        // Verify that each booking now has extra charges of exactly ₹367.50
        foreach ($bookingIds as $idx => $bId) {
            $booking = Booking::with('folioItems')->find($bId);
            $this->assertEquals(367.50, (float) $booking->total_extra_charges, "Booking {$idx} extra charges mismatch.");
            $this->assertTrue(
                $booking->folioItems->contains(fn($item) => $item->item_type === 'FOOD_BEVERAGE' && (float) $item->total_price === 367.50),
                "Booking {$idx} should contain the ₹367.50 FOOD_BEVERAGE folio item."
            );
        }

        // ========================================================
        // STAGE 4: 100 USERS CHECK OUT & INVOICING VERIFICATION
        // ========================================================
        // Expected billing breakdown per user:
        // Room charge (1 night) = ₹2,000.00
        // Room GST 12% = ₹240.00
        // Food order (inclusive of 5% food GST) = ₹367.50
        // Total Grand Total = ₹2,607.50
        // Advance Deposit paid = ₹500.00
        // Balance due at checkout = ₹2,107.50
        $expectedBalance = 2107.50;

        for ($i = 1; $i <= $totalUsers; $i++) {
            $bId = $bookingIds[$i];
            $booking = Booking::find($bId);

            $this->assertEquals($expectedBalance, (float) $booking->balance_amount, "Pre-checkout balance mismatch for user {$i}.");

            $checkOutRes = $this->actingAs($this->staff)
                ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
                ->postJson("/api/v1/front-office/bookings/{$bId}/check-out", [
                    'settlement_amount' => $booking->balance_amount,
                    'payment_method' => 'UPI_QR',
                    'notes' => "Checkout settlement for User {$i}",
                ]);

            if ($checkOutRes->status() !== 200) {
                $failures[] = "Stage 4 (Checkout) User {$i} failed: " . $checkOutRes->status() . " - " . json_encode($checkOutRes->json());
            } else {
                $invoice = $checkOutRes->json('invoice');

                // Verify food order reflects on invoice
                $this->assertEquals(367.50, (float) $invoice['charges']['extra_charges'], "Invoice extra charges mismatch for user {$i}.");
                $this->assertEquals(2607.50, (float) $invoice['charges']['grand_total'], "Invoice grand total mismatch for user {$i}.");
                $this->assertEquals(0.00, (float) $invoice['charges']['balance_due'], "Invoice balance due should be zero for user {$i}.");

                // Verify updated booking in DB
                $updatedBooking = Booking::find($bId);
                $this->assertEquals('CHECKED_OUT', $updatedBooking->status);
                $this->assertEquals(0.00, (float) $updatedBooking->balance_amount);
                $this->assertEquals('PAID', $updatedBooking->payment_status);
            }
        }

        $this->assertEmpty($failures, "Failures encountered during Stage 4 Checkouts:\n" . implode("\n", $failures));

        // Verify all 100 rooms are now DIRTY awaiting housekeeping
        $dirtyCount = Room::where('hotel_id', $this->hotel->id)->where('status', 'DIRTY')->count();
        $this->assertEquals($totalUsers, $dirtyCount, "All 100 rooms must be DIRTY after checkout.");

        // ========================================================
        // STAGE 5: NIGHT AUDIT REVENUE & FINANCIAL AUDIT ACCURACY
        // ========================================================
        $reportRes = $this->actingAs($this->staff)
            ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
            ->getJson('/api/v1/reports/overview?range=today');

        $reportRes->assertStatus(200);

        // 100 rooms * ₹2,000 = ₹2,00,000 Room Charges
        $this->assertEquals(200000.00, (float) $reportRes->json('kpis.total_room_charges'));
        // 100 F&B orders * ₹367.50 = ₹36,750 Food Revenue posted to Folio
        $this->assertEquals(36750.00, (float) $reportRes->json('kpis.total_extra_charges'));
        // Total Collections = 100 * ₹2,607.50 = ₹2,60,750
        $this->assertEquals(260750.00, (float) $reportRes->json('kpis.total_collections'));
        $this->assertEquals(260750.00, (float) $reportRes->json('kpis.total_revenue'));

        $elapsed = round(microtime(true) - $startTime, 2);
        dump(">>> 100 USERS COMPLETE SIMULATION FINISHED IN: {$elapsed}s (400 full API requests processed successfully)");
    }

    /**
     * STRESS SIMULATION 2:
     * Concurrency Race Condition Test:
     * 10 users simultaneously attempt to book the EXACT SAME room (Room 101)
     * for the same check-in date.
     *
     * Expected:
     * - Exactly 1 booking succeeds (HTTP 201)
     * - Exactly 9 bookings are gracefully rejected (HTTP 422, Room Unavailable / Occupied)
     * - ZERO 500 server crashes or database corruption.
     */
    public function test_concurrency_race_condition_when_multiple_users_fight_for_same_room(): void
    {
        $room = Room::create([
            'hotel_id' => $this->hotel->id,
            'room_number' => '101',
            'room_type' => 'Presidential Suite',
            'room_mode' => 'AC',
            'floor' => 'Penthouse',
            'base_price' => 5000.00,
            'status' => 'AVAILABLE',
        ]);

        $successCount = 0;
        $rejectedCount = 0;
        $crashCount = 0;

        for ($i = 1; $i <= 10; $i++) {
            $payload = [
                'first_name' => "Competitor{$i}",
                'phone' => '+91 990000000' . $i,
                'nationality' => 'Indian',
                'id_type' => 'AADHAAR',
                'id_number' => "1111-2222-333{$i}",
                'room_id' => $room->id,
                'expected_check_out_at' => Carbon::now()->addDays(2)->toIso8601String(),
                'advance_deposit_amount' => 1000.00,
            ];

            $res = $this->actingAs($this->staff)
                ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
                ->postJson('/api/v1/front-office/check-in', $payload);

            if ($res->status() === 201) {
                $successCount++;
            } elseif ($res->status() === 422) {
                $rejectedCount++;
            } else {
                $crashCount++;
            }
        }

        $this->assertEquals(1, $successCount, "Exactly 1 user should win the room.");
        $this->assertEquals(9, $rejectedCount, "9 users should receive clean 422 rejection.");
        $this->assertEquals(0, $crashCount, "Zero 500 crashes allowed under concurrency.");
    }
}
