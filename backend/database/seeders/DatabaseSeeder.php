<?php

namespace Database\Seeders;

use App\Domain\Access\Models\Role;
use App\Domain\Subscriptions\Actions\AssignHotelModulesAction;
use App\Domain\Subscriptions\Models\Module;
use App\Domain\Tenancy\Actions\CreateHotelAction;
use App\Domain\Tenancy\Actions\CreateOrganizationAction;
use App\Domain\Tenancy\Models\Hotel;
use App\Domain\Tenancy\Models\Organization;
use App\Domain\Tenancy\Models\UserHotelAccess;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Seed Core Modules
        $modules = [
            [
                'code' => 'front_office',
                'name' => 'Front Office',
                'description' => 'Guest check-in, check-out, reservations, walk-ins and guest ledger.',
                'icon' => 'desk',
                'sort_order' => 1,
            ],
            [
                'code' => 'rooms',
                'name' => 'Rooms Management',
                'description' => 'Room inventory, housekeeping statuses, tariff pricing and floor plans.',
                'icon' => 'bed',
                'sort_order' => 2,
            ],
            [
                'code' => 'restaurant',
                'name' => 'Restaurant & POS',
                'description' => 'Table management, dine-in / takeaway orders, menu billing and POS.',
                'icon' => 'utensils',
                'sort_order' => 3,
            ],
            [
                'code' => 'kitchen',
                'name' => 'Kitchen (KOT)',
                'description' => 'Live Kitchen Order Tickets, chef order queue and food preparation tracking.',
                'icon' => 'fire',
                'sort_order' => 4,
            ],
            [
                'code' => 'store',
                'name' => 'Store / Inventory',
                'description' => 'Stock tracking, low inventory alerts, item requisitions and stock audits.',
                'icon' => 'box',
                'sort_order' => 5,
            ],
            [
                'code' => 'purchase',
                'name' => 'Purchase & Vendors',
                'description' => 'Vendor management, purchase orders, goods receipt notes (GRN) and invoice matching.',
                'icon' => 'shopping-cart',
                'sort_order' => 6,
            ],
        ];

        foreach ($modules as $mod) {
            Module::updateOrCreate(['code' => $mod['code']], $mod);
        }

        // 2. Seed System Roles
        $roles = [
            ['name' => 'Super Administrator', 'slug' => 'super-admin', 'description' => 'Full platform control'],
            ['name' => 'Hotel Owner', 'slug' => 'hotel-owner', 'description' => 'Owner of one or multiple hotels'],
            ['name' => 'General Manager', 'slug' => 'general-manager', 'description' => 'Full management access for assigned hotel'],
            ['name' => 'Front Desk Receptionist', 'slug' => 'front-desk', 'description' => 'Front office operations'],
            ['name' => 'Restaurant Cashier / Waiter', 'slug' => 'restaurant-cashier', 'description' => 'Restaurant POS'],
            ['name' => 'Head Chef', 'slug' => 'head-chef', 'description' => 'Kitchen KOT management'],
            ['name' => 'Storekeeper', 'slug' => 'storekeeper', 'description' => 'Store & purchase management'],
        ];

        foreach ($roles as $role) {
            Role::updateOrCreate(['slug' => $role['slug']], $role);
        }

        // 3. Seed Platform Super Admin
        $superAdmin = User::updateOrCreate(
            ['email' => 'admin@hotelsaask.com'],
            [
                'name' => 'Platform Super Admin',
                'password' => Hash::make('Password@123'),
                'is_platform_admin' => true,
                'is_org_owner' => false,
                'status' => 'ACTIVE',
            ]
        );

        // 4. Seed Demo Multi-Hotel Customer (As described in requirement scenario)
        $createOrgAction = app(CreateOrganizationAction::class);
        $createHotelAction = app(CreateHotelAction::class);
        $assignModulesAction = app(AssignHotelModulesAction::class);

        $organization = Organization::where('org_code', 'ORG-1001')->first();

        if (!$organization) {
            $orgData = $createOrgAction->execute([
                'org_code' => 'ORG-1001',
                'name' => 'Apex Hospitality Group',
                'billing_email' => 'billing@apexhospitality.com',
                'phone' => '+91 9876543210',
                'tax_number' => '27AAACA1234A1Z5',
                'owner_name' => 'Rajesh Sharma',
                'owner_email' => 'owner@apexhospitality.com',
                'owner_password' => 'Password@123',
            ]);

            $organization = $orgData['organization'];

            // Hotel A: Subscribed to Front Office, Rooms
            $hotelA = $createHotelAction->execute($organization, [
                'hotel_code' => 'HTL-1001',
                'name' => 'Apex Grand Palace',
                'city' => 'Mumbai',
                'state' => 'Maharashtra',
                'modules' => ['front_office', 'rooms'],
            ]);

            // Hotel B: Subscribed to Front Office, Rooms, Restaurant, Kitchen
            $hotelB = $createHotelAction->execute($organization, [
                'hotel_code' => 'HTL-1002',
                'name' => 'Apex Sea Breeze Resort',
                'city' => 'Goa',
                'state' => 'Goa',
                'modules' => ['front_office', 'rooms', 'restaurant', 'kitchen'],
            ]);

            // Hotel C: Subscribed to Store, Purchase
            $hotelC = $createHotelAction->execute($organization, [
                'hotel_code' => 'HTL-1003',
                'name' => 'Apex Express Inn',
                'city' => 'Delhi',
                'state' => 'Delhi',
                'modules' => ['store', 'purchase'],
            ]);
        } else {
            $hotelA = Hotel::where('hotel_code', 'HTL-1001')->first();
            $hotelB = Hotel::where('hotel_code', 'HTL-1002')->first();
            $hotelC = Hotel::where('hotel_code', 'HTL-1003')->first();
        }

        // 5. Seed Granular Tier 3 Staff Logins for Each Module
        $frontDeskRole = Role::where('slug', 'front-desk')->first();
        $cashierRole = Role::where('slug', 'restaurant-cashier')->first();
        $chefRole = Role::where('slug', 'head-chef')->first();
        $storeRole = Role::where('slug', 'storekeeper')->first();

        // Front Desk Receptionist (Assigned to Hotel A: HTL-1001)
        $frontDeskUser = User::updateOrCreate(
            ['email' => 'frontdesk.priya@apexhospitality.com'],
            [
                'organization_id' => $organization->id,
                'name' => 'Priya Sharma (Front Desk)',
                'password' => Hash::make('Password@123'),
                'is_platform_admin' => false,
                'is_org_owner' => false,
                'status' => 'ACTIVE',
            ]
        );
        UserHotelAccess::updateOrCreate(
            ['user_id' => $frontDeskUser->id, 'hotel_id' => $hotelA->id],
            ['role_id' => $frontDeskRole->id, 'is_default' => true]
        );

        // Head Chef (Assigned to Hotel B: HTL-1002)
        $chefUser = User::updateOrCreate(
            ['email' => 'chef.sanjeev@apexhospitality.com'],
            [
                'organization_id' => $organization->id,
                'name' => 'Chef Sanjeev Kapoor',
                'password' => Hash::make('Password@123'),
                'is_platform_admin' => false,
                'is_org_owner' => false,
                'status' => 'ACTIVE',
            ]
        );
        UserHotelAccess::updateOrCreate(
            ['user_id' => $chefUser->id, 'hotel_id' => $hotelB->id],
            ['role_id' => $chefRole->id, 'is_default' => true]
        );

        // Restaurant Cashier / Waiter (Assigned to Hotel B: HTL-1002)
        $cashierUser = User::updateOrCreate(
            ['email' => 'cashier.rahul@apexhospitality.com'],
            [
                'organization_id' => $organization->id,
                'name' => 'Rahul Verma (Cashier)',
                'password' => Hash::make('Password@123'),
                'is_platform_admin' => false,
                'is_org_owner' => false,
                'status' => 'ACTIVE',
            ]
        );
        UserHotelAccess::updateOrCreate(
            ['user_id' => $cashierUser->id, 'hotel_id' => $hotelB->id],
            ['role_id' => $cashierRole->id, 'is_default' => true]
        );

        // Storekeeper (Assigned to Hotel C: HTL-1003)
        $storeUser = User::updateOrCreate(
            ['email' => 'store.amit@apexhospitality.com'],
            [
                'organization_id' => $organization->id,
                'name' => 'Amit Patel (Storekeeper)',
                'password' => Hash::make('Password@123'),
                'is_platform_admin' => false,
                'is_org_owner' => false,
                'status' => 'ACTIVE',
            ]
        );
        UserHotelAccess::updateOrCreate(
            ['user_id' => $storeUser->id, 'hotel_id' => $hotelC->id],
            ['role_id' => $storeRole->id, 'is_default' => true]
        );
    }
}
