<?php

namespace App\Domain\FrontOffice\Services;

use App\Domain\FrontOffice\Actions\ClaimLostItemAction;
use App\Domain\FrontOffice\Actions\DisposeLostItemAction;
use App\Domain\FrontOffice\Actions\LogLostItemAction;
use App\Domain\FrontOffice\Contracts\LostAndFoundServiceInterface;
use App\Domain\FrontOffice\Models\LostAndFoundItem;
use App\Domain\Tenancy\Models\Hotel;
use App\Models\User;

class LostAndFoundService implements LostAndFoundServiceInterface
{
    public function __construct(
        protected LogLostItemAction $logLostItemAction,
        protected ClaimLostItemAction $claimLostItemAction,
        protected DisposeLostItemAction $disposeLostItemAction,
    ) {}

    public function logItem(Hotel $hotel, array $data, ?User $actor = null): LostAndFoundItem
    {
        return $this->logLostItemAction->execute($hotel, $data, $actor);
    }

    public function claimItem(Hotel $hotel, string $itemId, array $data): LostAndFoundItem
    {
        return $this->claimLostItemAction->execute($hotel, $itemId, $data);
    }

    public function disposeItem(Hotel $hotel, string $itemId, array $data, ?User $actor = null): LostAndFoundItem
    {
        return $this->disposeLostItemAction->execute($hotel, $itemId, $data, $actor);
    }
}

