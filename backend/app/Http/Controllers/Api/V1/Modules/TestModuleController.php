<?php

namespace App\Http\Controllers\Api\V1\Modules;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TestModuleController extends Controller
{
    /**
     * Protected Front Office test endpoint.
     */
    public function frontOfficeDashboard(Request $request): JsonResponse
    {
        $hotel = $request->attributes->get('current_hotel');

        return response()->json([
            'success' => true,
            'module' => 'front_office',
            'message' => "Front Office module operational data accessed successfully for {$hotel->name} ({$hotel->hotel_code}).",
            'hotel_id' => $hotel->id,
            'hotel_code' => $hotel->hotel_code,
        ]);
    }

    /**
     * Protected Restaurant test endpoint.
     */
    public function restaurantOrders(Request $request): JsonResponse
    {
        $hotel = $request->attributes->get('current_hotel');

        return response()->json([
            'success' => true,
            'module' => 'restaurant',
            'message' => "Restaurant POS orders accessed successfully for {$hotel->name} ({$hotel->hotel_code}).",
            'hotel_id' => $hotel->id,
            'hotel_code' => $hotel->hotel_code,
        ]);
    }
}
