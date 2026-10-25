<?php

namespace Tests\Feature;

use App\Domain\Tenancy\Models\Hotel;
use App\Domain\Tenancy\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenancyAndSubscriptionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    /**
     * Test 1: Super Admin can login and access administrative endpoints.
     */
    public function test_super_admin_can_login_and_access_admin_api(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@hotelsaask.com',
            'password' => 'Password@123',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('user.is_platform_admin', true);

        $token = $response->json('token');

        // Can list organizations
        $orgListResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/admin/organizations');

        $orgListResponse->assertStatus(200)
            ->assertJsonPath('success', true);
    }

    /**
     * Test 2: Super Admin can onboard an organization and create a new hotel.
     */
    public function test_super_admin_can_register_organization_and_hotel(): void
    {
        $superAdmin = User::where('email', 'admin@hotelsaask.com')->first();
        $token = $superAdmin->createToken('test')->plainTextToken;

        // 1. Create Organization
        $orgResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/admin/organizations', [
                'name' => 'Royal Heritage Group',
                'billing_email' => 'finance@royalheritage.com',
                'phone' => '+91 9999888877',
                'owner_name' => 'Vikram Singh',
                'owner_email' => 'vikram@royalheritage.com',
                'owner_password' => 'SecretPass@123',
            ]);

        $orgResponse->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('organization.org_code', 'ORG-1002');

        $orgId = $orgResponse->json('organization.id');

        // 2. Create Hotel under this new Organization
        $hotelResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/v1/admin/organizations/{$orgId}/hotels", [
                'name' => 'Royal Haveli Resort',
                'city' => 'Jaipur',
                'state' => 'Rajasthan',
                'modules' => ['front_office', 'rooms', 'restaurant'],
            ]);

        $hotelResponse->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('hotel.hotel_code', 'HTL-1004')
            ->assertJsonPath('hotel.name', 'Royal Haveli Resort');
    }

    /**
     * Test 3: Hotel Owner logs in and sees all hotels belonging to their organization.
     */
    public function test_hotel_owner_sees_only_their_hotels(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'owner@apexhospitality.com',
            'password' => 'Password@123',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('user.is_org_owner', true);

        // Owner owns 3 hotels (HTL-1001, HTL-1002, HTL-1003)
        $accessibleHotels = $response->json('user.accessible_hotels');
        $this->assertCount(3, $accessibleHotels);
    }

    /**
     * Test 4: Hotel-specific module subscription enforcement:
     * - Hotel A (HTL-1001) has Front Office & Rooms, but NO Restaurant.
     * - Front Office API succeeds (200).
     * - Restaurant API fails with 403 Forbidden (MODULE_NOT_SUBSCRIBED).
     */
    public function test_hotel_a_cannot_access_unsubscribed_restaurant_module(): void
    {
        $owner = User::where('email', 'owner@apexhospitality.com')->first();
        $token = $owner->createToken('test')->plainTextToken;
        $hotelA = Hotel::where('hotel_code', 'HTL-1001')->first();

        // 1. Access Front Office (Subscribed) -> Expect 200 OK
        $frontOfficeResponse = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Hotel-ID' => $hotelA->hotel_code,
        ])->getJson('/api/v1/front-office/dashboard');

        $frontOfficeResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('module', 'front_office');

        // 2. Access Restaurant (Not Subscribed) -> Expect 403 Forbidden
        $restaurantResponse = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Hotel-ID' => $hotelA->hotel_code,
        ])->getJson('/api/v1/restaurant/orders');

        $restaurantResponse->assertStatus(403)
            ->assertJsonPath('success', false)
            ->assertJsonPath('error_code', 'MODULE_NOT_SUBSCRIBED');
    }

    /**
     * Test 5: Hotel B (HTL-1002) has Restaurant subscribed -> Restaurant API succeeds (200).
     */
    public function test_hotel_b_can_access_subscribed_restaurant_module(): void
    {
        $owner = User::where('email', 'owner@apexhospitality.com')->first();
        $token = $owner->createToken('test')->plainTextToken;
        $hotelB = Hotel::where('hotel_code', 'HTL-1002')->first();

        $restaurantResponse = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Hotel-ID' => $hotelB->hotel_code,
        ])->getJson('/api/v1/restaurant/orders');

        $restaurantResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('module', 'restaurant');
    }

    /**
     * Test 6: Super Admin dynamically enables Restaurant module on Hotel A from Dashboard API
     * (Zero code change required!).
     * Immediately afterwards, Hotel A can access Restaurant orders!
     */
    public function test_super_admin_dynamic_module_toggle_works_instantly(): void
    {
        $superAdmin = User::where('email', 'admin@hotelsaask.com')->first();
        $adminToken = $superAdmin->createToken('admin')->plainTextToken;

        $owner = User::where('email', 'owner@apexhospitality.com')->first();
        $ownerToken = $owner->createToken('owner')->plainTextToken;

        $hotelA = Hotel::where('hotel_code', 'HTL-1001')->first();

        // Step 1: Confirm Restaurant is blocked initially
        $this->withHeaders([
            'Authorization' => "Bearer {$ownerToken}",
            'X-Hotel-ID' => $hotelA->id,
        ])->getJson('/api/v1/restaurant/orders')->assertStatus(403);

        $this->flushHeaders();
        auth()->forgetGuards();

        // Step 2: Super Admin turns ON Restaurant module for Hotel A via API
        $updateResponse = $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->putJson("/api/v1/admin/hotels/{$hotelA->id}/modules", [
                'modules' => [
                    'front_office' => ['enabled' => true],
                    'rooms' => ['enabled' => true],
                    'restaurant' => ['enabled' => true], // Turned ON!
                ],
            ]);

        $updateResponse->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->flushHeaders();
        auth()->forgetGuards();

        // Step 3: Now Hotel A immediately has access to Restaurant (200 OK)!
        $newAccessResponse = $this->withHeaders([
            'Authorization' => "Bearer {$ownerToken}",
            'X-Hotel-ID' => $hotelA->id,
        ])->getJson('/api/v1/restaurant/orders');

        $newAccessResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('module', 'restaurant');

        $this->flushHeaders();
        auth()->forgetGuards();

        // Step 4: Super Admin turns Restaurant module OFF again
        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->putJson("/api/v1/admin/hotels/{$hotelA->id}/modules", [
                'modules' => [
                    'front_office' => ['enabled' => true],
                    'rooms' => ['enabled' => true],
                    'restaurant' => ['enabled' => false], // Turned OFF!
                ],
            ])->assertStatus(200);

        $this->flushHeaders();
        auth()->forgetGuards();

        // Step 5: Immediately blocked again!
        $this->withHeaders([
            'Authorization' => "Bearer {$ownerToken}",
            'X-Hotel-ID' => $hotelA->id,
        ])->getJson('/api/v1/restaurant/orders')->assertStatus(403);
    }
}
