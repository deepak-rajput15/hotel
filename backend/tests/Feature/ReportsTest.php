<?php

namespace Tests\Feature;

use App\Domain\FrontOffice\Models\Booking;
use App\Domain\FrontOffice\Models\FolioItem;
use App\Domain\FrontOffice\Models\Guest;
use App\Domain\FrontOffice\Models\Payment;
use App\Domain\FrontOffice\Models\Room;
use App\Domain\Store\Models\Product;
use App\Domain\Tenancy\Models\Hotel;
use App\Domain\Tenancy\Models\Organization;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportsTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $org;
    protected Hotel $hotel;
    protected User $owner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->org = Organization::create([
            'org_code' => 'ORG-TEST-1',
            'name' => 'Royal Heritage Resorts',
            'billing_email' => 'finance@royalheritage.com',
            'status' => 'ACTIVE',
        ]);

        $this->hotel = Hotel::create([
            'organization_id' => $this->org->id,
            'hotel_code' => 'HTL-REP-1',
            'name' => 'Royal Heritage Palace',
            'slug' => 'royal-heritage-palace',
            'city' => 'Jaipur',
            'status' => 'ACTIVE',
        ]);

        $this->owner = User::create([
            'organization_id' => $this->org->id,
            'name' => 'Maharaja Hospitality',
            'email' => 'owner@royalheritage.com',
            'password' => bcrypt('Password@123'),
            'is_platform_admin' => false,
            'is_org_owner' => true,
            'status' => 'ACTIVE',
        ]);

        // Seed some test data: Room, Guest, Booking, FolioItem, Payment, Product
        $room = Room::create([
            'hotel_id' => $this->hotel->id,
            'room_number' => '101',
            'room_type' => 'Deluxe Suite',
            'floor' => '1st Floor',
            'base_price' => 5000.00,
            'status' => 'OCCUPIED',
        ]);

        $guest = Guest::create([
            'hotel_id' => $this->hotel->id,
            'first_name' => 'Vikramaditya',
            'last_name' => 'Singh',
            'phone' => '+91 9988776655',
            'nationality' => 'Indian',
            'id_type' => 'AADHAAR',
            'id_number' => '1234-5678-9012',
        ]);

        $booking = Booking::create([
            'hotel_id' => $this->hotel->id,
            'booking_number' => 'BKG-TEST-1001',
            'guest_id' => $guest->id,
            'room_id' => $room->id,
            'check_in_at' => Carbon::now()->subDays(1),
            'expected_check_out_at' => Carbon::now()->addDays(2),
            'room_rate_per_night' => 5000.00,
            'total_nights' => 3,
            'total_room_charges' => 15000.00,
            'total_extra_charges' => 1500.00,
            'tax_amount' => 1980.00,
            'grand_total' => 18480.00,
            'paid_amount' => 10000.00,
            'balance_amount' => 8480.00,
            'status' => 'CHECKED_IN',
            'payment_status' => 'PARTIAL',
        ]);

        FolioItem::create([
            'booking_id' => $booking->id,
            'item_type' => 'FOOD_BEVERAGE',
            'description' => 'Royal Thali Dinner',
            'quantity' => 2,
            'unit_price' => 750.00,
            'total_price' => 1500.00,
            'charged_at' => Carbon::now(),
        ]);

        Payment::create([
            'booking_id' => $booking->id,
            'receipt_number' => 'RCP-TEST-501',
            'amount' => 10000.00,
            'payment_method' => 'UPI_QR',
            'payment_type' => 'ADVANCE_DEPOSIT',
        ]);

        Product::create([
            'hotel_id' => $this->hotel->id,
            'category' => 'Grocery & Grains',
            'name' => 'Basmati Rice Premium',
            'product_code' => 'PRD-RIC-01',
            'unit' => 'Kg',
            'rate' => 120.00,
            'current_stock' => 15.00,
            'minimum_stock_qty' => 25.00,
            'status' => 'Active',
        ]);
    }

    public function test_can_get_reports_overview(): void
    {
        $response = $this->actingAs($this->owner)
            ->withHeader('X-Hotel-ID', $this->hotel->id)
            ->getJson('/api/v1/reports/overview?range=this_month');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'scope' => [
                    'hotel_name' => 'Royal Heritage Palace',
                ],
            ]);

        $data = $response->json();
        $this->assertArrayHasKey('kpis', $data);
        $this->assertEquals(18480.00, $data['kpis']['total_revenue']);
        $this->assertEquals(10000.00, $data['kpis']['total_collections']);
        $this->assertEquals(8480.00, $data['kpis']['outstanding_balances']);
        $this->assertEquals(1, $data['kpis']['occupied_rooms']);
        $this->assertEquals(100.0, $data['kpis']['occupancy_rate_pct']);
        $this->assertNotEmpty($data['payment_methods']);
        $this->assertNotEmpty($data['folio_breakdown']);
        $this->assertNotEmpty($data['room_types']);
    }

    public function test_can_get_guest_ledger_night_audit(): void
    {
        $response = $this->actingAs($this->owner)
            ->withHeader('X-Hotel-ID', $this->hotel->id)
            ->getJson('/api/v1/reports/guest-ledger?range=this_month');

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        $data = $response->json('data.data');
        $this->assertCount(1, $data);
        $this->assertEquals('BKG-TEST-1001', $data[0]['booking_number']);
        $this->assertEquals('Vikramaditya', $data[0]['guest']['first_name']);
        $this->assertEquals(8480.00, $data[0]['balance_amount']);
    }

    public function test_can_get_inventory_valuation_and_reorder_report(): void
    {
        $response = $this->actingAs($this->owner)
            ->withHeader('X-Hotel-ID', $this->hotel->id)
            ->getJson('/api/v1/reports/inventory');

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        $data = $response->json();
        $this->assertEquals(1800.00, $data['total_valuation']); // 15 kg * 120
        $this->assertEquals(1, $data['total_low_stock_items']);
        $this->assertEquals('PRD-RIC-01', $data['low_stock_items'][0]['product_code']);
    }

    public function test_can_export_reports_csv(): void
    {
        $response = $this->actingAs($this->owner)
            ->withHeader('X-Hotel-ID', $this->hotel->id)
            ->get('/api/v1/reports/export?range=this_month');

        $response->assertStatus(200);
        $this->assertTrue(str_contains($response->headers->get('content-type'), 'text/csv'));
        $content = $response->streamedContent();
        $this->assertStringContainsString('BKG-TEST-1001', $content);
        $this->assertStringContainsString('Royal Heritage Palace', $content);
    }
}
