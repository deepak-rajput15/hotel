<?php

namespace App\Domain\Kitchen\Actions;

use App\Domain\Restaurant\Models\RestaurantOrder;
use App\Domain\Restaurant\Models\RestaurantOrderItem;

class UpdateKotStatusAction
{
    /**
     * Batch update all items of a KOT ticket.
     */
    public function execute(RestaurantOrder $order, string $kotNumber, string $status): int
    {
        return RestaurantOrderItem::where('order_id', $order->id)
            ->where('kot_number', $kotNumber)
            ->update(['status' => $status]);
    }
}

