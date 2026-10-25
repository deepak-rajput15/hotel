<?php

namespace App\Domain\Subscriptions\Actions;

use App\Domain\Subscriptions\Models\HotelModuleSubscription;
use App\Domain\Subscriptions\Models\Module;
use App\Domain\Tenancy\Models\Hotel;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class AssignHotelModulesAction
{
    /**
     * Synchronize or update module subscriptions for a hotel.
     *
     * @param Hotel $hotel
     * @param array $modules List of module codes OR associative array [ 'module_code' => [ 'enabled' => true, 'expires_at' => ... ] ]
     * @return array
     */
    public function execute(Hotel $hotel, array $modules): array
    {
        return DB::transaction(function () use ($hotel, $modules) {
            $allModules = Module::all()->keyBy('code');

            foreach ($allModules as $code => $module) {
                $isEnabled = false;
                $status = 'INACTIVE';
                $expiresAt = null;
                $settings = [];

                if (isset($modules[$code])) {
                    $config = $modules[$code];
                    if (is_array($config)) {
                        $isEnabled = $config['enabled'] ?? ($config['status'] ?? '') === 'ACTIVE';
                        $status = $isEnabled ? 'ACTIVE' : ($config['status'] ?? 'INACTIVE');
                        $expiresAt = !empty($config['expires_at']) ? Carbon::parse($config['expires_at']) : null;
                        $settings = $config['settings'] ?? [];
                    } elseif (is_bool($config)) {
                        $isEnabled = $config;
                        $status = $isEnabled ? 'ACTIVE' : 'INACTIVE';
                    }
                } elseif (in_array($code, $modules, true)) {
                    // Sequential list of enabled module codes e.g. ['front_office', 'rooms']
                    $isEnabled = true;
                    $status = 'ACTIVE';
                }

                HotelModuleSubscription::updateOrCreate(
                    [
                        'hotel_id' => $hotel->id,
                        'module_id' => $module->id,
                    ],
                    [
                        'status' => $status,
                        'starts_at' => now(),
                        'expires_at' => $expiresAt,
                        'settings' => $settings,
                    ]
                );
            }

            // Invalidate cache immediately for zero latency
            Cache::forget("hotel:{$hotel->id}:active_modules");

            return $this->getActiveModuleCodes($hotel);
        });
    }

    /**
     * Get list of active module codes for a hotel (cached).
     */
    public function getActiveModuleCodes(Hotel $hotel): array
    {
        return Cache::remember("hotel:{$hotel->id}:active_modules", 3600, function () use ($hotel) {
            return HotelModuleSubscription::where('hotel_id', $hotel->id)
                ->where('status', 'ACTIVE')
                ->where(function ($q) {
                    $q->whereNull('expires_at')
                        ->orWhere('expires_at', '>', now());
                })
                ->with('module')
                ->get()
                ->pluck('module.code')
                ->filter()
                ->values()
                ->toArray();
        });
    }
}
