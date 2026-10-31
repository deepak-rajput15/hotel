<?php

namespace App\Domain\Subscriptions\Actions;

use App\Domain\Subscriptions\Models\HotelModuleSubscription;
use App\Domain\Subscriptions\Models\HotelSubscription;
use App\Domain\Subscriptions\Models\Module;
use App\Domain\Subscriptions\Models\SubscriptionPackage;
use App\Domain\Tenancy\Models\Hotel;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class AssignHotelPackageAction
{
    /**
     * Assign a SaaS Subscription Package to a Hotel Property (Company Sales Team Action).
     */
    public function execute(Hotel $hotel, SubscriptionPackage $package, array $data, ?User $actor = null): HotelSubscription
    {
        return DB::transaction(function () use ($hotel, $package, $data, $actor) {
            $billingCycle = strtoupper($data['billing_cycle'] ?? 'MONTHLY');

            // 1. Determine Agreed Price based on cycle if not specified
            $agreedPrice = isset($data['agreed_price']) && is_numeric($data['agreed_price'])
                ? (float) $data['agreed_price']
                : match ($billingCycle) {
                    'YEARLY' => (float) $package->yearly_price,
                    'ONETIME' => (float) ($package->onetime_price ?? $package->yearly_price * 3),
                    default => (float) $package->monthly_price,
                };

            // 2. Compute Expiry Date
            if (!empty($data['expires_at'])) {
                $expiresAt = Carbon::parse($data['expires_at']);
            } elseif ($billingCycle === 'MONTHLY') {
                $expiresAt = now()->addMonth();
            } elseif ($billingCycle === 'YEARLY') {
                $expiresAt = now()->addYear();
            } elseif ($billingCycle === 'ONETIME') {
                $expiresAt = null; // Lifetime / perpetual
            } elseif ($billingCycle === 'TRIAL') {
                $expiresAt = now()->addDays(14);
            } else {
                $expiresAt = now()->addMonth();
            }

            // 3. Mark previous active contracts as superseded
            HotelSubscription::where('hotel_id', $hotel->id)
                ->where('status', 'ACTIVE')
                ->update(['status' => 'SUPERSEDED']);

            // 4. Create new Hotel Subscription Contract
            $subscription = HotelSubscription::create([
                'hotel_id' => $hotel->id,
                'package_id' => $package->id,
                'plan_name' => $package->name,
                'billing_cycle' => $billingCycle,
                'agreed_price' => $agreedPrice,
                'currency' => $data['currency'] ?? $package->currency ?? 'INR',
                'status' => 'ACTIVE',
                'starts_at' => now(),
                'expires_at' => $expiresAt,
                'payment_status' => $data['payment_status'] ?? 'PAID',
                'payment_method' => $data['payment_method'] ?? 'BANK_TRANSFER',
                'payment_reference' => $data['payment_reference'] ?? null,
                'sales_notes' => $data['sales_notes'] ?? null,
                'assigned_by_user_id' => $actor?->id,
            ]);

            // 5. Auto-synchronize Hotel Module Subscriptions for all modules in this package
            $includedCodes = is_array($package->included_modules) ? $package->included_modules : [];
            $allModules = Module::all();

            foreach ($allModules as $module) {
                $isIncluded = in_array($module->code, $includedCodes, true);

                if ($isIncluded) {
                    HotelModuleSubscription::updateOrCreate(
                        [
                            'hotel_id' => $hotel->id,
                            'module_id' => $module->id,
                        ],
                        [
                            'status' => 'ACTIVE',
                            'starts_at' => now(),
                            'expires_at' => $expiresAt,
                        ]
                    );
                } else {
                    // Turn off modules that are not part of the newly assigned package
                    HotelModuleSubscription::updateOrCreate(
                        [
                            'hotel_id' => $hotel->id,
                            'module_id' => $module->id,
                        ],
                        [
                            'status' => 'INACTIVE',
                            'expires_at' => now(),
                        ]
                    );
                }
            }

            Cache::forget("hotel_{$hotel->id}_active_modules");

            return $subscription->load(['package', 'hotel.organization', 'assignedByUser:id,name,email']);
        });
    }
}
