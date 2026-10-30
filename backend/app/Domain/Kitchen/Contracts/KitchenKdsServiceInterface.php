<?php

namespace App\Domain\Kitchen\Contracts;

use App\Domain\Restaurant\Models\RestaurantOrder;
use App\Domain\Restaurant\Models\RestaurantOrderItem;

interface KitchenKdsServiceInterface
{
    public function updateItemStatus(RestaurantOrderItem $item, string $status): RestaurantOrderItem;

    public function updateKotStatus(RestaurantOrder $order, string $kotNumber, string $status): int;
}

