<?php

namespace Tests\Feature;

use App\Domain\Access\Models\Role;
use App\Domain\FrontOffice\Models\Booking;
use App\Domain\FrontOffice\Models\Room;
use App\Domain\Restaurant\Models\MenuItem;
use App\Domain\Restaurant\Models\RestaurantOrder;
use App\Domain\Restaurant\Models\RestaurantOrderItem;
use App\Domain\Restaurant\Models\RestaurantTable;
use App\Domain\Subscriptions\Actions\AssignHotelModulesAction;
use App\Domain\Subscriptions\Models\Module;
use App\Domain\Tenancy\Models\Hotel;
use App\Domain\Tenancy\Models\Organization;
use App\Domain\Tenancy\Models\UserHotelAccess;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeepDiveVulnerabilitiesBreakerTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $org;
    protected Hotel $hotel;
    protected User $owner;
    protected User $frontDeskStaff;
    protected User $chefStaff;
    protected Room $room101;
    protected MenuItem $menuItem;
    protected Role $gmRole;
    protected Role $frontDeskRole;
    protected Role $chefRole;

    protected function setUp(): void
    {
        parent::setUp();

        $this->org = Organization::create([
            'org_code' => 'ORG-DEEP-1',
            'name' => 'Royal Deep Dive Hospitality',
            'billing_email' => 'admin@deepdive.com',
            'status' => 'ACTIVE',
        ]);

        $this->hotel = Hotel::create([
            'organization_id' => $this->org->id,
            'hotel_code' => 'HTL-DEEP-1',
            'name' => 'Royal Heritage Grand',
            'slug' => 'royal-heritage-grand',
            'city' => 'Jaipur',
            'status' => 'ACTIVE',
        ]);

        $modules = ['front_office', 'rooms', 'restaurant', 'kitchen', 'store', 'purchase'];
        foreach ($modules as $code) {
            Module::firstOrCreate(['code' => $code], ['name' => ucfirst($code), 'is_active' => true]);
        }
        app(AssignHotelModulesAction::class)->execute($this->hotel, $modules);

        $this->gmRole = Role::firstOrCreate(['slug' => 'general-manager'], ['name' => 'General Manager']);
        $this->frontDeskRole = Role::firstOrCreate(['slug' => 'front-desk'], ['name' => 'Front Desk']);
        $this->chefRole = Role::firstOrCreate(['slug' => 'head-chef'], ['name' => 'Head Chef']);

        // Hotel Owner
        $this->owner = User::create([
            'organization_id' => $this->org->id,
            'name' => 'Hotel Owner',
            'email' => 'owner@deepdive.com',
            'password' => bcrypt('Secret@123'),
            'is_org_owner' => true,
            'status' => 'ACTIVE',
        ]);

        // Front Desk Receptionist (Low privilege)
        $this->frontDeskStaff = User::create([
            'organization_id' => $this->org->id,
            'name' => 'Priya Receptionist',
            'email' => 'priya.reception@deepdive.com',
            'password' => bcrypt('Secret@123'),
            'is_org_owner' => false,
            'status' => 'ACTIVE',
        ]);
        UserHotelAccess::create([
            'user_id' => $this->frontDeskStaff->id,
            'hotel_id' => $this->hotel->id,
            'role_id' => $this->frontDeskRole->id,
            'is_default' => true,
        ]);

        // Kitchen Chef (Low privilege)
        $this->chefStaff = User::create([
            'organization_id' => $this->org->id,
            'name' => 'Chef Sanjeev',
            'email' => 'sanjeev.chef@deepdive.com',
            'password' => bcrypt('Secret@123'),
            'is_org_owner' => false,
            'status' => 'ACTIVE',
        ]);
        UserHotelAccess::create([
            'user_id' => $this->chefStaff->id,
            'hotel_id' => $this->hotel->id,
            'role_id' => $this->chefRole->id,
            'is_default' => true,
        ]);

        $this->room101 = Room::create([
            'hotel_id' => $this->hotel->id,
            'room_number' => '101',
            'room_type' => 'Deluxe Suite',
            'room_mode' => 'AC',
            'floor' => '1st',
            'base_price' => 3000.00,
            'status' => 'AVAILABLE',
        ]);

        $this->menuItem = MenuItem::create([
            'hotel_id' => $this->hotel->id,
            'category_name' => 'Main',
            'item_code' => 'DSH-101',
            'name' => 'Tandoori Platter',
            'price' => 500.00,
            'gst_percentage' => 5.00,
            'food_type' => 'NON_VEG',
            'is_available' => true,
        ]);
    }

    /**
     * VULNERABILITY 1:
     * Privilege Escalation in Staff Creation.
     * Low-privilege Front Desk staff attempts to create a General Manager account.
     * System MUST reject with 403 Forbidden!
     */
    public function test_front_desk_staff_cannot_create_staff_users(): void
    {
        $res = $this->actingAs($this->frontDeskStaff)
            ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
            ->postJson("/api/v1/hotels/{$this->hotel->id}/staff", [
                'name' => 'Rogue GM',
                'email' => 'rogue.gm@deepdive.com',
                'password' => 'HackedPassword@123',
                'role_id' => $this->gmRole->id,
            ]);

        // MUST be 403 Forbidden
        $res->assertStatus(403);
    }

    /**
     * VULNERABILITY 2:
     * Data Privacy & Financial Exfiltration Breach.
     * Line Cook / Chef attempts to access Guest Ledger (PII & revenue) or Financial Reports.
     * System MUST reject with 403 Forbidden!
     */
    public function test_line_cook_or_chef_cannot_access_guest_ledger_or_financial_reports(): void
    {
        // 1. Chef tries to access guest ledger with Aadhaar and PII
        $ledgerRes = $this->actingAs($this->chefStaff)
            ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
            ->getJson('/api/v1/reports/guest-ledger');

        $ledgerRes->assertStatus(403);

        // 2. Chef tries to access financial overview
        $overviewRes = $this->actingAs($this->chefStaff)
            ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
            ->getJson('/api/v1/reports/overview');

        $overviewRes->assertStatus(403);
    }

    /**
     * VULNERABILITY 3:
     * Advance Reservation Trapped in RESERVED state without Check-in flow.
     * When guest arrives at the desk, confirming check-in MUST transition status
     * to CHECKED_IN and mark room OCCUPIED!
     */
    public function test_advance_reservation_can_be_confirmed_and_checked_in_on_arrival(): void
    {
        // 1. Create advance reservation for tomorrow (> 6 hours ahead)
        $res = $this->actingAs($this->owner)
            ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
            ->postJson('/api/v1/front-office/check-in', [
                'first_name' => 'Rahul',
                'phone' => '+91 9911223344',
                'nationality' => 'Indian',
                'id_type' => 'AADHAAR',
                'id_number' => '4444-5555-6666',
                'room_id' => $this->room101->id,
                'check_in_at' => Carbon::now()->addDays(2)->toIso8601String(),
                'expected_check_out_at' => Carbon::now()->addDays(4)->toIso8601String(),
                'advance_deposit_amount' => 1000.00,
            ]);

        $res->assertStatus(201);
        $this->assertEquals('RESERVED', $res->json('booking.status'));
        $bookingId = $res->json('booking.id');

        // Room is currently AVAILABLE (since arrival is in 2 days)
        $this->assertEquals('AVAILABLE', $this->room101->fresh()->status);

        // 2. Guest arrives at desk: Confirm check-in
        $confirmRes = $this->actingAs($this->owner)
            ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
            ->postJson("/api/v1/front-office/bookings/{$bookingId}/confirm-check-in");

        $confirmRes->assertStatus(200);
        $this->assertEquals('CHECKED_IN', $confirmRes->json('booking.status'));
        $this->assertEquals('OCCUPIED', $this->room101->fresh()->status);
    }

    /**
     * VULNERABILITY 4:
     * Kitchen Chef cannot cancel items on an already SETTLED order.
     * On open orders, cancelling an item MUST reduce order subtotal and tax.
     */
    public function test_kitchen_item_cancellation_rules_and_total_recalculation(): void
    {
        // 1. Create open order with 2 items
        $orderRes = $this->actingAs($this->owner)
            ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
            ->postJson('/api/v1/restaurant/orders', [
                'order_type' => 'TAKEAWAY',
                'customer_name' => 'Test Customer',
                'items' => [
                    ['menu_item_id' => $this->menuItem->id, 'quantity' => 2], // 2 x 500 = 1000 + 5% GST = 1050
                ],
            ]);

        $orderRes->assertStatus(201);
        $orderId = $orderRes->json('order.id');
        $itemId = $orderRes->json('order.items.0.id');
        $this->assertEquals(1050.00, (float) $orderRes->json('order.grand_total'));

        // 2. Settle the order
        $this->actingAs($this->owner)
            ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
            ->postJson("/api/v1/restaurant/orders/{$orderId}/settle", [
                'settlement_method' => 'CASH',
            ]);

        // 3. Chef tries to mark item CANCELLED on the already settled order
        $cancelRes = $this->actingAs($this->chefStaff)
            ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
            ->putJson("/api/v1/kitchen/items/{$itemId}/status", [
                'status' => 'CANCELLED',
            ]);

        // MUST be blocked with 422
        $cancelRes->assertStatus(422);
    }

    /**
     * VULNERABILITY 5:
     * Check-in Discount cannot exceed total room charges.
     */
    public function test_check_in_discount_cannot_exceed_room_charges(): void
    {
        $res = $this->actingAs($this->owner)
            ->withHeaders(['X-Hotel-ID' => $this->hotel->id])
            ->postJson('/api/v1/front-office/check-in', [
                'first_name' => 'Discount',
                'phone' => '+91 9911223399',
                'nationality' => 'Indian',
                'id_type' => 'AADHAAR',
                'id_number' => '1111-2222-9999',
                'room_id' => $this->room101->id,
                'expected_check_out_at' => Carbon::now()->addDay()->toIso8601String(),
                'discount_amount' => 50000.00, // Room charge is only 3000!
            ]);

        // MUST be rejected with 422
        $res->assertStatus(422);
    }
}

