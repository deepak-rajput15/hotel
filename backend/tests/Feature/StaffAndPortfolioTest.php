<?php

namespace Tests\Feature;

use App\Domain\Access\Models\Role;
use App\Domain\Tenancy\Models\Hotel;
use App\Domain\Tenancy\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StaffAndPortfolioTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_owner_can_list_staff_for_their_hotels(): void
    {
        $owner = User::where('email', 'owner@apexhospitality.com')->first();
        $this->assertNotNull($owner);

        $response = $this->actingAs($owner)->getJson('/api/v1/hotels/ALL/staff');
        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'staff',
                'available_roles',
            ]);
    }

    public function test_owner_can_create_staff_for_subscribed_hotel(): void
    {
        $owner = User::where('email', 'owner@apexhospitality.com')->first();
        // Hotel B (HTL-1002) is subscribed to kitchen
        $hotelB = Hotel::where('hotel_code', 'HTL-1002')->first();
        $chefRole = Role::where('slug', 'head-chef')->first();

        $response = $this->actingAs($owner)->postJson("/api/v1/hotels/{$hotelB->id}/staff", [
            'name' => 'Chef Suresh',
            'email' => 'chef.suresh@apexhospitality.com',
            'password' => 'Password@123',
            'role_id' => $chefRole->id,
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'chef.suresh@apexhospitality.com',
            'is_org_owner' => false,
        ]);
    }

    public function test_owner_cannot_create_staff_if_hotel_lacks_required_module(): void
    {
        $owner = User::where('email', 'owner@apexhospitality.com')->first();
        // Hotel A (HTL-1001) is NOT subscribed to kitchen
        $hotelA = Hotel::where('hotel_code', 'HTL-1001')->first();
        $chefRole = Role::where('slug', 'head-chef')->first();

        $response = $this->actingAs($owner)->postJson("/api/v1/hotels/{$hotelA->id}/staff", [
            'name' => 'Chef Ramesh',
            'email' => 'chef.ramesh@apexhospitality.com',
            'password' => 'Password@123',
            'role_id' => $chefRole->id,
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'error_code' => 'MODULE_NOT_SUBSCRIBED',
            ]);
    }
}
