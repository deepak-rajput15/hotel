<?php

namespace App\Domain\Tenancy\Actions;

use App\Domain\Tenancy\Models\Organization;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class CreateOrganizationAction
{
    public function __construct(
        protected GenerateUniqueCodeAction $codeGenerator
    ) {}

    /**
     * Onboard a new customer / organization and create its primary owner account.
     */
    public function execute(array $data): array
    {
        return DB::transaction(function () use ($data) {
            $orgCode = $data['org_code'] ?? $this->codeGenerator->forOrganization();

            $organization = Organization::create([
                'org_code' => $orgCode,
                'name' => $data['name'],
                'billing_email' => $data['billing_email'],
                'phone' => $data['phone'] ?? null,
                'tax_number' => $data['tax_number'] ?? null,
                'status' => 'ACTIVE',
            ]);

            // Create Owner user account
            $owner = User::create([
                'organization_id' => $organization->id,
                'name' => $data['owner_name'],
                'email' => $data['owner_email'],
                'phone' => $data['owner_phone'] ?? $data['phone'] ?? null,
                'password' => Hash::make($data['owner_password'] ?? Str::random(12)),
                'is_org_owner' => true,
                'is_platform_admin' => false,
                'status' => 'ACTIVE',
            ]);

            return [
                'organization' => $organization,
                'owner' => $owner,
            ];
        });
    }
}
