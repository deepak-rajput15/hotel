<?php

namespace App\Domain\Access\Contracts;

use App\Domain\Tenancy\Models\Hotel;
use App\Models\User;

interface HotelStaffServiceInterface
{
    public function createStaff(Hotel $hotel, array $data, ?User $actor = null): array;
}

