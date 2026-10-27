<?php

namespace Tests\Feature;

use App\Domain\Access\Models\Role;
use App\Domain\FrontOffice\Models\Room;
use App\Domain\Store\Models\Product;
use App\Domain\Tenancy\Models\Hotel;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OwnerSubadminAndInventoryTest extends TestCase
{
    use RefreshDatabase;

    protected Hotel $hotelA;
    protected Hotel $hotelB;
    protected Hotel $hotelC;
    protected User $owner;
    protected User $subAdminHotelA;
    protected User $storekeeper;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\DatabaseSeeder::class);

        $this->hotelA = Hotel::where('hotel_code', 'HTL-1001')->firstOrFail();
        $this->hotelB = Hotel::where('hotel_code', 'HTL-1002')->firstOrFail();
        $this->hotelC = Hotel::where('hotel_code', 'HTL-1003')->firstOrFail();

        $this->owner = User::where('email', 'owner@apexhospitality.com')->firstOrFail();
        $this->subAdminHotelA = User::where('email', 'subadmin.vikram@apexhospitality.com')->firstOrFail();
        $this->storekeeper = User::where('email', 'store.amit@apexhospitality.com')->firstOrFail();
    }

    public function test_owner_can_create_room_with_book1_specification_fields(): void
    {
        $response = $this->actingAs($this->owner)
            ->withHeaders(['X-Hotel-Context' => $this->hotelA->id])
            ->postJson('/api/v1/front-office/rooms', [
                'room_number' => '405',
                'room_type' => 'Executive Suite',
                'room_mode' => 'AC',
                'floor' => '4th Floor',
                'base_price' => 4500,
                'extra_bedding_price' => 750,
                'gst_percentage' => 12,
                'max_guests' => 3,
                'amenities' => ['WiFi', 'Smart TV', 'Balcony Sea View'],
                'remarks' => 'Corner suite with sunset view',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
            ]);

        $this->assertDatabaseHas('rooms', [
            'hotel_id' => $this->hotelA->id,
            'room_number' => '405',
            'room_type' => 'Executive Suite',
            'room_mode' => 'AC',
            'floor' => '4th Floor',
            'base_price' => '4500.00',
            'extra_bedding_price' => '750.00',
            'gst_percentage' => '12.00',
            'remarks' => 'Corner suite with sunset view',
        ]);
    }

    public function test_subadmin_of_hotel_a_can_create_room_in_their_assigned_hotel(): void
    {
        $response = $this->actingAs($this->subAdminHotelA)
            ->withHeaders(['X-Hotel-Context' => $this->hotelA->id])
            ->postJson('/api/v1/front-office/rooms', [
                'room_number' => '501',
                'room_type' => 'Presidential Suite',
                'room_mode' => 'AC',
                'floor' => '5th Floor',
                'base_price' => 8500,
                'extra_bedding_price' => 1200,
                'gst_percentage' => 18,
                'max_guests' => 4,
                'amenities' => ['Jacuzzi', 'Butler Service', 'High Speed WiFi'],
                'remarks' => 'VIP presidential suite',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
            ]);

        $this->assertDatabaseHas('rooms', [
            'hotel_id' => $this->hotelA->id,
            'room_number' => '501',
        ]);
    }

    public function test_front_desk_staff_is_strictly_forbidden_from_creating_or_modifying_rooms(): void
    {
        $frontDesk = User::where('email', 'frontdesk.priya@apexhospitality.com')->firstOrFail();

        // Front desk user Priya attempts to create a room in Hotel A
        $response = $this->actingAs($frontDesk)
            ->withHeaders(['X-Hotel-Context' => $this->hotelA->id])
            ->postJson('/api/v1/front-office/rooms', [
                'room_number' => '777',
                'room_type' => 'Standard Single',
                'base_price' => 1500,
            ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'error_code' => 'ROOM_MANAGEMENT_FORBIDDEN',
            ]);

        $this->assertDatabaseMissing('rooms', [
            'hotel_id' => $this->hotelA->id,
            'room_number' => '777',
        ]);
    }

    public function test_subadmin_of_hotel_a_is_strictly_forbidden_from_accessing_hotel_b(): void
    {
        // Vikram is Sub-Admin of Hotel A (HTL-1001).
        // If he tries to access Hotel B (HTL-1002), ResolveTenantContext must block with 403 Forbidden.
        $response = $this->actingAs($this->subAdminHotelA)
            ->withHeaders(['X-Hotel-Context' => $this->hotelB->id])
            ->getJson('/api/v1/front-office/rooms');

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'error_code' => 'UNAUTHORIZED_HOTEL_ACCESS',
            ]);
    }

    public function test_subadmin_of_hotel_a_is_strictly_forbidden_from_creating_room_in_hotel_b(): void
    {
        $response = $this->actingAs($this->subAdminHotelA)
            ->withHeaders(['X-Hotel-Context' => $this->hotelB->id])
            ->postJson('/api/v1/front-office/rooms', [
                'room_number' => '999',
                'room_type' => 'Deluxe',
                'base_price' => 3000,
            ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'error_code' => 'UNAUTHORIZED_HOTEL_ACCESS',
            ]);
    }

    public function test_owner_can_create_subadmin_for_hotel_b(): void
    {
        $gmRole = Role::where('slug', 'general-manager')->firstOrFail();

        $response = $this->actingAs($this->owner)
            ->postJson("/api/v1/hotels/{$this->hotelB->id}/staff", [
                'name' => 'SubAdmin Rajesh Sharma',
                'email' => 'subadmin.rajesh@apexhospitality.com',
                'password' => 'RajeshPass@2026',
                'role_id' => $gmRole->id,
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
            ]);

        $newSubAdmin = User::where('email', 'subadmin.rajesh@apexhospitality.com')->first();
        $this->assertNotNull($newSubAdmin);
        $this->assertTrue($newSubAdmin->hasAccessToHotel($this->hotelB->id));
        $this->assertFalse($newSubAdmin->hasAccessToHotel($this->hotelA->id));
    }

    public function test_storekeeper_can_list_and_create_products(): void
    {
        // 1. List products for Hotel C (subscribed to store & purchase)
        $listResponse = $this->actingAs($this->storekeeper)
            ->withHeaders(['X-Hotel-Context' => $this->hotelC->id])
            ->getJson('/api/v1/store/products');

        $listResponse->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'products',
                'categories',
                'metrics' => [
                    'total_products',
                    'low_stock_count',
                    'total_stock_value',
                    'active_suppliers',
                ],
            ]);

        // 2. Create product
        $createResponse = $this->actingAs($this->storekeeper)
            ->withHeaders(['X-Hotel-Context' => $this->hotelC->id])
            ->postJson('/api/v1/store/products', [
                'name' => 'Premium Olive Oil Extra Virgin 5L',
                'category' => 'Grocery & Grains',
                'product_code' => 'PRD-OIL-5L',
                'description' => 'Cold pressed extra virgin olive oil',
                'unit' => 'Litre',
                'expiry_period' => '12/2027',
                'rate' => 2400.00,
                'gst_percentage' => 12.00,
                'opening_stock' => 20,
                'current_stock' => 20,
                'minimum_stock_qty' => 5,
            ]);

        $createResponse->assertStatus(201)
            ->assertJson([
                'success' => true,
            ]);

        $this->assertDatabaseHas('products', [
            'hotel_id' => $this->hotelC->id,
            'product_code' => 'PRD-OIL-5L',
            'category' => 'Grocery & Grains',
            'current_stock' => '20.00',
        ]);
    }

    public function test_storekeeper_can_adjust_product_stock(): void
    {
        $product = Product::create([
            'hotel_id' => $this->hotelC->id,
            'category' => 'Beverages',
            'name' => 'Farm Fresh Milk 1L Pack',
            'product_code' => 'PRD-MILK-1L',
            'unit' => 'Ltr',
            'rate' => 60.00,
            'gst_percentage' => 5.00,
            'opening_stock' => 50,
            'current_stock' => 50,
            'minimum_stock_qty' => 10,
            'status' => 'Active',
        ]);

        // Deduct 15 packets for breakfast service
        $adjustResponse = $this->actingAs($this->storekeeper)
            ->withHeaders(['X-Hotel-Context' => $this->hotelC->id])
            ->postJson("/api/v1/store/products/{$product->id}/adjust-stock", [
                'operation' => 'SUBTRACT',
                'quantity' => 15,
                'reason' => 'Daily breakfast buffet consumption',
            ]);

        $adjustResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'product' => [
                    'current_stock' => 35,
                ],
            ]);

        $this->assertEquals(35.00, (float) $product->fresh()->current_stock);
    }
}
