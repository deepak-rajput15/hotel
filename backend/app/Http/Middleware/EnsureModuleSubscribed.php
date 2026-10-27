<?php

namespace App\Http\Middleware;

use App\Domain\Subscriptions\Actions\AssignHotelModulesAction;
use App\Domain\Tenancy\Models\Hotel;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureModuleSubscribed
{
    public function __construct(
        protected AssignHotelModulesAction $assignModulesAction
    ) {}

    /**
     * Handle an incoming request and verify module subscription.
     */
    public function handle(Request $request, Closure $next, string $moduleCode): Response
    {
        $hotel = $request->attributes->get('current_hotel') 
            ?? (app()->bound('current_hotel') ? app('current_hotel') : null);

        if (!$hotel instanceof Hotel) {
            return response()->json([
                'success' => false,
                'error_code' => 'HOTEL_CONTEXT_REQUIRED',
                'message' => 'This operation requires an active hotel context (pass X-Hotel-ID header).',
            ], Response::HTTP_BAD_REQUEST);
        }

        $activeModules = $this->assignModulesAction->getActiveModuleCodes($hotel);

        $requiredCodes = array_map('trim', explode(',', $moduleCode));
        $hasAny = count(array_intersect($requiredCodes, $activeModules)) > 0;

        if (!$hasAny) {
            return response()->json([
                'success' => false,
                'error_code' => 'MODULE_NOT_SUBSCRIBED',
                'message' => "Hotel '{$hotel->name}' ({$hotel->hotel_code}) does not have an active subscription for the required module (" . implode(', ', $requiredCodes) . ").",
                'required_module' => $moduleCode,
                'hotel_code' => $hotel->hotel_code,
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
