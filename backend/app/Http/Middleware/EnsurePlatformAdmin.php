<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePlatformAdmin
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (!$user || !$user->isPlatformAdmin()) {
            return response()->json([
                'success' => false,
                'error_code' => 'PLATFORM_ADMIN_REQUIRED',
                'message' => 'Access restricted to platform super-administrators only.',
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
