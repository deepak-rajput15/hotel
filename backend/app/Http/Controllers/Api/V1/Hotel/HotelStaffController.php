<?php

namespace App\Http\Controllers\Api\V1\Hotel;

use App\Domain\Access\Contracts\HotelStaffServiceInterface;
use App\Domain\Access\Models\Role;
use App\Domain\Tenancy\Models\Hotel;
use App\Domain\Tenancy\Models\UserHotelAccess;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Hotel\CreateHotelStaffRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class HotelStaffController extends Controller
{
    public function __construct(
        protected HotelStaffServiceInterface $hotelStaffService
    ) {}

    /**
     * List staff users assigned to a hotel or across the organization.
     */
    public function index(Request $request, string $hotelId): JsonResponse
    {
        $user = $request->user();

        $query = UserHotelAccess::with(['user', 'hotel', 'role']);

        if ($hotelId === 'ALL' || $hotelId === 'portfolio') {
            if ($user->isPlatformAdmin()) {
                // All staff
            } elseif ($user->isOrgOwner() && $user->organization_id) {
                $orgHotelIds = Hotel::where('organization_id', $user->organization_id)->pluck('id');
                $query->whereIn('hotel_id', $orgHotelIds);
            } else {
                $userHotelIds = $user->hotels()->pluck('hotels.id');
                $query->whereIn('hotel_id', $userHotelIds);
            }
        } else {
            $hotel = Str::isUuid($hotelId)
                ? Hotel::where('id', $hotelId)->first()
                : Hotel::where('hotel_code', $hotelId)->first();

            if (!$hotel) {
                return response()->json(['success' => false, 'message' => 'Hotel not found'], 404);
            }

            if (!$user->hasAccessToHotel($hotel->id)) {
                return response()->json(['success' => false, 'message' => 'Access denied to this hotel.'], 403);
            }

            $query->where('hotel_id', $hotel->id);
        }

        $accessList = $query->latest()->get();

        $staff = $accessList->map(function ($access) {
            return [
                'access_id' => $access->id,
                'user_id' => $access->user?->id,
                'name' => $access->user?->name,
                'email' => $access->user?->email,
                'phone' => $access->user?->phone,
                'status' => $access->user?->status,
                'hotel' => [
                    'id' => $access->hotel?->id,
                    'hotel_code' => $access->hotel?->hotel_code,
                    'name' => $access->hotel?->name,
                ],
                'role' => [
                    'id' => $access->role?->id,
                    'name' => $access->role?->name,
                    'slug' => $access->role?->slug,
                ],
                'created_at' => $access->created_at->toIso8601String(),
            ];
        });

        // Available assignable roles (excluding platform admin and hotel owner)
        $roles = Role::whereNotIn('slug', ['super-admin', 'hotel-owner'])
            ->select('id', 'name', 'slug', 'description')
            ->get();

        return response()->json([
            'success' => true,
            'staff' => $staff,
            'available_roles' => $roles,
        ]);
    }

    /**
     * Create a staff user and grant them module-specific role access to a hotel.
     */
    public function store(CreateHotelStaffRequest $request, string $hotelId): JsonResponse
    {
        $user = $request->user();

        $hotelTargetId = $request->input('hotel_id', $hotelId);
        $hotel = Str::isUuid($hotelTargetId)
            ? Hotel::where('id', $hotelTargetId)->first()
            : Hotel::where('hotel_code', $hotelTargetId)->first();

        if (!$hotel) {
            return response()->json(['success' => false, 'message' => 'Target hotel property not found.'], 404);
        }

        if (!$user->hasAccessToHotel($hotel->id)) {
            return response()->json(['success' => false, 'message' => 'You do not have administrative permission for this hotel property.'], 403);
        }

        // Only Organization Owner, Platform Super Admin, or assigned General Manager can create staff
        $userRole = $user->hotelAccess()->where('hotel_id', $hotel->id)->with('role')->first()?->role?->slug;
        $isAuthorized = $user->isPlatformAdmin() || $user->isOrgOwner() || $userRole === 'general-manager';

        if (!$isAuthorized) {
            return response()->json([
                'success' => false,
                'error_code' => 'FORBIDDEN_STAFF_MANAGEMENT',
                'message' => 'Only the Hotel Owner and General Manager have permission to manage hotel staff.',
            ], 403);
        }

        $result = $this->hotelStaffService->createStaff($hotel, $request->validated(), $user);
        $staffUser = $result['staffUser'];
        $access = $result['access'];
        $role = $result['role'];

        return response()->json([
            'success' => true,
            'message' => "Staff user '{$staffUser->name}' created successfully with role '{$role->name}' for {$hotel->name}.",
            'staff' => [
                'access_id' => $access->id,
                'user_id' => $staffUser->id,
                'name' => $staffUser->name,
                'email' => $staffUser->email,
                'hotel' => [
                    'id' => $hotel->id,
                    'hotel_code' => $hotel->hotel_code,
                    'name' => $hotel->name,
                ],
                'role' => [
                    'id' => $role->id,
                    'name' => $role->name,
                    'slug' => $role->slug,
                ],
            ],
        ], 201);
    }
}
