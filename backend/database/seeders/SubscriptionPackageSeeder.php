<?php

namespace Database\Seeders;

use App\Domain\Subscriptions\Actions\AssignHotelPackageAction;
use App\Domain\Subscriptions\Models\SubscriptionPackage;
use App\Domain\Tenancy\Models\Hotel;
use App\Models\User;
use Illuminate\Database\Seeder;

class SubscriptionPackageSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $packages = [
            [
                'name' => 'Starter Front Desk (PMS)',
                'slug' => 'starter-pms',
                'description' => 'Ideal for budget hotels, guesthouses & boutique stays. Covers guest front office, room inventory, housekeeping turnover and billing.',
                'monthly_price' => 1999.00,
                'yearly_price' => 19990.00, // 2 months free
                'onetime_price' => 49990.00,
                'setup_fee' => 0.00,
                'currency' => 'INR',
                'billing_cycle' => 'ALL',
                'max_rooms' => 25,
                'max_staff_accounts' => 5,
                'max_pos_terminals' => 0,
                'included_modules' => ['front_office', 'rooms'],
                'features_list' => [
                    'Guest Check-In, Check-Out & Reservation Calendar',
                    'Room Rack with Instant Status (Clean, Dirty, Repair)',
                    'Housekeeping Mobile Turnover Terminal',
                    'Guest Folios, Invoicing & GST Invoices',
                    'Cash Drawer Shift Register & Daily Reconciliation',
                    'Night Audit Day-End Processing',
                ],
                'is_featured' => false,
                'badge_text' => 'Boutique Choice',
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'name' => 'Hotel & Restaurant Dining',
                'slug' => 'hotel-dining-pos',
                'description' => 'Complete solution for mid-sized hotels with in-house restaurant, cafe, or bar. Seamlessly transfer restaurant dining bills directly to room folios.',
                'monthly_price' => 4499.00,
                'yearly_price' => 44990.00, // 2 months free
                'onetime_price' => 99990.00,
                'setup_fee' => 0.00,
                'currency' => 'INR',
                'billing_cycle' => 'ALL',
                'max_rooms' => 60,
                'max_staff_accounts' => 15,
                'max_pos_terminals' => 2,
                'included_modules' => ['front_office', 'rooms', 'restaurant', 'kitchen'],
                'features_list' => [
                    'All features included in Starter PMS',
                    'Restaurant POS with Dine-in, Takeaway & Room Service',
                    'Live Table Floor Plan with Real-time Occupancy & Bill Timer',
                    'Live Kitchen Display System (KDS) for Chefs',
                    'Direct Room-Folio Settlement for In-House Dining',
                    'Split Bills, Tax Calculation & Kot Printing',
                ],
                'is_featured' => true,
                'badge_text' => 'Most Popular',
                'is_active' => true,
                'sort_order' => 2,
            ],
            [
                'name' => 'Grand Resort & Enterprise Suite',
                'slug' => 'grand-resort-enterprise',
                'description' => 'Unrestricted all-inclusive operations for luxury hotels, resort chains and hospitality groups. Includes inventory tracking and purchase management.',
                'monthly_price' => 8999.00,
                'yearly_price' => 89990.00, // 2 months free
                'onetime_price' => 189990.00,
                'setup_fee' => 2500.00,
                'currency' => 'INR',
                'billing_cycle' => 'ALL',
                'max_rooms' => null, // Unlimited
                'max_staff_accounts' => null, // Unlimited
                'max_pos_terminals' => null, // Unlimited
                'included_modules' => ['front_office', 'rooms', 'restaurant', 'kitchen', 'store', 'purchase'],
                'features_list' => [
                    'Unlimited Hotel Rooms, Staff Accounts & Outlets',
                    'Store Inventory Management & Low Stock Alerts',
                    'Purchase Orders, Vendor Management & GRN Verification',
                    'Multi-Hotel Group Portfolio & Executive Analytics',
                    'Real-time WhatsApp Guest Notifications',
                    'Priority 24/7 Dedicated Sales & Tech Support',
                ],
                'is_featured' => false,
                'badge_text' => 'Enterprise All-Inclusive',
                'is_active' => true,
                'sort_order' => 3,
            ],
        ];

        foreach ($packages as $pkgData) {
            SubscriptionPackage::updateOrCreate(
                ['slug' => $pkgData['slug']],
                $pkgData
            );
        }

        // Assign default packages to sample hotels if they have none
        $assignAction = app(AssignHotelPackageAction::class);
        $superAdmin = User::where('is_platform_admin', true)->first();

        $hotelA = Hotel::where('hotel_code', 'HTL-1001')->first();
        if ($hotelA && !$hotelA->activePackageSubscription()) {
            $enterprisePkg = SubscriptionPackage::where('slug', 'grand-resort-enterprise')->first();
            if ($enterprisePkg) {
                $assignAction->execute($hotelA, $enterprisePkg, [
                    'billing_cycle' => 'YEARLY',
                    'agreed_price' => 89990.00,
                    'payment_status' => 'PAID',
                    'payment_method' => 'BANK_TRANSFER',
                    'payment_reference' => 'NEFT-ANNUAL-APEX-2026',
                    'sales_notes' => 'Contract signed by Rajesh Sharma for Apex Grand Palace flagship property.',
                ], $superAdmin);
            }
        }

        $hotelB = Hotel::where('hotel_code', 'HTL-1002')->first();
        if ($hotelB && !$hotelB->activePackageSubscription()) {
            $diningPkg = SubscriptionPackage::where('slug', 'hotel-dining-pos')->first();
            if ($diningPkg) {
                $assignAction->execute($hotelB, $diningPkg, [
                    'billing_cycle' => 'MONTHLY',
                    'agreed_price' => 4499.00,
                    'payment_status' => 'PAID',
                    'payment_method' => 'UPI_QR',
                    'payment_reference' => 'UPI-SUB-OCT-1002',
                    'sales_notes' => 'Monthly billing agreement for Apex Sea Breeze Resort.',
                ], $superAdmin);
            }
        }
    }
}
