<?php

namespace App\Http\Controllers\Api\V1\Hotel;

use App\Domain\Subscriptions\Actions\AssignHotelModulesAction;
use App\Domain\Tenancy\Models\Hotel;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HotelModuleController extends Controller
{
    public function __construct(
        protected AssignHotelModulesAction $assignModulesAction
    ) {}

    /**
     * Get list of active modules enabled for the specified or current hotel.
     */
    public function activeModules(Request $request, ?string $hotelId = null): JsonResponse
    {
        $hotel = null;

        if ($hotelId) {
            $hotel = \Illuminate\Support\Str::isUuid($hotelId)
                ? Hotel::where('id', $hotelId)->firstOrFail()
                : Hotel::where('hotel_code', $hotelId)->firstOrFail();
            if (!$request->user()->hasAccessToHotel($hotel->id)) {
                return response()->json([
                    'success' => false,
                    'error_code' => 'UNAUTHORIZED_HOTEL_ACCESS',
                    'message' => 'You do not have authorization to view modules for this hotel.',
                ], 403);
            }
        } else {
            $hotel = $request->attributes->get('current_hotel');
        }

        if (!$hotel) {
            return response()->json([
                'success' => false,
                'error_code' => 'HOTEL_REQUIRED',
                'message' => 'Please provide a hotel ID or X-Hotel-ID header.',
            ], 400);
        }

        $activeCodes = $this->assignModulesAction->getActiveModuleCodes($hotel);

        $activeSubscriptions = $hotel->activeSubscriptions()->with('module')->get();

        return response()->json([
            'success' => true,
            'hotel' => [
                'id' => $hotel->id,
                'hotel_code' => $hotel->hotel_code,
                'name' => $hotel->name,
            ],
            'active_modules' => $activeCodes,
            'modules_detail' => $activeSubscriptions->map(function ($sub) {
                return [
                    'code' => $sub->module->code,
                    'name' => $sub->module->name,
                    'description' => $sub->module->description,
                    'icon' => $sub->module->icon,
                    'expires_at' => $sub->expires_at?->toIso8601String(),
                ];
            }),
        ]);
    }
}
