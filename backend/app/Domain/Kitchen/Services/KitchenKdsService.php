<?php

namespace App\Domain\Kitchen\Services;

use App\Domain\Kitchen\Actions\UpdateKitchenItemStatusAction;
use App\Domain\Kitchen\Actions\UpdateKotStatusAction;
use App\Domain\Kitchen\Contracts\KitchenKdsServiceInterface;
use App\Domain\Restaurant\Models\RestaurantOrder;
use App\Domain\Restaurant\Models\RestaurantOrderItem;

class KitchenKdsService implements KitchenKdsServiceInterface
{
    public function __construct(
        protected UpdateKitchenItemStatusAction $updateItemStatusAction,
        protected UpdateKotStatusAction $updateKotStatusAction,
    ) {}

    public function updateItemStatus(RestaurantOrderItem $item, string $status): RestaurantOrderItem
    {
        return $this->updateItemStatusAction->execute($item, $status);
    }

    public function updateKotStatus(RestaurantOrder $order, string $kotNumber, string $status): int
    {
        return $this->updateKotStatusAction->execute($order, $kotNumber, $status);
    }
}

