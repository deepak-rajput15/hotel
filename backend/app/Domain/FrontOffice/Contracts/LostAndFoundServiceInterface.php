<?php

namespace App\Domain\FrontOffice\Contracts;

use App\Domain\FrontOffice\Models\LostAndFoundItem;
use App\Domain\Tenancy\Models\Hotel;
use App\Models\User;

interface LostAndFoundServiceInterface
{
    public function logItem(Hotel $hotel, array $data, ?User $actor = null): LostAndFoundItem;

    public function claimItem(Hotel $hotel, string $itemId, array $data): LostAndFoundItem;

    public function disposeItem(Hotel $hotel, string $itemId, array $data, ?User $actor = null): LostAndFoundItem;
}

