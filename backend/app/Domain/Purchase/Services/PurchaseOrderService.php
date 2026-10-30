<?php

namespace App\Domain\Purchase\Services;

use App\Domain\Purchase\Actions\CreatePurchaseOrderAction;
use App\Domain\Purchase\Actions\ReceiveGoodsGrnAction;
use App\Domain\Purchase\Contracts\PurchaseOrderServiceInterface;
use App\Domain\Purchase\Models\PurchaseOrder;
use App\Domain\Tenancy\Models\Hotel;
use App\Models\User;

class PurchaseOrderService implements PurchaseOrderServiceInterface
{
    public function __construct(
        protected CreatePurchaseOrderAction $createPoAction,
        protected ReceiveGoodsGrnAction $receiveGoodsGrnAction,
    ) {}

    public function createPurchaseOrder(Hotel $hotel, array $data, ?User $actor = null): PurchaseOrder
    {
        return $this->createPoAction->execute($hotel, $data, $actor);
    }

    public function receiveGoods(PurchaseOrder $order, array $data, ?User $actor = null): array
    {
        return $this->receiveGoodsGrnAction->execute($order, $data, $actor);
    }
}

