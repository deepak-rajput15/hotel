<?php

namespace Tests\Feature;

use App\Domain\Notifications\Models\InternalNotification;
use App\Domain\Tenancy\Models\Hotel;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InternalNotificationsBroadcastTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        InternalNotification::truncate();
    }

    public function test_platform_admin_can_broadcast_to_hotel_owners(): void
    {
        $superAdmin = User::where('email', 'admin@hotelsaask.com')->first();
        $owner = User::where('email', 'owner@apexhospitality.com')->first();
        $frontDesk = User::where('email', 'frontdesk.priya@apexhospitality.com')->first();

        // Platform Admin sends global owner reminder with top banner
        $response = $this->actingAs($superAdmin)->postJson('/api/v1/notifications', [
            'title' => 'Scheduled System Maintenance Tonight',
            'message' => 'The platform will undergo scheduled maintenance from 2:00 AM to 3:00 AM IST.',
            'priority' => 'WARNING',
            'is_banner' => true,
            'target_scope' => 'GLOBAL_OWNERS',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'title' => 'Scheduled System Maintenance Tonight',
                    'priority' => 'WARNING',
                    'is_banner' => true,
                    'target_scope' => 'GLOBAL_OWNERS',
                ],
            ]);

        $notificationId = $response->json('data.id');

        // Hotel Owner should see this notification and it should be in active banners
        $ownerResponse = $this->actingAs($owner)->getJson('/api/v1/notifications');
        $ownerResponse->assertStatus(200);
        $this->assertEquals(1, $ownerResponse->json('meta.total'));
        $this->assertEquals(1, $ownerResponse->json('meta.active_banners_count'));
        $this->assertEquals('Scheduled System Maintenance Tonight', $ownerResponse->json('data.0.title'));

        // Front desk staff should NOT see this owner-only notification
        $frontDeskResponse = $this->actingAs($frontDesk)->getJson('/api/v1/notifications');
        $frontDeskResponse->assertStatus(200);
        $this->assertEquals(0, $frontDeskResponse->json('meta.total'));
    }

    public function test_hotel_owner_can_broadcast_to_all_subordinates(): void
    {
        $owner = User::where('email', 'owner@apexhospitality.com')->first();
        $frontDesk = User::where('email', 'frontdesk.priya@apexhospitality.com')->first();
        $chef = User::where('email', 'chef.sanjeev@apexhospitality.com')->first();

        // Hotel Owner sends an announcement to all staff
        $response = $this->actingAs($owner)->postJson('/api/v1/notifications', [
            'title' => 'All Staff Monthly Briefing',
            'message' => 'Please gather in the conference hall tomorrow at 10 AM.',
            'priority' => 'INFO',
            'is_banner' => true,
            'target_scope' => 'ALL_STAFF',
        ]);

        $response->assertStatus(201);

        // Both Front Desk and Chef should receive this notification
        $fdResponse = $this->actingAs($frontDesk)->getJson('/api/v1/notifications');
        $fdResponse->assertStatus(200);
        $this->assertEquals(1, $fdResponse->json('meta.total'));
        $this->assertEquals('All Staff Monthly Briefing', $fdResponse->json('data.0.title'));

        $chefResponse = $this->actingAs($chef)->getJson('/api/v1/notifications');
        $chefResponse->assertStatus(200);
        $this->assertEquals(1, $chefResponse->json('meta.total'));
        $this->assertEquals('All Staff Monthly Briefing', $chefResponse->json('data.0.title'));
    }

    public function test_hotel_owner_can_target_specific_subordinate_role(): void
    {
        $owner = User::where('email', 'owner@apexhospitality.com')->first();
        $frontDesk = User::where('email', 'frontdesk.priya@apexhospitality.com')->first();
        $chef = User::where('email', 'chef.sanjeev@apexhospitality.com')->first();
        $storekeeper = User::where('email', 'store.amit@apexhospitality.com')->first();

        // Broadcast specifically to Front Desk Receptionists
        $response = $this->actingAs($owner)->postJson('/api/v1/notifications', [
            'title' => 'VIP Diplomat Check-In Alert',
            'message' => 'VIP delegation arriving at 3 PM. Ensure swift KYC and welcome drinks.',
            'priority' => 'URGENT',
            'is_banner' => true,
            'target_scope' => 'SPECIFIC_ROLE',
            'target_role' => 'front-desk',
        ]);

        $response->assertStatus(201);

        // Front desk MUST see this notification
        $fdResponse = $this->actingAs($frontDesk)->getJson('/api/v1/notifications');
        $fdResponse->assertStatus(200);
        $this->assertEquals(1, $fdResponse->json('meta.total'));
        $this->assertEquals('VIP Diplomat Check-In Alert', $fdResponse->json('data.0.title'));
        $this->assertEquals('URGENT', $fdResponse->json('data.0.priority'));

        // Chef and Storekeeper MUST NOT see this notification
        $chefResponse = $this->actingAs($chef)->getJson('/api/v1/notifications');
        $chefResponse->assertStatus(200);
        $this->assertEquals(0, $chefResponse->json('meta.total'));

        $storeResponse = $this->actingAs($storekeeper)->getJson('/api/v1/notifications');
        $storeResponse->assertStatus(200);
        $this->assertEquals(0, $storeResponse->json('meta.total'));
    }

    public function test_user_can_mark_notification_as_read_and_dismiss_banner(): void
    {
        $owner = User::where('email', 'owner@apexhospitality.com')->first();
        $frontDesk = User::where('email', 'frontdesk.priya@apexhospitality.com')->first();

        $createResponse = $this->actingAs($owner)->postJson('/api/v1/notifications', [
            'title' => 'Urgent Inspection Today',
            'message' => 'Local hygiene inspector visiting at 1 PM.',
            'priority' => 'URGENT',
            'is_banner' => true,
            'target_scope' => 'ALL_STAFF',
        ]);

        $notificationId = $createResponse->json('data.id');

        // Check initially unread & active banner
        $beforeRead = $this->actingAs($frontDesk)->getJson('/api/v1/notifications');
        $this->assertEquals(1, $beforeRead->json('meta.unread_count'));
        $this->assertEquals(1, $beforeRead->json('meta.active_banners_count'));
        $this->assertFalse($beforeRead->json('data.0.is_read'));

        // Mark as read
        $readResponse = $this->actingAs($frontDesk)->postJson("/api/v1/notifications/{$notificationId}/read");
        $readResponse->assertStatus(200);

        $afterRead = $this->actingAs($frontDesk)->getJson('/api/v1/notifications');
        $this->assertEquals(0, $afterRead->json('meta.unread_count'));
        $this->assertTrue($afterRead->json('data.0.is_read'));

        // Dismiss banner
        $dismissResponse = $this->actingAs($frontDesk)->postJson("/api/v1/notifications/{$notificationId}/read", [
            'dismissed' => true,
        ]);
        $dismissResponse->assertStatus(200);

        $afterDismiss = $this->actingAs($frontDesk)->getJson('/api/v1/notifications');
        $this->assertEquals(0, $afterDismiss->json('meta.active_banners_count'));
        $this->assertTrue($afterDismiss->json('data.0.is_dismissed'));
    }

    public function test_subordinates_cannot_create_broadcasts_and_owner_cannot_broadcast_globally(): void
    {
        $frontDesk = User::where('email', 'frontdesk.priya@apexhospitality.com')->first();
        $owner = User::where('email', 'owner@apexhospitality.com')->first();

        // Staff attempting to broadcast -> 403 Forbidden
        $staffAttempt = $this->actingAs($frontDesk)->postJson('/api/v1/notifications', [
            'title' => 'Unauthorized announcement',
            'message' => 'Should fail',
            'target_scope' => 'ALL_STAFF',
        ]);
        $staffAttempt->assertStatus(403);

        // Hotel Owner attempting to broadcast GLOBAL_OWNERS -> 403 Forbidden
        $ownerGlobalAttempt = $this->actingAs($owner)->postJson('/api/v1/notifications', [
            'title' => 'Illegal global broadcast',
            'message' => 'Should fail',
            'target_scope' => 'GLOBAL_OWNERS',
        ]);
        $ownerGlobalAttempt->assertStatus(403);
    }
}
