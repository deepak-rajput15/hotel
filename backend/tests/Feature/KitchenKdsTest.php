<?php

namespace Tests\Feature;

use App\Domain\Restaurant\Models\MenuItem;
use App\Domain\Restaurant\Models\RestaurantOrder;
use App\Domain\Restaurant\Models\RestaurantOrderItem;
use App\Domain\Restaurant\Models\RestaurantTable;
use App\Domain\Subscriptions\Actions\AssignHotelModulesAction;
use App\Domain\Subscriptions\Models\Module;
use App\Domain\Tenancy\Models\Hotel;
use App\Domain\Tenancy\Models\Organization;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KitchenKdsTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $org;
    protected Hotel $hotel;
    protected User $owner;
    protected RestaurantTable $table;
    protected RestaurantOrder $order;
    protected RestaurantOrderItem $item1;
    protected RestaurantOrderItem $item2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->org = Organization::create([
            'org_code' => 'ORG-KTN-1',
            'name' => 'Gourmet Hotels Group',
            'billing_email' => 'finance@gourmethotels.com',
            'status' => 'ACTIVE',
        ]);

        $this->hotel = Hotel::create([
            'organization_id' => $this->org->id,
            'hotel_code' => 'HTL-KTN-1',
            'name' => 'Gourmet Palace & Suites',
            'slug' => 'gourmet-palace-suites',
            'city' => 'Bengaluru',
            'status' => 'ACTIVE',
        ]);

        Module::firstOrCreate(['code' => 'kitchen'], [
            'name' => 'Kitchen (KOT)',
            'is_active' => true,
        ]);

        app(AssignHotelModulesAction::class)->execute($this->hotel, ['kitchen']);

        $this->owner = User::create([
            'organization_id' => $this->org->id,
            'name' => 'Kitchen Executive',
            'email' => 'chef@gourmethotels.com',
            'password' => bcrypt('Password@123'),
            'is_platform_admin' => false,
            'is_org_owner' => true,
            'status' => 'ACTIVE',
        ]);

        $this->table = RestaurantTable::create([
            'hotel_id' => $this->hotel->id,
            'table_no' => 'T-05',
            'capacity' => 4,
            'seating_area' => 'AC Dining Hall',
            'status' => 'OCCUPIED',
        ]);

        $this->order = RestaurantOrder::create([
            'hotel_id' => $this->hotel->id,
            'order_number' => 'ORD-TEST-KTN-1',
            'order_type' => 'DINE_IN',
            'table_id' => $this->table->id,
            'covers' => 2,
            'status' => 'OPEN',
            'subtotal' => 500.00,
            'tax_amount' => 25.00,
            'grand_total' => 525.00,
        ]);

        $this->item1 = RestaurantOrderItem::create([
            'order_id' => $this->order->id,
            'kot_number' => 'KOT-001',
            'item_name' => 'Paneer Tikka Angara',
            'food_type' => 'VEG',
            'quantity' => 1,
            'unit_price' => 250.00,
            'total_price' => 250.00,
            'special_notes' => 'Less spicy, no onion',
            'status' => 'PENDING',
            'kot_printed_at' => Carbon::now()->subMinutes(10),
        ]);

        $this->item2 = RestaurantOrderItem::create([
            'order_id' => $this->order->id,
            'kot_number' => 'KOT-001',
            'item_name' => 'Dal Makhani Royal',
            'food_type' => 'VEG',
            'quantity' => 1,
            'unit_price' => 250.00,
            'total_price' => 250.00,
            'status' => 'PENDING',
            'kot_printed_at' => Carbon::now()->subMinutes(10),
        ]);
    }

    public function test_can_get_live_kots_and_summary_metrics(): void
    {
        $response = $this->actingAs($this->owner)
            ->withHeader('X-Hotel-ID', $this->hotel->id)
            ->getJson('/api/v1/kitchen/kots?status=ACTIVE');

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        $kots = $response->json('kots');
        $this->assertCount(1, $kots);
        $this->assertEquals('KOT-001', $kots[0]['kot_number']);
        $this->assertEquals('T-05', $kots[0]['table_no']);
        $this->assertEquals('PENDING', $kots[0]['overall_status']);
        $this->assertCount(2, $kots[0]['items']);

        // Summary test
        $summaryRes = $this->actingAs($this->owner)
            ->withHeader('X-Hotel-ID', $this->hotel->id)
            ->getJson('/api/v1/kitchen/summary');

        $summaryRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'metrics' => [
                    'pending_items' => 2,
                    'preparing_items' => 0,
                    'ready_items' => 0,
                ],
            ]);
    }

    public function test_can_update_individual_item_status(): void
    {
        $response = $this->actingAs($this->owner)
            ->withHeader('X-Hotel-ID', $this->hotel->id)
            ->putJson("/api/v1/kitchen/items/{$this->item1->id}/status", [
                'status' => 'PREPARING',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'item' => [
                    'id' => $this->item1->id,
                    'status' => 'PREPARING',
                ],
            ]);

        $this->assertEquals('PREPARING', $this->item1->fresh()->status);
    }

    public function test_can_batch_update_kot_status_to_ready(): void
    {
        $response = $this->actingAs($this->owner)
            ->withHeader('X-Hotel-ID', $this->hotel->id)
            ->putJson("/api/v1/kitchen/kots/{$this->order->id}/KOT-001/status", [
                'status' => 'READY',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'affected_count' => 2,
            ]);

        $this->assertEquals('READY', $this->item1->fresh()->status);
        $this->assertEquals('READY', $this->item2->fresh()->status);
    }

    public function test_hotel_without_kitchen_module_is_forbidden(): void
    {
        // Remove kitchen module
        app(AssignHotelModulesAction::class)->execute($this->hotel, []);

        $response = $this->actingAs($this->owner)
            ->withHeader('X-Hotel-ID', $this->hotel->id)
            ->getJson('/api/v1/kitchen/kots');

        $response->assertStatus(403);
    }
}

