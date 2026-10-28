<?php

namespace Tests\Feature;

use App\Domain\FrontOffice\Models\Booking;
use App\Domain\FrontOffice\Models\Guest;
use App\Domain\FrontOffice\Models\Room;
use App\Domain\Restaurant\Models\MenuCategory;
use App\Domain\Restaurant\Models\MenuItem;
use App\Domain\Restaurant\Models\RestaurantOrder;
use App\Domain\Restaurant\Models\RestaurantTable;
use App\Domain\Subscriptions\Models\Module;
use App\Domain\Tenancy\Models\Hotel;
use App\Domain\Tenancy\Models\Organization;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RestaurantPosTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $org;
    protected Hotel $hotel;
    protected User $owner;
    protected RestaurantTable $table;
    protected MenuItem $menuItem1;
    protected MenuItem $menuItem2;
    protected Room $room;
    protected Booking $booking;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Setup Organization & Hotel with restaurant subscription
        $this->org = Organization::create([
            'org_code' => 'ORG-REST-1',
            'name' => 'Royal Orchid Hotels',
            'billing_email' => 'finance@royalorchid.com',
            'status' => 'ACTIVE',
        ]);

        $this->hotel = Hotel::create([
            'organization_id' => $this->org->id,
            'hotel_code' => 'HTL-RST-1',
            'name' => 'Royal Orchid Resort',
            'slug' => 'royal-orchid-resort',
            'city' => 'Goa',
            'status' => 'ACTIVE',
        ]);

        $restModule = Module::create([
            'code' => 'restaurant',
            'name' => 'Restaurant & POS',
            'is_active' => true,
        ]);

        app(\App\Domain\Subscriptions\Actions\AssignHotelModulesAction::class)->execute($this->hotel, ['restaurant']);

        $this->owner = User::create([
            'organization_id' => $this->org->id,
            'name' => 'Resort Owner',
            'email' => 'owner@royalorchid.com',
            'password' => bcrypt('Password@123'),
            'is_platform_admin' => false,
            'is_org_owner' => true,
            'status' => 'ACTIVE',
        ]);

        // 2. Setup Dining Table
        $this->table = RestaurantTable::create([
            'hotel_id' => $this->hotel->id,
            'table_no' => 'T-01',
            'capacity' => 4,
            'seating_area' => 'AC Dining Hall',
            'status' => 'AVAILABLE',
        ]);

        // 3. Setup Menu Category & Items
        $category = MenuCategory::create([
            'hotel_id' => $this->hotel->id,
            'name' => 'Main Course',
            'slug' => 'main-course',
            'sort_order' => 1,
            'is_active' => true,
        ]);

        $this->menuItem1 = MenuItem::create([
            'hotel_id' => $this->hotel->id,
            'category_id' => $category->id,
            'category_name' => 'Main Course',
            'item_code' => 'MNU-MNC-01',
            'name' => 'Paneer Butter Masala',
            'price' => 300.00,
            'gst_percentage' => 5.00,
            'food_type' => 'VEG',
            'is_available' => true,
        ]);

        $this->menuItem2 = MenuItem::create([
            'hotel_id' => $this->hotel->id,
            'category_id' => $category->id,
            'category_name' => 'Main Course',
            'item_code' => 'MNU-MNC-02',
            'name' => 'Butter Chicken',
            'price' => 400.00,
            'gst_percentage' => 5.00,
            'food_type' => 'NON_VEG',
            'is_available' => true,
        ]);

        // 4. Setup In-House Room & Guest Booking for Folio Testing
        $this->room = Room::create([
            'hotel_id' => $this->hotel->id,
            'room_number' => '101',
            'room_type' => 'Deluxe Suite',
            'base_price' => 4000.00,
            'status' => 'OCCUPIED',
        ]);

        $guest = Guest::create([
            'hotel_id' => $this->hotel->id,
            'first_name' => 'Arjun',
            'last_name' => 'Kapoor',
            'phone' => '+91 9876543210',
            'nationality' => 'Indian',
            'id_type' => 'AADHAAR',
            'id_number' => '9876-5432-1098',
        ]);

        $this->booking = Booking::create([
            'hotel_id' => $this->hotel->id,
            'booking_number' => 'BKG-POS-1001',
            'guest_id' => $guest->id,
            'room_id' => $this->room->id,
            'check_in_at' => Carbon::now(),
            'expected_check_out_at' => Carbon::now()->addDays(2),
            'room_rate_per_night' => 4000.00,
            'total_nights' => 2,
            'total_room_charges' => 8000.00,
            'total_extra_charges' => 0.00,
            'tax_amount' => 960.00,
            'grand_total' => 8960.00,
            'paid_amount' => 5000.00,
            'balance_amount' => 3960.00,
            'status' => 'CHECKED_IN',
            'payment_status' => 'PARTIAL',
        ]);
    }

    public function test_can_list_tables_and_summary(): void
    {
        $response = $this->actingAs($this->owner)
            ->withHeader('X-Hotel-ID', $this->hotel->id)
            ->getJson('/api/v1/restaurant/tables');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'summary' => [
                    'total' => 1,
                    'available' => 1,
                    'occupied' => 0,
                ],
            ]);
    }

    public function test_can_get_menu_and_filter_by_food_type(): void
    {
        $response = $this->actingAs($this->owner)
            ->withHeader('X-Hotel-ID', $this->hotel->id)
            ->getJson('/api/v1/restaurant/menu?food_type=VEG');

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        $items = $response->json('items');
        $this->assertCount(1, $items);
        $this->assertEquals('Paneer Butter Masala', $items[0]['name']);
    }

    public function test_can_create_menu_item(): void
    {
        $response = $this->actingAs($this->owner)
            ->withHeader('X-Hotel-ID', $this->hotel->id)
            ->postJson('/api/v1/restaurant/menu/items', [
                'category_name' => 'Breads & Rice',
                'item_code' => 'MNU-BRD-01',
                'name' => 'Butter Garlic Naan',
                'price' => 80.00,
                'food_type' => 'VEG',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'item' => [
                    'item_code' => 'MNU-BRD-01',
                    'name' => 'Butter Garlic Naan',
                ],
            ]);

        $this->assertDatabaseHas('menu_items', [
            'hotel_id' => $this->hotel->id,
            'item_code' => 'MNU-BRD-01',
        ]);
    }

    public function test_can_create_dine_in_order_with_kot(): void
    {
        $response = $this->actingAs($this->owner)
            ->withHeader('X-Hotel-ID', $this->hotel->id)
            ->postJson('/api/v1/restaurant/orders', [
                'order_type' => 'DINE_IN',
                'table_id' => $this->table->id,
                'covers' => 2,
                'items' => [
                    [
                        'menu_item_id' => $this->menuItem1->id,
                        'quantity' => 2, // 2 * 300 = 600
                        'special_notes' => 'Less spicy',
                    ],
                ],
            ]);

        $response->assertStatus(201)
            ->assertJson(['success' => true]);

        $order = $response->json('order');
        $this->assertEquals(600.00, $order['subtotal']);
        $this->assertEquals(30.00, $order['tax_amount']); // 5% of 600
        $this->assertEquals(630.00, $order['grand_total']);
        $this->assertEquals('OPEN', $order['status']);

        // Check table status became OCCUPIED
        $this->assertEquals('OCCUPIED', $this->table->fresh()->status);
    }

    public function test_can_add_items_generating_incremental_kot(): void
    {
        // 1. Create initial order
        $createRes = $this->actingAs($this->owner)
            ->withHeader('X-Hotel-ID', $this->hotel->id)
            ->postJson('/api/v1/restaurant/orders', [
                'order_type' => 'DINE_IN',
                'table_id' => $this->table->id,
                'items' => [
                    ['menu_item_id' => $this->menuItem1->id, 'quantity' => 1], // 300 + 15 = 315
                ],
            ]);

        $orderId = $createRes->json('order.id');

        // 2. Add extra item (incremental KOT-002)
        $addRes = $this->actingAs($this->owner)
            ->withHeader('X-Hotel-ID', $this->hotel->id)
            ->postJson("/api/v1/restaurant/orders/{$orderId}/items", [
                'items' => [
                    ['menu_item_id' => $this->menuItem2->id, 'quantity' => 1], // 400 + 20 = 420
                ],
            ]);

        $addRes->assertStatus(200)
            ->assertJson(['success' => true]);

        $updatedOrder = $addRes->json('order');
        $this->assertEquals(700.00, $updatedOrder['subtotal']); // 300 + 400
        $this->assertEquals(35.00, $updatedOrder['tax_amount']); // 5% of 700
        $this->assertEquals(735.00, $updatedOrder['grand_total']);

        // Assert 2 KOT items exist
        $this->assertCount(2, $updatedOrder['items']);
        $this->assertEquals('KOT-001', $updatedOrder['items'][0]['kot_number']);
        $this->assertEquals('KOT-002', $updatedOrder['items'][1]['kot_number']);
    }

    public function test_can_settle_order_via_upi_qr_and_release_table(): void
    {
        $createRes = $this->actingAs($this->owner)
            ->withHeader('X-Hotel-ID', $this->hotel->id)
            ->postJson('/api/v1/restaurant/orders', [
                'order_type' => 'DINE_IN',
                'table_id' => $this->table->id,
                'items' => [
                    ['menu_item_id' => $this->menuItem1->id, 'quantity' => 1],
                ],
            ]);

        $orderId = $createRes->json('order.id');

        // Settle via UPI
        $settleRes = $this->actingAs($this->owner)
            ->withHeader('X-Hotel-ID', $this->hotel->id)
            ->postJson("/api/v1/restaurant/orders/{$orderId}/settle", [
                'settlement_method' => 'UPI_QR',
                'transaction_reference' => 'UPI-REF-9988',
            ]);

        $settleRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'order' => [
                    'status' => 'SETTLED',
                    'settlement_method' => 'UPI_QR',
                ],
            ]);

        // Table should be released to AVAILABLE
        $this->assertEquals('AVAILABLE', $this->table->fresh()->status);
    }

    public function test_can_settle_order_by_charging_to_in_house_room_folio(): void
    {
        $createRes = $this->actingAs($this->owner)
            ->withHeader('X-Hotel-ID', $this->hotel->id)
            ->postJson('/api/v1/restaurant/orders', [
                'order_type' => 'DINE_IN',
                'table_id' => $this->table->id,
                'items' => [
                    ['menu_item_id' => $this->menuItem1->id, 'quantity' => 1], // 300 + 15 = 315
                ],
            ]);

        $orderId = $createRes->json('order.id');

        // Settle by charging to Room 101's Folio
        $settleRes = $this->actingAs($this->owner)
            ->withHeader('X-Hotel-ID', $this->hotel->id)
            ->postJson("/api/v1/restaurant/orders/{$orderId}/settle", [
                'settlement_method' => 'ROOM_FOLIO',
                'room_id' => $this->room->id,
                'booking_id' => $this->booking->id,
            ]);

        $settleRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'order' => [
                    'status' => 'SETTLED',
                    'settlement_method' => 'ROOM_FOLIO',
                ],
            ]);

        // Verify FolioItem was created in Front Office
        $this->assertDatabaseHas('folio_items', [
            'booking_id' => $this->booking->id,
            'item_type' => 'FOOD_BEVERAGE',
            'total_price' => 315.00,
        ]);

        // Verify booking extra charges updated
        $freshBooking = $this->booking->fresh();
        $this->assertEquals(315.00, $freshBooking->total_extra_charges);
        $this->assertEquals(8960.00 + 315.00, $freshBooking->grand_total);
        $this->assertEquals(3960.00 + 315.00, $freshBooking->balance_amount);

        // Table released
        $this->assertEquals('AVAILABLE', $this->table->fresh()->status);
    }
}
