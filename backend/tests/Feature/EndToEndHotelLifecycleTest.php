<?php

namespace Tests\Feature;

use App\Domain\Access\Models\Role;
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
use App\Domain\Tenancy\Models\UserHotelAccess;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EndToEndHotelLifecycleTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $org;
    protected Hotel $hotel;
    protected User $owner;
    protected User $frontDeskStaff;
    protected User $chefStaff;
    protected User $storekeeper;
    protected Supplier $supplier;
    protected Product $riceProduct;
    protected Room $room102;
    protected RestaurantTable $tableT1;
    protected MenuItem $menuPaneer;
    protected MenuItem $menuNaan;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Create Organization & Hotel
        $this->org = Organization::create([
            'org_code' => 'ORG-E2E-1',
            'name' => 'Royal Heritage Hospitality Group',
            'billing_email' => 'finance@royalheritage.com',
            'tax_number' => '27AAACH1234F1Z1',
            'status' => 'ACTIVE',
        ]);

        $this->hotel = Hotel::create([
            'organization_id' => $this->org->id,
            'hotel_code' => 'HTL-E2E-1',
            'name' => 'Royal Heritage Grand Palace',
            'slug' => 'royal-heritage-grand-palace',
            'city' => 'Jaipur',
            'phone' => '+91 141 2345678',
            'status' => 'ACTIVE',
        ]);

        // 2. Ensure all 6 modules are seeded
        $moduleCodes = ['front_office', 'rooms', 'restaurant', 'kitchen', 'store', 'purchase'];
        foreach ($moduleCodes as $code) {
            Module::firstOrCreate(['code' => $code], [
                'name' => ucfirst(str_replace('_', ' ', $code)),
                'is_active' => true,
            ]);
        }

        // 3. Subscribe hotel to all 6 modules
        app(AssignHotelModulesAction::class)->execute($this->hotel, $moduleCodes);

        // 4. Create Owner & Staff Users
        $this->owner = User::create([
            'organization_id' => $this->org->id,
            'name' => 'Maharaja Vikramaditya',
            'email' => 'owner@royalheritage.com',
            'password' => bcrypt('Secret@123'),
            'is_platform_admin' => false,
            'is_org_owner' => true,
            'status' => 'ACTIVE',
        ]);

        $this->frontDeskStaff = User::create([
            'organization_id' => $this->org->id,
            'name' => 'Sunil Verma',
            'email' => 'sunil.frontdesk@royalheritage.com',
            'password' => bcrypt('Secret@123'),
            'is_platform_admin' => false,
            'is_org_owner' => false,
            'status' => 'ACTIVE',
        ]);

        $this->chefStaff = User::create([
            'organization_id' => $this->org->id,
            'name' => 'Chef Sanjeev',
            'email' => 'chef.sanjeev@royalheritage.com',
            'password' => bcrypt('Secret@123'),
            'is_platform_admin' => false,
            'is_org_owner' => false,
            'status' => 'ACTIVE',
        ]);

        $this->storekeeper = User::create([
            'organization_id' => $this->org->id,
            'name' => 'Ramesh Storekeeper',
            'email' => 'ramesh.store@royalheritage.com',
            'password' => bcrypt('Secret@123'),
            'is_platform_admin' => false,
            'is_org_owner' => false,
            'status' => 'ACTIVE',
        ]);

        $chefRole = Role::firstOrCreate(['slug' => 'head-chef'], ['name' => 'Head Chef', 'description' => 'Kitchen']);
        $frontDeskRole = Role::firstOrCreate(['slug' => 'front-desk'], ['name' => 'Front Desk', 'description' => 'Front Office']);
        $storeRole = Role::firstOrCreate(['slug' => 'storekeeper'], ['name' => 'Storekeeper', 'description' => 'Store']);

        UserHotelAccess::create(['user_id' => $this->chefStaff->id, 'hotel_id' => $this->hotel->id, 'role_id' => $chefRole->id, 'is_default' => true]);
        UserHotelAccess::create(['user_id' => $this->frontDeskStaff->id, 'hotel_id' => $this->hotel->id, 'role_id' => $frontDeskRole->id, 'is_default' => true]);
        UserHotelAccess::create(['user_id' => $this->storekeeper->id, 'hotel_id' => $this->hotel->id, 'role_id' => $storeRole->id, 'is_default' => true]);

        // 5. Seed Room, Supplier, Product, Table, and Menu Items
        $this->room102 = Room::create([
            'hotel_id' => $this->hotel->id,
            'room_number' => '102',
            'room_type' => 'Deluxe Heritage',
            'room_mode' => 'AC',
            'floor' => '1st Floor',
            'base_price' => 3000.00,
            'extra_bedding_price' => 500.00,
            'gst_percentage' => 12.00,
            'status' => 'AVAILABLE',
            'max_guests' => 2,
        ]);

        $this->supplier = Supplier::create([
            'hotel_id' => $this->hotel->id,
            'firm_name' => 'Jaipur Wholesale Agro Mart',
            'mobile' => '+91 9829012345',
            'gst_no' => '08AABCR1234D1Z2',
            'status' => 'Active',
        ]);

        $this->riceProduct = Product::create([
            'hotel_id' => $this->hotel->id,
            'supplier_id' => $this->supplier->id,
            'category' => 'Grocery & Grains',
            'name' => 'Royal Basmati Rice 1121',
            'product_code' => 'RICE-1121',
            'unit' => 'Kg',
            'rate' => 120.00,
            'gst_percentage' => 5.00,
            'opening_stock' => 100.00,
            'current_stock' => 100.00,
            'minimum_stock_qty' => 25.00,
            'status' => 'Active',
        ]);

        $this->tableT1 = RestaurantTable::create([
            'hotel_id' => $this->hotel->id,
            'table_no' => 'T-01',
            'capacity' => 4,
            'seating_area' => 'AC Dining Hall',
            'status' => 'VACANT',
        ]);

        $this->menuPaneer = MenuItem::create([
            'hotel_id' => $this->hotel->id,
            'category_name' => 'Main Course',
            'item_code' => 'DSH-PAN-01',
            'name' => 'Paneer Butter Masala',
            'price' => 320.00,
            'food_type' => 'VEG',
            'is_available' => true,
        ]);

        $this->menuNaan = MenuItem::create([
            'hotel_id' => $this->hotel->id,
            'category_name' => 'Breads',
            'item_code' => 'DSH-NAN-01',
            'name' => 'Butter Garlic Naan',
            'price' => 60.00,
            'food_type' => 'VEG',
            'is_available' => true,
        ]);
    }

    /**
     * Test complete 360-degree operational loop across all 6 modules:
     * Store (PO/GRN) -> Front Office Check-in -> Restaurant POS -> Kitchen KDS ->
     * Settle to Room Folio -> Check-out & Invoice -> Housekeeping clean -> Night Audit Reports.
     */
    public function test_complete_hotel_s_end_to_end_operational_lifecycle(): void
    {
        // ==========================================
        // STEP 1: Store & Purchase (PO & GRN Receipt)
        // ==========================================
        $poPayload = [
            'supplier_id' => $this->supplier->id,
            'expected_delivery_date' => Carbon::tomorrow()->toDateString(),
            'payment_terms' => 'Net 15 Days',
            'notes' => 'Urgent procurement for banquet weekend.',
            'items' => [
                [
                    'product_id' => $this->riceProduct->id,
                    'quantity' => 50,
                    'unit_price' => 120.00,
                ],
            ],
        ];

        $poRes = $this->actingAs($this->owner)
            ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
            ->postJson('/api/v1/purchase/orders', $poPayload);

        $poRes->assertStatus(201)
            ->assertJsonPath('success', true);

        $poId = $poRes->json('order.id');
        $poItemId = $poRes->json('order.items.0.id');

        // Goods arrive at hotel gate -> Storekeeper accepts delivery with GRN
        $grnPayload = [
            'delivery_challan_no' => 'CHALLAN-9988',
            'invoice_no' => 'INV-SUP-5544',
            'received_date' => Carbon::today()->toDateString(),
            'remarks' => 'All 50 bags inspected and verified intact.',
            'items' => [
                [
                    'purchase_order_item_id' => $poItemId,
                    'quantity_received' => 50,
                ],
            ],
        ];

        $grnRes = $this->actingAs($this->owner)
            ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
            ->postJson("/api/v1/purchase/orders/{$poId}/receive-goods", $grnPayload);

        $grnRes->assertStatus(201)
            ->assertJsonPath('success', true);

        // VERIFY: Store stock auto-incremented from 100 to 150!
        $this->riceProduct->refresh();
        $this->assertEquals(150.00, (float) $this->riceProduct->current_stock);

        // ==========================================
        // STEP 2: Front Office Guest Walk-in Check-in
        // ==========================================
        $checkInPayload = [
            'first_name' => 'Amitabh',
            'last_name' => 'Bachchan',
            'phone' => '+91 9922334455',
            'email' => 'amitabh@bollywood.com',
            'nationality' => 'Indian',
            'id_type' => 'PASSPORT',
            'id_number' => 'Z1234567',
            'address' => 'Jalsa, Juhu, Mumbai',
            'city' => 'Mumbai',
            'state' => 'Maharashtra',
            'room_id' => $this->room102->id,
            'expected_check_out_at' => Carbon::now()->addDays(2)->toIso8601String(),
            'num_adults' => 2,
            'advance_deposit_amount' => 2000.00,
            'payment_method' => 'UPI_QR',
        ];

        $checkInRes = $this->actingAs($this->owner)
            ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
            ->postJson('/api/v1/front-office/check-in', $checkInPayload);

        $checkInRes->assertStatus(201)
            ->assertJsonPath('success', true);

        $bookingId = $checkInRes->json('booking.id');

        // VERIFY: Room 102 status changed to OCCUPIED
        $this->room102->refresh();
        $this->assertEquals('OCCUPIED', $this->room102->status);

        // ==========================================
        // STEP 3: Restaurant POS Order & KOT Generation
        // ==========================================
        $orderPayload = [
            'order_type' => 'DINE_IN',
            'table_id' => $this->tableT1->id,
            'covers' => 2,
            'items' => [
                [
                    'menu_item_id' => $this->menuPaneer->id,
                    'quantity' => 1,
                    'special_notes' => 'Less spicy please',
                ],
                [
                    'menu_item_id' => $this->menuNaan->id,
                    'quantity' => 2,
                    'special_notes' => 'Crispy butter',
                ],
            ],
        ];

        $orderRes = $this->actingAs($this->owner)
            ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
            ->postJson('/api/v1/restaurant/orders', $orderPayload);

        $orderRes->assertStatus(201)
            ->assertJsonPath('success', true);

        $orderId = $orderRes->json('order.id');
        $kotNumber = $orderRes->json('order.items.0.kot_number');

        // VERIFY: Table T-01 is now OCCUPIED
        $this->tableT1->refresh();
        $this->assertEquals('OCCUPIED', $this->tableT1->status);

        // ==========================================
        // STEP 4: Kitchen Display System (KDS)
        // ==========================================
        $kdsRes = $this->actingAs($this->chefStaff)
            ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
            ->getJson('/api/v1/kitchen/kots');

        $kdsRes->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertNotEmpty($kdsRes->json('kots'));

        // Chef completes preparation of KOT
        $chefReadyRes = $this->actingAs($this->chefStaff)
            ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
            ->putJson("/api/v1/kitchen/kots/{$orderId}/{$kotNumber}/status", [
                'status' => 'READY',
            ]);

        $chefReadyRes->assertStatus(200)
            ->assertJsonPath('success', true);

        // ==========================================
        // STEP 5: Settle Restaurant Bill to Guest Room Folio
        // ==========================================
        $settleRes = $this->actingAs($this->owner)
            ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
            ->postJson("/api/v1/restaurant/orders/{$orderId}/settle", [
                'settlement_method' => 'ROOM_FOLIO',
                'room_id' => $this->room102->id,
                'booking_id' => $bookingId,
            ]);

        $settleRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('order.settlement_method', 'ROOM_FOLIO');

        // VERIFY: Table T-01 is released back to AVAILABLE
        $this->tableT1->refresh();
        $this->assertEquals('AVAILABLE', $this->tableT1->status);

        // VERIFY: Front Office booking has the food charge posted to folio!
        $booking = Booking::with(['folioItems', 'payments'])->find($bookingId);
        $this->assertGreaterThan(0, (float) $booking->total_extra_charges);
        $foodFolio = $booking->folioItems->where('item_type', 'FOOD_BEVERAGE')->first();
        $this->assertNotNull($foodFolio);

        // ==========================================
        // STEP 6: Front Desk Check-Out & Final Settlement
        // ==========================================
        $checkOutRes = $this->actingAs($this->owner)
            ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
            ->postJson("/api/v1/front-office/bookings/{$bookingId}/check-out", [
                'settlement_amount' => $booking->balance_amount,
                'payment_method' => 'UPI_QR',
                'notes' => 'Guest appreciated swift service.',
            ]);

        $checkOutRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('booking.status', 'CHECKED_OUT');

        // VERIFY: Room 102 marked DIRTY for housekeeping
        $this->room102->refresh();
        $this->assertEquals('DIRTY', $this->room102->status);

        // ==========================================
        // STEP 7: Housekeeping Cleans Room -> Mark AVAILABLE
        // ==========================================
        $statusRes = $this->actingAs($this->owner)
            ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
            ->putJson("/api/v1/front-office/rooms/{$this->room102->id}/status", [
                'status' => 'AVAILABLE',
            ]);

        $statusRes->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->room102->refresh();
        $this->assertEquals('AVAILABLE', $this->room102->status);

        // ==========================================
        // STEP 8: Reports & Night Audit
        // ==========================================
        $reportRes = $this->actingAs($this->owner)
            ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
            ->getJson('/api/v1/reports/overview?range=today');

        $reportRes->assertStatus(200)
            ->assertJsonPath('success', true);

        // Night audit guest ledger
        $ledgerRes = $this->actingAs($this->owner)
            ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
            ->getJson('/api/v1/reports/guest-ledger?status=ALL');

        $ledgerRes->assertStatus(200)
            ->assertJsonPath('success', true);

        $ledgerGuests = collect($ledgerRes->json('data.data'));
        $found = $ledgerGuests->firstWhere('id', $bookingId);
        $this->assertNotNull($found);
        $this->assertEquals('CHECKED_OUT', $found['status']);
        $this->assertEquals('Amitabh', $found['guest']['first_name']);
    }

    /**
     * Test Multi-Tenancy & Module Subscription Security Isolation:
     * An unsubscribed module returns 403 Forbidden.
     * Another hotel cannot access or view this hotel's data.
     */
    public function test_multi_tenancy_and_unsubscribed_module_security_guard(): void
    {
        // Create second hotel without restaurant and purchase module
        $hotelB = Hotel::create([
            'organization_id' => $this->org->id,
            'hotel_code' => 'HTL-E2E-2',
            'name' => 'Royal Budget Inn',
            'slug' => 'royal-budget-inn',
            'city' => 'Udaipur',
            'status' => 'ACTIVE',
        ]);

        // Only assign front_office and rooms to Hotel B
        app(AssignHotelModulesAction::class)->execute($hotelB, ['front_office', 'rooms']);

        // Hotel B tries to access restaurant orders -> strictly FORBIDDEN 403
        $forbiddenRes = $this->actingAs($this->owner)
            ->withHeaders(['X-Hotel-ID' => $hotelB->id])
            ->getJson('/api/v1/restaurant/orders');

        $forbiddenRes->assertStatus(403)
            ->assertJsonPath('error_code', 'MODULE_NOT_SUBSCRIBED');

        // Hotel B tries to access purchase orders -> strictly FORBIDDEN 403
        $forbiddenPurRes = $this->actingAs($this->owner)
            ->withHeaders(['X-Hotel-ID' => $hotelB->id])
            ->getJson('/api/v1/purchase/orders');

        $forbiddenPurRes->assertStatus(403)
            ->assertJsonPath('error_code', 'MODULE_NOT_SUBSCRIBED');
    }
}
