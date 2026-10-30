<?php

namespace App\Domain\Finance\Services;

use App\Domain\Finance\Actions\CloseShiftAction;
use App\Domain\Finance\Actions\OpenShiftAction;
use App\Domain\Finance\Actions\RecordCashTransactionAction;
use App\Domain\Finance\Contracts\ShiftHandoverServiceInterface;
use App\Domain\Finance\Models\ShiftHandover;
use App\Domain\Tenancy\Models\Hotel;
use App\Models\User;

class ShiftHandoverService implements ShiftHandoverServiceInterface
{
    public function __construct(
        protected OpenShiftAction $openShiftAction,
        protected RecordCashTransactionAction $recordCashTransactionAction,
        protected CloseShiftAction $closeShiftAction,
    ) {}

    public function openShift(Hotel $hotel, array $data, User $user): ShiftHandover
    {
        return $this->openShiftAction->execute($hotel, $data, $user);
    }

    public function recordCashTransaction(ShiftHandover $shift, array $data, User $user): array
    {
        return $this->recordCashTransactionAction->execute($shift, $data, $user);
    }

    public function closeShift(ShiftHandover $shift, array $data, ?User $actor = null): array
    {
        return $this->closeShiftAction->execute($shift, $data, $actor);
    }
}

