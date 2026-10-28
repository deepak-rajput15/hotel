<?php

namespace Tests\Feature;

use App\Domain\Access\Models\Role;
use App\Domain\FrontOffice\Models\Booking;
use App\Domain\FrontOffice\Models\FolioItem;
use App\Domain\FrontOffice\Models\Guest;
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
use App\Domain\Tenancy\Models\UserHotelAccess;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdversarialChaosAndIntegrityAuditTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $org;
    protected Hotel $hotel;
    protected User $owner;
    protected User $frontDeskStaff;
    protected User $kitchenStaff;
    protected User $storekeeperStaff;
    protected Room $room101;
    protected Room $room202;
    protected MenuItem $menuItem;
    protected Product $product;
    protected Supplier $supplier;

    protected function setUp(): void
    {
        parent::setUp();

        $this->org = Organization::create([
            'org_code' => 'ORG-CHAOS-1',
            'name' => 'Chaos Hospitality Global',
            'billing_email' => 'admin@chaoshospitality.com',
            'status' => 'ACTIVE',
        ]);

        $this->hotel = Hotel::create([
            'organization_id' => $this->org->id,
            'hotel_code' => 'HTL-CHAOS-1',
            'name' => 'Chaos Grand Palace',
            'slug' => 'chaos-grand-palace',
            'city' => 'Udaipur',
            'status' => 'ACTIVE',
        ]);

        $modules = ['front_office', 'rooms', 'restaurant', 'kitchen', 'store', 'purchase'];
        foreach ($modules as $code) {
            Module::firstOrCreate(['code' => $code], ['name' => ucfirst($code), 'is_active' => true]);
        }
        app(AssignHotelModulesAction::class)->execute($this->hotel, $modules);

        $frontDeskRole = Role::firstOrCreate(['slug' => 'front-desk'], ['name' => 'Front Desk']);
        $chefRole = Role::firstOrCreate(['slug' => 'head-chef'], ['name' => 'Head Chef']);
        $storeRole = Role::firstOrCreate(['slug' => 'storekeeper'], ['name' => 'Storekeeper']);

        // Hotel Owner
        $this->owner = User::create([
            'organization_id' => $this->org->id,
            'name' => 'Hotel Owner',
            'email' => 'owner@chaoshospitality.com',
            'password' => bcrypt('Secret@123'),
            'is_org_owner' => true,
            'status' => 'ACTIVE',
        ]);

        // Front Desk Staff
        $this->frontDeskStaff = User::create([
            'organization_id' => $this->org->id,
            'name' => 'Simran Desk',
            'email' => 'simran@chaoshospitality.com',
            'password' => bcrypt('Secret@123'),
            'is_org_owner' => false,
            'status' => 'ACTIVE',
        ]);
        UserHotelAccess::create([
            'user_id' => $this->frontDeskStaff->id,
            'hotel_id' => $this->hotel->id,
            'role_id' => $frontDeskRole->id,
            'is_default' => true,
        ]);

        // Kitchen Staff
        $this->kitchenStaff = User::create([
            'organization_id' => $this->org->id,
            'name' => 'Vikram Chef',
            'email' => 'vikram@chaoshospitality.com',
            'password' => bcrypt('Secret@123'),
            'is_org_owner' => false,
            'status' => 'ACTIVE',
        ]);
        UserHotelAccess::create([
            'user_id' => $this->kitchenStaff->id,
            'hotel_id' => $this->hotel->id,
            'role_id' => $chefRole->id,
            'is_default' => true,
        ]);

        // Storekeeper Staff
        $this->storekeeperStaff = User::create([
            'organization_id' => $this->org->id,
            'name' => 'Ramesh Store',
            'email' => 'ramesh@chaoshospitality.com',
            'password' => bcrypt('Secret@123'),
            'is_org_owner' => false,
            'status' => 'ACTIVE',
        ]);
        UserHotelAccess::create([
            'user_id' => $this->storekeeperStaff->id,
            'hotel_id' => $this->hotel->id,
            'role_id' => $storeRole->id,
            'is_default' => true,
        ]);

        // Rooms
        $this->room101 = Room::create([
            'hotel_id' => $this->hotel->id,
            'room_number' => '101',
            'room_type' => 'Deluxe King',
            'floor' => '1st',
            'base_price' => 3000.00,
            'status' => 'AVAILABLE',
        ]);

        $this->room202 = Room::create([
            'hotel_id' => $this->hotel->id,
            'room_number' => '202',
            'room_type' => 'Presidential Suite',
            'floor' => '2nd',
            'base_price' => 8000.00,
            'status' => 'AVAILABLE',
        ]);

        // Menu item
        $this->menuItem = MenuItem::create([
            'hotel_id' => $this->hotel->id,
            'category_name' => 'Main Course',
            'item_code' => 'DSH-CH-01',
            'name' => 'Paneer Butter Masala',
            'price' => 450.00,
            'gst_percentage' => 5.00,
            'food_type' => 'VEG',
            'is_available' => true,
        ]);

        // Supplier & Product
        $this->supplier = Supplier::create([
            'hotel_id' => $this->hotel->id,
            'supplier_code' => 'SUP-CH-01',
            'firm_name' => 'Udaipur Dairy Supplies',
            'contact_person' => 'Mohan Lal',
            'mobile' => '+91 9888877777',
            'status' => 'Active',
        ]);

        $this->product = Product::create([
            'hotel_id' => $this->hotel->id,
            'supplier_id' => $this->supplier->id,
            'category' => 'Dairy Products',
            'name' => 'Full Cream Milk',
            'product_code' => 'DRY-MILK-01',
            'unit' => 'Litre',
            'rate' => 65.00,
            'opening_stock' => 50.00,
            'current_stock' => 50.00,
            'minimum_stock_qty' => 10.00,
            'status' => 'Active',
        ]);
    }

    /**
     * CHAOS VECTOR 1:
     * Room Service Order Spoofing on Vacant Room & Cross-Room Booking Injection.
     * System MUST reject Room Service orders for vacant rooms (422) and
     * cross-room booking ID spoofing (422)!
     */
    public function test_room_service_cannot_be_ordered_for_vacant_room_or_mismatched_booking(): void
    {
        // 1. Room 101 is vacant. Waiter tries to place Room Service order.
        $vacantRes = $this->actingAs($this->owner)
            ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
            ->postJson('/api/v1/restaurant/orders', [
                'order_type' => 'ROOM_SERVICE',
                'room_id' => $this->room101->id,
                'items' => [
                    ['menu_item_id' => $this->menuItem->id, 'quantity' => 1],
                ],
            ]);

        // MUST be rejected with 422: Room has no checked-in guest
        $vacantRes->assertStatus(422);

        // 2. Check in guest into Room 101
        $checkInRes101 = $this->actingAs($this->owner)
            ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
            ->postJson('/api/v1/front-office/check-in', [
                'first_name' => 'Guest101',
                'phone' => '+91 9999911111',
                'nationality' => 'Indian',
                'id_type' => 'AADHAAR',
                'id_number' => '1111-1111-1111',
                'room_id' => $this->room101->id,
                'expected_check_out_at' => Carbon::now()->addDay()->toIso8601String(),
            ]);
        $checkInRes101->assertStatus(201);
        $bookingId101 = $checkInRes101->json('booking.id');

        // Check in guest into Room 202
        $checkInRes202 = $this->actingAs($this->owner)
            ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
            ->postJson('/api/v1/front-office/check-in', [
                'first_name' => 'Guest202',
                'phone' => '+91 9999922222',
                'nationality' => 'Indian',
                'id_type' => 'AADHAAR',
                'id_number' => '2222-2222-2222',
                'room_id' => $this->room202->id,
                'expected_check_out_at' => Carbon::now()->addDay()->toIso8601String(),
            ]);
        $checkInRes202->assertStatus(201);
        $bookingId202 = $checkInRes202->json('booking.id');

        // 3. Rogue waiter orders Room Service for Room 101, but passes booking_id for Room 202
        $mismatchRes = $this->actingAs($this->owner)
            ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
            ->postJson('/api/v1/restaurant/orders', [
                'order_type' => 'ROOM_SERVICE',
                'room_id' => $this->room101->id,
                'booking_id' => $bookingId202, // Mismatch!
                'items' => [
                    ['menu_item_id' => $this->menuItem->id, 'quantity' => 1],
                ],
            ]);

        // MUST be rejected with 422: Booking does not belong to specified room
        $mismatchRes->assertStatus(422);
    }

    /**
     * CHAOS VECTOR 2:
     * Cross-Room Folio Settlement Spoofing.
     * When settling an order to ROOM_FOLIO, passing room_id of Room 101 with
     * booking_id of Room 202 MUST be rejected with 422!
     */
    public function test_cannot_settle_order_to_mismatched_room_folio(): void
    {
        // 1. Check in Room 101 and Room 202
        $b101 = $this->actingAs($this->owner)
            ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
            ->postJson('/api/v1/front-office/check-in', [
                'first_name' => 'Amit',
                'phone' => '+91 9999911111',
                'nationality' => 'Indian',
                'id_type' => 'AADHAAR',
                'id_number' => '1111-1111-1111',
                'room_id' => $this->room101->id,
                'expected_check_out_at' => Carbon::now()->addDay()->toIso8601String(),
            ])->json('booking.id');

        $b202 = $this->actingAs($this->owner)
            ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
            ->postJson('/api/v1/front-office/check-in', [
                'first_name' => 'Sunil',
                'phone' => '+91 9999922222',
                'nationality' => 'Indian',
                'id_type' => 'AADHAAR',
                'id_number' => '2222-2222-2222',
                'room_id' => $this->room202->id,
                'expected_check_out_at' => Carbon::now()->addDay()->toIso8601String(),
            ])->json('booking.id');

        // 2. Create Takeaway Order
        $orderRes = $this->actingAs($this->owner)
            ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
            ->postJson('/api/v1/restaurant/orders', [
                'order_type' => 'TAKEAWAY',
                'customer_name' => 'Walkin Guest',
                'items' => [
                    ['menu_item_id' => $this->menuItem->id, 'quantity' => 1],
                ],
            ]);
        $orderId = $orderRes->json('order.id');

        // 3. Settle to Room Folio: Specify room 101, but booking 202
        $settleRes = $this->actingAs($this->owner)
            ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
            ->postJson("/api/v1/restaurant/orders/{$orderId}/settle", [
                'settlement_method' => 'ROOM_FOLIO',
                'room_id' => $this->room101->id,
                'booking_id' => $b202, // Mismatch!
            ]);

        $settleRes->assertStatus(422);
    }

    /**
     * CHAOS VECTOR 3:
     * Premature Advance Reservation Check-In.
     * Confirming check-in 7 days before scheduled arrival date MUST be rejected with 422!
     */
    public function test_cannot_confirm_check_in_prematurely_before_scheduled_date(): void
    {
        // 1. Create advance reservation for 7 days ahead
        $res = $this->actingAs($this->owner)
            ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
            ->postJson('/api/v1/front-office/check-in', [
                'first_name' => 'Future Guest',
                'phone' => '+91 9888812345',
                'nationality' => 'Indian',
                'id_type' => 'AADHAAR',
                'id_number' => '8888-9999-0000',
                'room_id' => $this->room101->id,
                'check_in_at' => Carbon::now()->addDays(7)->toIso8601String(),
                'expected_check_out_at' => Carbon::now()->addDays(10)->toIso8601String(),
            ]);

        $res->assertStatus(201);
        $bookingId = $res->json('booking.id');

        // 2. Front Desk attempts to confirm check-in TODAY (7 days early)
        $confirmRes = $this->actingAs($this->owner)
            ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
            ->postJson("/api/v1/front-office/bookings/{$bookingId}/confirm-check-in");

        // MUST be rejected with 422
        $confirmRes->assertStatus(422);
    }

    /**
     * CHAOS VECTOR 4:
     * Unsettled Checkout Embezzlement.
     * Checking out a guest with ₹3,360 unpaid balance by passing settlement_amount: 0
     * MUST be rejected with 422 (Bill must be fully settled before checkout)!
     */
    public function test_cannot_checkout_guest_with_unsettled_balance(): void
    {
        // 1. Check in guest with no advance deposit
        $checkInRes = $this->actingAs($this->owner)
            ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
            ->postJson('/api/v1/front-office/check-in', [
                'first_name' => 'Debtor Guest',
                'phone' => '+91 9777712345',
                'nationality' => 'Indian',
                'id_type' => 'AADHAAR',
                'id_number' => '7777-8888-9999',
                'room_id' => $this->room101->id,
                'expected_check_out_at' => Carbon::now()->addDay()->toIso8601String(),
                'advance_deposit_amount' => 0,
            ]);

        $bookingId = $checkInRes->json('booking.id');
        $balance = (float) $checkInRes->json('booking.balance_amount');
        $this->assertGreaterThan(0, $balance);

        // 2. Rogue clerk attempts to check out with settlement_amount = 0
        $checkoutRes = $this->actingAs($this->owner)
            ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
            ->postJson("/api/v1/front-office/bookings/{$bookingId}/check-out", [
                'settlement_amount' => 0,
            ]);

        // MUST be rejected with 422: Bill has outstanding balance
        $checkoutRes->assertStatus(422);
    }

    /**
     * CHAOS VECTOR 5:
     * Store Inventory & Purchase Order Role Authorization Bypass.
     * Line Cook or Front Desk staff attempting to issue a PO or adjust stock
     * MUST be rejected with 403 Forbidden!
     */
    public function test_unauthorized_staff_cannot_create_purchase_order_or_adjust_stock(): void
    {
        // 1. Chef attempts to adjust inventory stock
        $chefStockRes = $this->actingAs($this->kitchenStaff)
            ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
            ->postJson("/api/v1/store/products/{$this->product->id}/adjust-stock", [
                'type' => 'SUBTRACT',
                'quantity' => 10,
                'reason' => 'Unauthorized Waste',
            ]);

        // MUST be 403 Forbidden!
        $chefStockRes->assertStatus(403);

        // 2. Front Desk staff attempts to issue a Purchase Order
        $deskPoRes = $this->actingAs($this->frontDeskStaff)
            ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
            ->postJson('/api/v1/purchase/orders', [
                'supplier_id' => $this->supplier->id,
                'items' => [
                    [
                        'product_id' => $this->product->id,
                        'quantity' => 100,
                        'unit_price' => 65.00,
                    ],
                ],
            ]);

        // MUST be 403 Forbidden!
        $deskPoRes->assertStatus(403);
    }
}
