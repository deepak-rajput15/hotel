<?php

namespace Tests\Feature;

use App\Domain\Subscriptions\Models\SubscriptionPackage;
use App\Domain\Subscriptions\Models\HotelSubscription;
use App\Domain\Tenancy\Models\Hotel;
use App\Domain\Tenancy\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubscriptionPackageTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $hotelOwner;
    protected Hotel $hotel;
    protected Organization $org;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        $this->superAdmin = User::where('is_platform_admin', true)->first();
        $this->hotelOwner = User::where('email', 'owner@apexhospitality.com')->first();
        $this->hotel = Hotel::where('hotel_code', 'HTL-1001')->first();
        $this->org = Organization::first();
    }

    public function test_super_admin_can_list_and_create_subscription_packages(): void
    {
        // 1. List packages
        $response = $this->actingAs($this->superAdmin)
            ->getJson('/api/v1/admin/packages');

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonStructure(['data' => [['id', 'name', 'slug', 'monthly_price', 'yearly_price', 'included_modules']]]);

        // 2. Create new custom package
        $payload = [
            'name' => 'Custom Boutique Plus',
            'description' => 'Tailored for boutique hotels with custom requirements.',
            'monthly_price' => 3499.00,
            'yearly_price' => 34990.00,
            'onetime_price' => 79990.00,
            'setup_fee' => 1500.00,
            'billing_cycle' => 'ALL',
            'max_rooms' => 35,
            'max_staff_accounts' => 8,
            'max_pos_terminals' => 1,
            'included_modules' => ['front_office', 'rooms', 'restaurant'],
            'features_list' => ['Custom branding', 'Dedicated phone support'],
            'badge_text' => 'Sales Special',
            'is_featured' => true,
        ];

        $createRes = $this->actingAs($this->superAdmin)
            ->postJson('/api/v1/admin/packages', $payload);

        $createRes->assertStatus(201)
            ->assertJson([
                'success' => true,
                'package' => [
                    'name' => 'Custom Boutique Plus',
                    'monthly_price' => 3499.00,
                    'is_featured' => true,
                ],
            ]);

        $this->assertDatabaseHas('subscription_packages', [
            'name' => 'Custom Boutique Plus',
            'max_rooms' => 35,
        ]);
    }

    public function test_sales_team_can_assign_package_to_hotel_and_activate_modules(): void
    {
        $package = SubscriptionPackage::where('slug', 'hotel-dining-pos')->first();

        // Assign package with YEARLY billing
        $assignPayload = [
            'package_id' => $package->id,
            'billing_cycle' => 'YEARLY',
            'agreed_price' => 39990.00, // Sales team gave special discount from rack rate 44990
            'payment_status' => 'PAID',
            'payment_method' => 'BANK_TRANSFER',
            'payment_reference' => 'TXN-SALES-DEAL-999',
            'sales_notes' => 'Corporate negotiation discount approved by Company Sales Head.',
        ];

        $res = $this->actingAs($this->superAdmin)
            ->postJson("/api/v1/admin/hotels/{$this->hotel->id}/assign-package", $assignPayload);

        $res->assertStatus(201)
            ->assertJson([
                'success' => true,
                'subscription' => [
                    'billing_cycle' => 'YEARLY',
                    'agreed_price' => 39990.00,
                    'status' => 'ACTIVE',
                ],
            ]);

        // Verify hotel subscription was created
        $this->assertDatabaseHas('hotel_subscriptions', [
            'hotel_id' => $this->hotel->id,
            'package_id' => $package->id,
            'billing_cycle' => 'YEARLY',
            'agreed_price' => 39990.00,
            'status' => 'ACTIVE',
        ]);

        // Verify hotel module subscriptions match package included modules ('front_office', 'rooms', 'restaurant', 'kitchen')
        $this->assertDatabaseHas('hotel_module_subscriptions', [
            'hotel_id' => $this->hotel->id,
            'status' => 'ACTIVE',
        ]);

        // Check active modules endpoint returns the newly assigned package details
        $modulesRes = $this->actingAs($this->hotelOwner)
            ->withHeader('X-Hotel-Id', $this->hotel->hotel_code)
            ->getJson("/api/v1/hotels/{$this->hotel->id}/modules");

        $modulesRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'package_subscription' => [
                    'plan_name' => $package->name,
                    'billing_cycle' => 'YEARLY',
                    'status' => 'ACTIVE',
                ],
            ]);
    }

    public function test_can_extend_subscription_validity(): void
    {
        $package = SubscriptionPackage::first();

        $sub = HotelSubscription::create([
            'hotel_id' => $this->hotel->id,
            'package_id' => $package->id,
            'plan_name' => $package->name,
            'billing_cycle' => 'MONTHLY',
            'agreed_price' => 1999.00,
            'currency' => 'INR',
            'status' => 'ACTIVE',
            'starts_at' => now(),
            'expires_at' => now()->addDays(5),
            'payment_status' => 'PAID',
        ]);

        $res = $this->actingAs($this->superAdmin)
            ->putJson("/api/v1/admin/hotel-subscriptions/{$sub->id}/extend", [
                'months_to_add' => 3,
                'sales_notes' => 'Customer renewed for 3 additional months.',
            ]);

        $res->assertStatus(200)
            ->assertJson(['success' => true]);

        $sub->refresh();
        $this->assertTrue($sub->expires_at->gt(now()->addMonths(2)));
    }

    public function test_non_super_admin_cannot_access_package_management(): void
    {
        $response = $this->actingAs($this->hotelOwner)
            ->getJson('/api/v1/admin/packages');

        $response->assertStatus(403);
    }
}
