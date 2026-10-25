<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Domain\Subscriptions\Actions\AssignHotelModulesAction;
use App\Domain\Tenancy\Models\Hotel;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(
        protected AssignHotelModulesAction $assignModulesAction
    ) {}

    /**
     * Authenticate user and issue Sanctum token.
     */
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
            'device_name' => 'nullable|string',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid credentials provided.'],
            ]);
        }

        if ($user->status !== 'ACTIVE') {
            return response()->json([
                'success' => false,
                'error_code' => 'ACCOUNT_INACTIVE',
                'message' => 'Your account is inactive or suspended. Please contact platform support.',
            ], 403);
        }

        $tokenName = $validated['device_name'] ?? 'web-token';
        $token = $user->createToken($tokenName)->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'token' => $token,
            'user' => $this->formatUserResponse($user),
        ]);
    }

    /**
     * Get authenticated user profile and accessible hotels.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $currentHotel = $request->attributes->get('current_hotel');

        $activeModules = [];
        if ($currentHotel instanceof Hotel) {
            $activeModules = $this->assignModulesAction->getActiveModuleCodes($currentHotel);
        }

        return response()->json([
            'success' => true,
            'user' => $this->formatUserResponse($user),
            'current_hotel' => $currentHotel ? [
                'id' => $currentHotel->id,
                'hotel_code' => $currentHotel->hotel_code,
                'name' => $currentHotel->name,
                'city' => $currentHotel->city,
                'status' => $currentHotel->status,
                'active_modules' => $activeModules,
            ] : null,
        ]);
    }

    /**
     * Revoke current access token.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully',
        ]);
    }

    protected function formatUserResponse(User $user): array
    {
        $hotels = [];

        if ($user->isPlatformAdmin()) {
            $hotels = Hotel::select('id', 'hotel_code', 'name', 'status')->get();
        } elseif ($user->isOrgOwner() && $user->organization) {
            $hotels = $user->organization->hotels()
                ->select('id', 'hotel_code', 'name', 'status')
                ->get();
        } else {
            $hotels = $user->hotels()
                ->select('hotels.id', 'hotels.hotel_code', 'hotels.name', 'hotels.status')
                ->get();
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'is_platform_admin' => $user->isPlatformAdmin(),
            'is_org_owner' => $user->isOrgOwner(),
            'organization' => $user->organization ? [
                'id' => $user->organization->id,
                'org_code' => $user->organization->org_code,
                'name' => $user->organization->name,
            ] : null,
            'accessible_hotels' => $hotels,
        ];
    }
}
