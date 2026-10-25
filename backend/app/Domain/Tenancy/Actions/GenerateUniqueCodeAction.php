<?php

namespace App\Domain\Tenancy\Actions;

use App\Domain\Tenancy\Models\Hotel;
use App\Domain\Tenancy\Models\Organization;

class GenerateUniqueCodeAction
{
    /**
     * Generate unique Organization code like ORG-1001, ORG-1002...
     */
    public function forOrganization(): string
    {
        $lastOrg = Organization::withTrashed()
            ->where('org_code', 'LIKE', 'ORG-%')
            ->orderByRaw("CAST(SUBSTRING(org_code FROM 5) AS INTEGER) DESC")
            ->first();

        if (!$lastOrg) {
            return 'ORG-1001';
        }

        $lastNumber = (int) substr($lastOrg->org_code, 4);
        $nextNumber = max($lastNumber + 1, 1001);

        return 'ORG-' . $nextNumber;
    }

    /**
     * Generate unique Hotel code like HTL-1001, HTL-1002...
     */
    public function forHotel(): string
    {
        $lastHotel = Hotel::withTrashed()
            ->where('hotel_code', 'LIKE', 'HTL-%')
            ->orderByRaw("CAST(SUBSTRING(hotel_code FROM 5) AS INTEGER) DESC")
            ->first();

        if (!$lastHotel) {
            return 'HTL-1001';
        }

        $lastNumber = (int) substr($lastHotel->hotel_code, 4);
        $nextNumber = max($lastNumber + 1, 1001);

        return 'HTL-' . $nextNumber;
    }
}
