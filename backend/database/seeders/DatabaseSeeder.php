<?php

namespace Database\Seeders;

use App\Domain\Access\Models\Role;
use App\Domain\Subscriptions\Actions\AssignHotelModulesAction;
use App\Domain\Subscriptions\Models\Module;
use App\Domain\Tenancy\Actions\CreateHotelAction;
use App\Domain\Tenancy\Actions\CreateOrganizationAction;
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
    }
}
