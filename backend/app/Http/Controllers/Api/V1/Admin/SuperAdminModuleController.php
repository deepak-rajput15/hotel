<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\Subscriptions\Actions\AssignHotelModulesAction;
use App\Domain\Subscriptions\Models\Module;
use App\Domain\Tenancy\Models\Hotel;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SuperAdminModuleController extends Controller
{
    public function __construct(
        protected AssignHotelModulesAction $assignModulesAction
    ) {}

    /**
     * List all available platform modules.
     */
    public function index(): JsonResponse
    {
        $modules = Module::orderBy('sort_order', 'asc')->get();

        return response()->json([
            'success' => true,
            'data' => $modules,
        ]);
    }

    /**
     * Update module subscriptions for a hotel (Toggle modules on/off with validity).
     *
     * Example Request Body:
     * {
     *   "modules": {
     *     "front_office": { "enabled": true, "expires_at": "2026-12-31" },
     *     "rooms": { "enabled": true, "expires_at": null },
     *     "restaurant": { "enabled": false },
     *     "kitchen": { "enabled": false },
     *     "store": { "enabled": true },
     *     "purchase": { "enabled": true }
     *   }
     * }
     */
    public function updateHotelModules(Request $request, string $hotelId): JsonResponse
    {
        $hotel = Hotel::findOrFail($hotelId);

        $validated = $request->validate([
            'modules' => 'required|array',
        ]);

        $activeModuleCodes = $this->assignModulesAction->execute($hotel, $validated['modules']);

        // Return updated hotel with full module subscription details
        $hotel->load(['subscriptions.module']);

        return response()->json([
            'success' => true,
            'message' => "Module subscriptions for hotel '{$hotel->name}' ({$hotel->hotel_code}) updated successfully.",
            'active_modules' => $activeModuleCodes,
            'subscriptions' => $hotel->subscriptions->map(function ($sub) {
                return [
                    'module_code' => $sub->module->code,
                    'module_name' => $sub->module->name,
                    'status' => $sub->status,
                    'is_active' => $sub->isActive(),
                    'starts_at' => $sub->starts_at?->toIso8601String(),
                    'expires_at' => $sub->expires_at?->toIso8601String(),
                ];
            }),
        ]);
    }
}
