<?php

namespace App\Domain\Restaurant\Actions;

use App\Domain\Restaurant\Models\RestaurantOrder;
use App\Domain\Restaurant\Models\RestaurantOrderItem;
use App\Domain\Tenancy\Models\Hotel;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AddRestaurantOrderItemsAction
{
    /**
     * Add items to an active restaurant order with incremental KOT generation.
     *
     * @throws ValidationException
     */
    public function execute(RestaurantOrder $order, array $data, ?User $actor = null): RestaurantOrder
    {
        if (in_array($order->status, [RestaurantOrder::STATUS_SETTLED, RestaurantOrder::STATUS_CANCELLED], true)) {
            throw ValidationException::withMessages([
                'status' => "Cannot add items to an order that is {$order->status}.",
            ]);
        }

        return DB::transaction(function () use ($order, $data) {
            $hotel = $order->hotel;

            // Find next KOT number
            $lastKot = $order->items()->orderBy('kot_number', 'desc')->value('kot_number');
            $kotIndex = 1;
            if ($lastKot && preg_match('/KOT-(\d+)/', $lastKot, $matches)) {
                $kotIndex = ((int) $matches[1]) + 1;
            }
            $kotNumber = 'KOT-' . str_pad($kotIndex, 3, '0', STR_PAD_LEFT);

            $addedSubtotal = 0;
            $addedTax = 0;

            foreach ($data['items'] as $itemData) {
                $menuItem = $hotel->menuItems()->findOrFail($itemData['menu_item_id']);
                $qty = (int) $itemData['quantity'];
                $itemTotal = round($menuItem->price * $qty, 2);
                $itemGst = round(($itemTotal * $menuItem->gst_percentage) / 100, 2);

                RestaurantOrderItem::create([
                    'order_id' => $order->id,
                    'menu_item_id' => $menuItem->id,
                    'kot_number' => $kotNumber,
                    'item_name' => $menuItem->name,
                    'food_type' => $menuItem->food_type,
                    'quantity' => $qty,
                    'unit_price' => $menuItem->price,
                    'total_price' => $itemTotal,
                    'special_notes' => $itemData['special_notes'] ?? null,
                    'status' => RestaurantOrderItem::STATUS_PENDING,
                    'kot_printed_at' => Carbon::now(),
                ]);

                $addedSubtotal += $itemTotal;
                $addedTax += $itemGst;
            }

            $newSubtotal = (float) $order->subtotal + $addedSubtotal;
            $newTax = (float) $order->tax_amount + $addedTax;
            $newGrandTotal = $newSubtotal + $newTax - (float) $order->discount_amount;

            $order->update([
                'subtotal' => $newSubtotal,
                'tax_amount' => $newTax,
                'grand_total' => $newGrandTotal,
            ]);

            $order->setAttribute('latest_kot_number', $kotNumber);

            return $order->load(['items', 'table']);
        });
    }
}

