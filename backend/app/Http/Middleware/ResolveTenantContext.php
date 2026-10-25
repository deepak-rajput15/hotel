<?php

namespace App\Http\Middleware;

use App\Domain\Tenancy\Models\Hotel;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ResolveTenantContext
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (!$user) {
            return $next($request);
        }

        $hotelIdentifier = $request->header('X-Hotel-ID') 
            ?? $request->route('hotelId') 
            ?? $request->input('hotel_id');

        $hotel = null;

        if ($hotelIdentifier) {
            $hotel = \Illuminate\Support\Str::isUuid($hotelIdentifier)
                ? Hotel::where('id', $hotelIdentifier)->first()
                : Hotel::where('hotel_code', $hotelIdentifier)->first();

            if (!$hotel) {
                return response()->json([
                    'success' => false,
                    'error_code' => 'HOTEL_NOT_FOUND',
                    'message' => 'Specified hotel does not exist.',
                ], Response::HTTP_NOT_FOUND);
            }
        } elseif (!$user->isPlatformAdmin()) {
            // For single-hotel owners or staff with only 1 hotel, auto-select their hotel
            $accessibleHotels = $user->hotels;
            if ($user->isOrgOwner() && $user->organization) {
                $accessibleHotels = $user->organization->hotels;
            }

            if ($accessibleHotels->count() === 1) {
                $hotel = $accessibleHotels->first();
            }
        }

        if ($hotel) {
            // Verify access
            if (!$user->hasAccessToHotel($hotel->id)) {
                return response()->json([
                    'success' => false,
                    'error_code' => 'UNAUTHORIZED_HOTEL_ACCESS',
                    'message' => 'You do not have authorization to access this hotel.',
                ], Response::HTTP_FORBIDDEN);
            }

            // Bind current hotel globally to request and app container
            $request->attributes->set('current_hotel', $hotel);
            app()->instance('current_hotel', $hotel);
        }

        return $next($request);
    }
}
