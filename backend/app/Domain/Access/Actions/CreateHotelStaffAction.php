<?php

namespace App\Domain\Access\Actions;

use App\Domain\Access\Models\Role;
use App\Domain\Subscriptions\Actions\AssignHotelModulesAction;
use App\Domain\Tenancy\Models\Hotel;
use App\Domain\Tenancy\Models\UserHotelAccess;
use App\Models\User;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class CreateHotelStaffAction
{
    public function __construct(
        protected AssignHotelModulesAction $assignModulesAction
    ) {}

    /**
     * Create a staff user under an organization and grant them hotel access with a role.
     *
     * @throws HttpResponseException
     */
    public function execute(Hotel $hotel, array $data, ?User $actor = null): array
    {
        $role = Role::findOrFail($data['role_id']);

        // Check required module subscription for the role
        $roleModuleRequirements = [
            'front-desk' => ['front_office', 'rooms'],
            'restaurant-cashier' => ['restaurant'],
            'head-chef' => ['kitchen'],
            'storekeeper' => ['store', 'purchase'],
        ];

        $activeModules = $this->assignModulesAction->getActiveModuleCodes($hotel);

        if (isset($roleModuleRequirements[$role->slug])) {
            $required = $roleModuleRequirements[$role->slug];
            $hasAnyRequired = count(array_intersect($required, $activeModules)) > 0;

            if (!$hasAnyRequired) {
                throw new HttpResponseException(response()->json([
                    'success' => false,
                    'error_code' => 'MODULE_NOT_SUBSCRIBED',
                    'message' => "Cannot assign '{$role->name}'. Hotel '{$hotel->name}' is NOT subscribed to required module (" . implode(', ', $required) . "). Please subscribe the hotel first.",
                    'errors' => [
                        'role_id' => [
                            "Cannot assign '{$role->name}'. Hotel '{$hotel->name}' is NOT subscribed to required module (" . implode(', ', $required) . "). Please subscribe the hotel first.",
                        ],
                    ],
                ], 422));
            }
        }

        return DB::transaction(function () use ($hotel, $role, $data) {
            // Create the staff user under the organization
            $staffUser = User::create([
                'organization_id' => $hotel->organization_id,
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'password' => Hash::make($data['password']),
                'is_platform_admin' => false,
                'is_org_owner' => false,
                'status' => 'ACTIVE',
            ]);

            // Link staff to hotel with role
            $access = UserHotelAccess::create([
                'user_id' => $staffUser->id,
                'hotel_id' => $hotel->id,
                'role_id' => $role->id,
                'is_default' => true,
            ]);

            return [
                'staffUser' => $staffUser,
                'access' => $access,
                'role' => $role,
            ];
        });
    }
}

