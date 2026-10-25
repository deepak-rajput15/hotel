<?php

namespace App\Domain\Tenancy\Actions;

use App\Domain\Access\Models\Role;
use App\Domain\Subscriptions\Actions\AssignHotelModulesAction;
use App\Domain\Tenancy\Models\Hotel;
use App\Domain\Tenancy\Models\Organization;
use App\Domain\Tenancy\Models\UserHotelAccess;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CreateHotelAction
{
    public function __construct(
        protected GenerateUniqueCodeAction $codeGenerator,
        protected AssignHotelModulesAction $assignModulesAction
    ) {}

    /**
     * Create a new hotel under an organization.
     */
    public function execute(Organization $organization, array $data): Hotel
    {
        return DB::transaction(function () use ($organization, $data) {
            $hotelCode = $data['hotel_code'] ?? $this->codeGenerator->forHotel();

            $baseSlug = Str::slug($data['name']);
            $slug = $baseSlug;
            $counter = 1;
            while (Hotel::where('slug', $slug)->exists()) {
                $slug = "{$baseSlug}-" . ($counter++);
            }

            $hotel = Hotel::create([
                'organization_id' => $organization->id,
                'hotel_code' => $hotelCode,
                'name' => $data['name'],
                'slug' => $slug,
                'email' => $data['email'] ?? $organization->billing_email,
                'phone' => $data['phone'] ?? $organization->phone,
                'address' => $data['address'] ?? null,
                'city' => $data['city'] ?? null,
                'state' => $data['state'] ?? null,
                'country' => $data['country'] ?? 'India',
                'timezone' => $data['timezone'] ?? 'Asia/Kolkata',
                'currency' => $data['currency'] ?? 'INR',
                'status' => 'ACTIVE',
                'settings' => $data['settings'] ?? [],
            ]);

            // If owner users exist for this org, attach the primary owner
            $owner = $organization->users()->where('is_org_owner', true)->first();
            if ($owner) {
                $ownerRole = Role::where('slug', 'hotel-owner')->first();
                $isFirstHotel = $organization->hotels()->count() === 1;

                UserHotelAccess::firstOrCreate(
                    [
                        'user_id' => $owner->id,
                        'hotel_id' => $hotel->id,
                    ],
                    [
                        'role_id' => $ownerRole?->id,
                        'is_default' => $isFirstHotel,
                    ]
                );
            }

            // Assign initial module subscriptions if provided
            if (!empty($data['modules']) && is_array($data['modules'])) {
                $this->assignModulesAction->execute($hotel, $data['modules']);
            }

            return $hotel->fresh(['organization', 'subscriptions.module']);
        });
    }
}
