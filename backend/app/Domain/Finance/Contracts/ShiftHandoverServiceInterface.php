<?php

namespace App\Domain\Finance\Contracts;

use App\Domain\Finance\Models\ShiftHandover;
use App\Domain\Tenancy\Models\Hotel;
use App\Models\User;

interface ShiftHandoverServiceInterface
{
    public function openShift(Hotel $hotel, array $data, User $user): ShiftHandover;

    public function recordCashTransaction(ShiftHandover $shift, array $data, User $user): array;

    public function closeShift(ShiftHandover $shift, array $data, ?User $actor = null): array;
}

