<?php

namespace App\Domain\Tenancy\Actions;

use App\Domain\Tenancy\Models\Hotel;
use App\Domain\Tenancy\Models\Organization;

class GenerateUniqueCodeAction
{
    /**
     * Generate unique Organization code like ORG-1001, ORG-1002...
     * Database-agnostic (MySQL, PostgreSQL, SQLite).
     */
    public function forOrganization(): string
    {
        $orgCodes = Organization::withTrashed()
            ->where('org_code', 'LIKE', 'ORG-%')
            ->pluck('org_code');

        if ($orgCodes->isEmpty()) {
            return 'ORG-1001';
        }

        $maxNumber = 1000;
        foreach ($orgCodes as $code) {
            $num = (int) substr($code, 4);
            if ($num > $maxNumber) {
                $maxNumber = $num;
            }
        }

        return 'ORG-' . ($maxNumber + 1);
    }

    /**
     * Generate unique Hotel code like HTL-1001, HTL-1002...
     * Database-agnostic (MySQL, PostgreSQL, SQLite).
     */
    public function forHotel(): string
    {
        $hotelCodes = Hotel::withTrashed()
            ->where('hotel_code', 'LIKE', 'HTL-%')
            ->pluck('hotel_code');

        if ($hotelCodes->isEmpty()) {
            return 'HTL-1001';
        }

        $maxNumber = 1000;
        foreach ($hotelCodes as $code) {
            $num = (int) substr($code, 4);
            if ($num > $maxNumber) {
                $maxNumber = $num;
            }
        }

        return 'HTL-' . ($maxNumber + 1);
    }
}
