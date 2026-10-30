<?php

namespace App\Domain\Purchase\Contracts;

use App\Domain\Purchase\Models\PurchaseOrder;
use App\Domain\Tenancy\Models\Hotel;
use App\Models\User;

interface PurchaseOrderServiceInterface
{
    public function createPurchaseOrder(Hotel $hotel, array $data, ?User $actor = null): PurchaseOrder;

    public function receiveGoods(PurchaseOrder $order, array $data, ?User $actor = null): array;
}

