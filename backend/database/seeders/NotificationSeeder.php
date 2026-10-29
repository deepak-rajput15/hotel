<?php

namespace Database\Seeders;

use App\Domain\Notifications\Models\InternalNotification;
use App\Domain\Tenancy\Models\Hotel;
use App\Domain\Tenancy\Models\Organization;
use App\Models\User;
use Illuminate\Database\Seeder;

class NotificationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $superAdmin = User::where('email', 'admin@hotelsaask.com')->first();
        $owner = User::where('email', 'owner@apexhospitality.com')->first();
        $org = Organization::where('org_code', 'ORG-1001')->first();
        $hotelA = Hotel::where('hotel_code', 'HTL-1001')->first();

        if (!$superAdmin || !$owner || !$org) {
            return;
        }

        // 1. Platform Super Admin Announcement to Hotel Owners
        InternalNotification::updateOrCreate(
            ['title' => 'Scheduled Cloud Server Upgrade & Maintenance Notice'],
            [
                'sender_id' => $superAdmin->id,
                'sender_type' => 'PLATFORM_ADMIN',
                'organization_id' => null,
                'hotel_id' => null,
                'target_scope' => 'GLOBAL_OWNERS',
                'target_role' => null,
                'message' => 'GrandStay Cloud infrastructure upgrade is scheduled for Sunday 2:00 AM - 3:00 AM IST. All property data and bookings will remain synchronized.',
                'priority' => 'INFO',
                'is_banner' => false,
                'starts_at' => now(),
                'expires_at' => now()->addDays(7),
                'is_active' => true,
            ]
        );

        // 2. Hotel Owner Broadcast to All Subordinates
        InternalNotification::updateOrCreate(
            ['title' => 'All Departments Weekly Operations Briefing'],
            [
                'sender_id' => $owner->id,
                'sender_type' => 'HOTEL_OWNER',
                'organization_id' => $org->id,
                'hotel_id' => null,
                'target_scope' => 'ALL_STAFF',
                'target_role' => null,
                'message' => 'All department leads and staff members please assemble in the conference hall today at 4:30 PM for our monthly customer satisfaction review.',
                'priority' => 'INFO',
                'is_banner' => false,
                'starts_at' => now(),
                'expires_at' => now()->addDays(3),
                'is_active' => true,
            ]
        );

        // 3. Hotel Owner Targeted Reminder to Front Desk (Flashing Urgent Banner)
        InternalNotification::updateOrCreate(
            ['title' => 'VIP Diplomat Delegation Arrival (Room 201)'],
            [
                'sender_id' => $owner->id,
                'sender_type' => 'HOTEL_OWNER',
                'organization_id' => $org->id,
                'hotel_id' => $hotelA ? $hotelA->id : null,
                'target_scope' => 'SPECIFIC_ROLE',
                'target_role' => 'front-desk',
                'message' => 'Foreign delegation arriving at 2:00 PM today. Ensure expedited Form C / Govt KYC completion, luggage escort, and complimentary welcome beverages.',
                'priority' => 'URGENT',
                'is_banner' => true,
                'starts_at' => now(),
                'expires_at' => now()->addHours(12),
                'is_active' => true,
            ]
        );
    }
}

