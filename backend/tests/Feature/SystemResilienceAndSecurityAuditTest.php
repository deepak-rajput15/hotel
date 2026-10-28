<?php

namespace Tests\Feature;

use App\Domain\FrontOffice\Models\Booking;
use App\Domain\FrontOffice\Models\Room;
use App\Domain\Purchase\Models\Supplier;
use App\Domain\Restaurant\Models\MenuItem;
use App\Domain\Restaurant\Models\RestaurantOrder;
use App\Domain\Restaurant\Models\RestaurantTable;
use App\Domain\Store\Models\Product;
use App\Domain\Subscriptions\Actions\AssignHotelModulesAction;
use App\Domain\Subscriptions\Models\Module;
use App\Domain\Tenancy\Models\Hotel;
use App\Domain\Tenancy\Models\Organization;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SystemResilienceAndSecurityAuditTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $orgA;
    protected Organization $orgB;
    protected Hotel $hotelA;
    protected Hotel $hotelB;
    protected User $staffA;
    protected User $staffB;
    protected Room $roomA_clean;
    protected Room $roomA_dirty;
    protected Room $roomA_maint;
    protected Room $roomB;
    protected MenuItem $menuA;
    protected Product $productA;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Create Organization & Hotel A
        $this->orgA = Organization::create([
            'org_code' => 'ORG-CHAOS-A',
            'name' => 'Apex Hotels Group',
            'billing_email' => 'apex@chaos.com',
            'status' => 'ACTIVE',
        ]);
        $this->hotelA = Hotel::create([
            'organization_id' => $this->orgA->id,
            'hotel_code' => 'HTL-CHAOS-A',
            'name' => 'Apex Palace Hotel',
            'slug' => 'apex-palace-hotel',
            'city' => 'Mumbai',
            'status' => 'ACTIVE',
        ]);

        // 2. Create Organization & Hotel B (Victim Tenant for IDOR testing)
        $this->orgB = Organization::create([
            'org_code' => 'ORG-CHAOS-B',
            'name' => 'Beacon Hotels Group',
            'billing_email' => 'beacon@chaos.com',
            'status' => 'ACTIVE',
        ]);
        $this->hotelB = Hotel::create([
            'organization_id' => $this->orgB->id,
            'hotel_code' => 'HTL-CHAOS-B',
            'name' => 'Beacon Bay Suites',
            'slug' => 'beacon-bay-suites',
            'city' => 'Goa',
            'status' => 'ACTIVE',
        ]);

        // Enable modules
        $modules = ['front_office', 'rooms', 'restaurant', 'kitchen', 'store', 'purchase'];
        foreach ($modules as $code) {
            Module::firstOrCreate(['code' => $code], ['name' => ucfirst($code), 'is_active' => true]);
        }
        app(AssignHotelModulesAction::class)->execute($this->hotelA, $modules);
        app(AssignHotelModulesAction::class)->execute($this->hotelB, $modules);

        // Staff users
        $this->staffA = User::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Staff Alpha',
            'email' => 'staff.alpha@apex.com',
            'password' => bcrypt('Password@123'),
            'is_org_owner' => true,
            'status' => 'ACTIVE',
        ]);

        $this->staffB = User::create([
            'organization_id' => $this->orgB->id,
            'name' => 'Staff Beta',
            'email' => 'staff.beta@beacon.com',
            'password' => bcrypt('Password@123'),
            'is_org_owner' => true,
            'status' => 'ACTIVE',
        ]);

        // Rooms for Hotel A
        $this->roomA_clean = Room::create([
            'hotel_id' => $this->hotelA->id,
            'room_number' => '101',
            'room_type' => 'Deluxe',
            'room_mode' => 'AC',
            'floor' => '1st',
            'base_price' => 2500.00,
            'status' => 'AVAILABLE',
        ]);

        $this->roomA_dirty = Room::create([
            'hotel_id' => $this->hotelA->id,
            'room_number' => '102',
            'room_type' => 'Deluxe',
            'room_mode' => 'AC',
            'floor' => '1st',
            'base_price' => 2500.00,
            'status' => 'DIRTY',
        ]);

        $this->roomA_maint = Room::create([
            'hotel_id' => $this->hotelA->id,
            'room_number' => '103',
            'room_type' => 'Suite',
            'room_mode' => 'AC',
            'floor' => '1st',
            'base_price' => 4500.00,
            'status' => 'MAINTENANCE',
        ]);

        // Room for Hotel B
        $this->roomB = Room::create([
            'hotel_id' => $this->hotelB->id,
            'room_number' => '901',
            'room_type' => 'Ocean Suite',
            'room_mode' => 'AC',
            'floor' => '9th',
            'base_price' => 8000.00,
            'status' => 'AVAILABLE',
        ]);

        // Menu item for Hotel A
        $this->menuA = MenuItem::create([
            'hotel_id' => $this->hotelA->id,
            'category_name' => 'Mains',
            'item_code' => 'DSH-001',
            'name' => 'Chicken Biryani',
            'price' => 350.00,
            'food_type' => 'NON_VEG',
            'is_available' => true,
        ]);

        // Product for Hotel A
        $supplierA = Supplier::create([
            'hotel_id' => $this->hotelA->id,
            'firm_name' => 'Provision Co',
            'mobile' => '+91 9988776655',
            'status' => 'Active',
        ]);

        $this->productA = Product::create([
            'hotel_id' => $this->hotelA->id,
            'supplier_id' => $supplierA->id,
            'category' => 'Grocery & Grains',
            'name' => 'Cooking Oil',
            'product_code' => 'OIL-001',
            'unit' => 'Litre',
            'rate' => 150.00,
            'opening_stock' => 10.00,
            'current_stock' => 10.00,
            'minimum_stock_qty' => 5.00,
            'status' => 'Active',
        ]);
    }

    /**
     * TEST 1: Check-in to DIRTY or MAINTENANCE rooms must be blocked!
     * A walk-in guest must not be given an uncleaned or broken room.
     */
    public function test_cannot_check_in_to_dirty_or_maintenance_room(): void
    {
        // Try check-in to DIRTY room
        $dirtyRes = $this->actingAs($this->staffA)
            ->withHeaders(['X-Hotel-ID' => $this->hotelA->id])
            ->postJson('/api/v1/front-office/check-in', [
                'first_name' => 'Tester',
                'phone' => '+91 9900000001',
                'nationality' => 'Indian',
                'id_type' => 'AADHAAR',
                'id_number' => '1234-5678-9012',
                'room_id' => $this->roomA_dirty->id,
                'expected_check_out_at' => Carbon::now()->addDay()->toIso8601String(),
            ]);

        $dirtyRes->assertStatus(422);

        // Try check-in to MAINTENANCE room
        $maintRes = $this->actingAs($this->staffA)
            ->withHeaders(['X-Hotel-ID' => $this->hotelA->id])
            ->postJson('/api/v1/front-office/check-in', [
                'first_name' => 'Tester',
                'phone' => '+91 9900000002',
                'nationality' => 'Indian',
                'id_type' => 'AADHAAR',
                'id_number' => '1234-5678-9013',
                'room_id' => $this->roomA_maint->id,
                'expected_check_out_at' => Carbon::now()->addDay()->toIso8601String(),
            ]);

        $maintRes->assertStatus(422);
    }

    /**
     * TEST 2: Check-out date in the past must be rejected.
     */
    public function test_cannot_check_in_with_checkout_date_in_past(): void
    {
        $pastRes = $this->actingAs($this->staffA)
            ->withHeaders(['X-Hotel-ID' => $this->hotelA->id])
            ->postJson('/api/v1/front-office/check-in', [
                'first_name' => 'Tester',
                'phone' => '+91 9900000003',
                'nationality' => 'Indian',
                'id_type' => 'AADHAAR',
                'id_number' => '1234-5678-9014',
                'room_id' => $this->roomA_clean->id,
                'expected_check_out_at' => Carbon::yesterday()->toIso8601String(),
            ]);

        $pastRes->assertStatus(422);
    }

    /**
     * TEST 3: Cannot settle restaurant order to a CHECKED_OUT booking (Ghost Folio posting).
     */
    public function test_cannot_settle_restaurant_order_to_checked_out_booking(): void
    {
        // 1. Check in guest
        $checkInRes = $this->actingAs($this->staffA)
            ->withHeaders(['X-Hotel-ID' => $this->hotelA->id])
            ->postJson('/api/v1/front-office/check-in', [
                'first_name' => 'Rohan',
                'phone' => '+91 9900000004',
                'nationality' => 'Indian',
                'id_type' => 'AADHAAR',
                'id_number' => '1234-5678-9015',
                'room_id' => $this->roomA_clean->id,
                'expected_check_out_at' => Carbon::now()->addDay()->toIso8601String(),
            ]);

        $bId = $checkInRes->json('booking.id');

        // 2. Guest checks out
        $this->actingAs($this->staffA)
            ->withHeaders(['X-Hotel-ID' => $this->hotelA->id])
            ->postJson("/api/v1/front-office/bookings/{$bId}/check-out", [
                'settlement_amount' => 2800.00,
            ]);

        $booking = Booking::find($bId);
        $this->assertEquals('CHECKED_OUT', $booking->status);

        // 3. Create open restaurant order
        $orderRes = $this->actingAs($this->staffA)
            ->withHeaders(['X-Hotel-ID' => $this->hotelA->id])
            ->postJson('/api/v1/restaurant/orders', [
                'order_type' => 'TAKEAWAY',
                'customer_name' => 'Walk-in',
                'items' => [
                    ['menu_item_id' => $this->menuA->id, 'quantity' => 1],
                ],
            ]);

        $orderId = $orderRes->json('order.id');

        // 4. Try settling to the checked-out booking
        $settleRes = $this->actingAs($this->staffA)
            ->withHeaders(['X-Hotel-ID' => $this->hotelA->id])
            ->postJson("/api/v1/restaurant/orders/{$orderId}/settle", [
                'settlement_method' => 'ROOM_FOLIO',
                'room_id' => $this->roomA_clean->id,
                'booking_id' => $bId,
            ]);

        $settleRes->assertStatus(422);
    }

    /**
     * TEST 4: Cross-Tenant IDOR Attack:
     * Staff of Hotel A tries to check-in to Hotel B's Room -> Must be rejected (404/403).
     */
    public function test_cross_tenant_idor_room_access_strictly_blocked(): void
    {
        $idorRes = $this->actingAs($this->staffA)
            ->withHeaders(['X-Hotel-ID' => $this->hotelA->id])
            ->postJson('/api/v1/front-office/check-in', [
                'first_name' => 'Hacker',
                'phone' => '+91 9900000005',
                'nationality' => 'Indian',
                'id_type' => 'AADHAAR',
                'id_number' => '1234-5678-9016',
                'room_id' => $this->roomB->id, // Belongs to Hotel B!
                'expected_check_out_at' => Carbon::now()->addDay()->toIso8601String(),
            ]);

        // Must fail with 404 ModelNotFound or 422
        $this->assertTrue(in_array($idorRes->status(), [404, 422], true));
    }

    /**
     * TEST 5: Cannot add items to a SETTLED or CANCELLED restaurant order.
     */
    public function test_cannot_add_items_to_settled_order(): void
    {
        $orderRes = $this->actingAs($this->staffA)
            ->withHeaders(['X-Hotel-ID' => $this->hotelA->id])
            ->postJson('/api/v1/restaurant/orders', [
                'order_type' => 'TAKEAWAY',
                'customer_name' => 'Walk-in',
                'items' => [
                    ['menu_item_id' => $this->menuA->id, 'quantity' => 1],
                ],
            ]);

        $orderId = $orderRes->json('order.id');

        // Settle order via Cash
        $this->actingAs($this->staffA)
            ->withHeaders(['X-Hotel-ID' => $this->hotelA->id])
            ->postJson("/api/v1/restaurant/orders/{$orderId}/settle", [
                'settlement_method' => 'CASH',
            ]);

        // Try adding more items to the settled order
        $addRes = $this->actingAs($this->staffA)
            ->withHeaders(['X-Hotel-ID' => $this->hotelA->id])
            ->postJson("/api/v1/restaurant/orders/{$orderId}/items", [
                'items' => [
                    ['menu_item_id' => $this->menuA->id, 'quantity' => 2],
                ],
            ]);

        $addRes->assertStatus(422);
    }

    /**
     * TEST 6: Store stock underflow (cannot consume more than existing stock).
     */
    public function test_cannot_subtract_more_stock_than_available(): void
    {
        // Current stock is 10 Litres, try subtracting 50 Litres
        $stockRes = $this->actingAs($this->staffA)
            ->withHeaders(['X-Hotel-ID' => $this->hotelA->id])
            ->postJson("/api/v1/store/products/{$this->productA->id}/adjust-stock", [
                'type' => 'SUBTRACT',
                'quantity' => 50.00,
                'reason' => 'Spoilage',
            ]);

        $stockRes->assertStatus(422);
        $this->assertEquals(10.00, (float) $this->productA->fresh()->current_stock);
    }

    /**
     * TEST 7: Massive date range in reports query must not crash the server.
     */
    public function test_massive_date_range_query_handled_safely(): void
    {
        // 5-year range
        $res = $this->actingAs($this->staffA)
            ->withHeaders(['X-Hotel-ID' => $this->hotelA->id])
            ->getJson('/api/v1/reports/overview?range=custom&start_date=2021-01-01&end_date=2026-01-01');

        $this->assertTrue(in_array($res->status(), [200, 422], true));
    }
}

