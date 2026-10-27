<?php

namespace Tests\Feature;

use App\Domain\FrontOffice\Models\Room;
use App\Domain\Purchase\Models\Supplier;
use App\Domain\Restaurant\Models\RestaurantTable;
use App\Domain\Store\Models\Product;
use App\Domain\Tenancy\Models\Hotel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MasterDataTablesTest extends TestCase
{
    use RefreshDatabase;

    protected Hotel $hotel;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed roles & modules
        $this->seed(\Database\Seeders\DatabaseSeeder::class);

        $this->hotel = Hotel::where('hotel_code', 'HTL-1001')->firstOrFail();
    }

    public function test_rooms_table_has_all_specification_fields(): void
    {
        $room = Room::create([
            'hotel_id' => $this->hotel->id,
            'room_number' => '999',
            'room_type' => 'Deluxe',
            'room_mode' => 'AC',
            'floor' => '9th Floor',
            'base_price' => 3500.00,
            'extra_bedding_price' => 600.00,
            'gst_percentage' => 12.00,
            'status' => 'AVAILABLE',
            'max_guests' => 3,
            'amenities' => ['WiFi', 'TV', 'Mini-bar'],
            'remarks' => 'Penthouse floor with panoramic sea view',
        ]);

        $this->assertDatabaseHas('rooms', [
            'id' => $room->id,
            'room_number' => '999',
            'room_mode' => 'AC',
            'base_price' => '3500.00',
            'extra_bedding_price' => '600.00',
            'gst_percentage' => '12.00',
            'remarks' => 'Penthouse floor with panoramic sea view',
        ]);

        $this->assertEquals(3, $room->capacity);
        $this->assertEquals('3500.00', $room->price_per_day);
    }

    public function test_suppliers_table_can_store_and_retrieve_vendor_details(): void
    {
        $supplier = Supplier::create([
            'hotel_id' => $this->hotel->id,
            'firm_name' => 'Kisan Fresh Farm Supplies',
            'address' => 'Shop 10, Mandi Yard, Pune',
            'contact_person' => 'Suresh Patil',
            'mobile' => '+91 9988776655',
            'email' => 'suresh@kisanfresh.com',
            'gst_no' => '27ABCDE1234F1Z5',
            'pan_no' => 'ABCDE1234F',
            'aadhar_no' => '1234-5678-9012',
            'status' => 'Active',
        ]);

        $this->assertDatabaseHas('suppliers', [
            'id' => $supplier->id,
            'firm_name' => 'Kisan Fresh Farm Supplies',
            'gst_no' => '27ABCDE1234F1Z5',
            'pan_no' => 'ABCDE1234F',
            'aadhar_no' => '1234-5678-9012',
            'status' => 'Active',
        ]);

        $this->assertEquals($this->hotel->id, $supplier->hotel->id);
    }

    public function test_products_table_stores_categories_stock_and_low_stock_scope(): void
    {
        $supplier = Supplier::create([
            'hotel_id' => $this->hotel->id,
            'firm_name' => 'Metro Cash & Carry',
            'mobile' => '+91 9123456780',
        ]);

        $product = Product::create([
            'hotel_id' => $this->hotel->id,
            'supplier_id' => $supplier->id,
            'category' => 'Grocery & Grains',
            'name' => 'Organic Wheat Flour (Atta)',
            'product_code' => 'PRD-ATTA-01',
            'description' => '100% whole wheat chakki atta',
            'unit' => 'Kg',
            'expiry_period' => '06/2027',
            'rate' => 45.00,
            'gst_percentage' => 5.00,
            'opening_stock' => 100.00,
            'current_stock' => 8.00,
            'minimum_stock_qty' => 15.00,
            'status' => 'Active',
        ]);

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'product_code' => 'PRD-ATTA-01',
            'category' => 'Grocery & Grains',
            'unit' => 'Kg',
            'rate' => '45.00',
            'gst_percentage' => '5.00',
        ]);

        $this->assertEquals($supplier->id, $product->supplier->id);

        // Test low stock scope (current_stock <= minimum_stock_qty)
        $lowStockProducts = Product::lowStock()->get();
        $this->assertTrue($lowStockProducts->contains('id', $product->id));
    }

    public function test_restaurant_tables_can_be_created_with_qr_code(): void
    {
        $table = RestaurantTable::create([
            'hotel_id' => $this->hotel->id,
            'table_no' => 'RT-55',
            'qr_code' => 'https://order.hotelsaask.com/qr/RT-55-PAY',
            'capacity' => 6,
            'seating_area' => 'Rooftop Lounge',
            'status' => 'AVAILABLE',
            'notes' => 'Near poolside gazebo',
        ]);

        $this->assertDatabaseHas('restaurant_tables', [
            'id' => $table->id,
            'table_no' => 'RT-55',
            'capacity' => 6,
            'seating_area' => 'Rooftop Lounge',
            'status' => 'AVAILABLE',
        ]);

        $this->assertEquals($this->hotel->id, $table->hotel->id);
    }
}
