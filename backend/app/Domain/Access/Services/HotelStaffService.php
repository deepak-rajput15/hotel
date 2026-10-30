<?php

namespace App\Domain\Access\Services;

use App\Domain\Access\Actions\CreateHotelStaffAction;
use App\Domain\Access\Contracts\HotelStaffServiceInterface;
use App\Domain\Tenancy\Models\Hotel;
use App\Models\User;

class HotelStaffService implements HotelStaffServiceInterface
{
    public function __construct(
        protected CreateHotelStaffAction $createStaffAction
    ) {}

    public function createStaff(Hotel $hotel, array $data, ?User $actor = null): array
    {
        return $this->createStaffAction->execute($hotel, $data, $actor);
    }
}

