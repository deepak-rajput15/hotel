<?php

namespace App\Domain\Kitchen\Actions;

use App\Domain\Restaurant\Models\RestaurantOrder;
use App\Domain\Restaurant\Models\RestaurantOrderItem;
use App\Domain\Restaurant\Models\RestaurantTable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdateKitchenItemStatusAction
{
    /**
     * Update kitchen item status or cancel item with order recalculation.
     *
     * @throws ValidationException
     */
    public function execute(RestaurantOrderItem $item, string $status): RestaurantOrderItem
    {
        return DB::transaction(function () use ($item, $status) {
            $itemLocked = RestaurantOrderItem::where('id', $item->id)->lockForUpdate()->firstOrFail();

            if ($status === 'CANCELLED') {
                if ($itemLocked->order && $itemLocked->order->status === RestaurantOrder::STATUS_SETTLED) {
                    throw ValidationException::withMessages([
                        'status' => 'Cannot cancel item on an already settled order.',
                    ]);
                }

                if ($itemLocked->status === RestaurantOrderItem::STATUS_SERVED) {
                    throw ValidationException::withMessages([
                        'status' => 'Cannot cancel item after it has already been SERVED to the guest at table. Contact Manager for bill voids.',
                    ]);
                }

                $itemLocked->update(['status' => 'CANCELLED']);

                // Recalculate order subtotal and tax on remaining active items
                if ($itemLocked->order) {
                    $order = RestaurantOrder::where('id', $itemLocked->order->id)->lockForUpdate()->first();
                    $activeItems = $order->items()->where('status', '!=', 'CANCELLED')->get();

                    if ($activeItems->isEmpty()) {
                        // All items cancelled: cancel order and release table
                        $order->update([
                            'status' => RestaurantOrder::STATUS_CANCELLED,
                            'subtotal' => 0,
                            'tax_amount' => 0,
                            'grand_total' => 0,
                        ]);

                        if ($order->table) {
                            $order->table->update(['status' => RestaurantTable::STATUS_AVAILABLE]);
                        }
                    } else {
                        $newSubtotal = (float) $activeItems->sum('total_price');
                        $newTax = (float) $activeItems->sum(function ($it) {
                            $gst = (float) ($it->menuItem?->gst_percentage ?? 5.00);
                            return round(($it->total_price * $gst) / 100, 2);
                        });
                        $newGrandTotal = max(0, $newSubtotal + $newTax - (float) $order->discount_amount);

                        $order->update([
                            'subtotal' => $newSubtotal,
                            'tax_amount' => $newTax,
                            'grand_total' => $newGrandTotal,
                        ]);
                    }
                }

                return $itemLocked;
            }

            $itemLocked->update(['status' => $status]);
            return $itemLocked;
        });
    }
}
