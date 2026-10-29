<?php

namespace App\Http\Controllers\Api\V1\Kitchen;

use App\Domain\Restaurant\Models\RestaurantOrder;
use App\Domain\Restaurant\Models\RestaurantOrderItem;
use App\Domain\Tenancy\Models\Hotel;
use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class KitchenKdsController extends Controller
{
    /**
     * Resolve hotel context from request attributes.
     */
    protected function getHotel(Request $request): Hotel
    {
        $hotel = $request->attributes->get('current_hotel');
        if (!$hotel) {
            abort(400, 'Hotel context could not be resolved (specify X-Hotel-ID header).');
        }
        return $hotel;
    }

    /**
     * Live KOT Tickets Display (grouped by Order and KOT number).
     */
    public function liveKots(Request $request): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $filter = $request->query('status', 'ACTIVE'); // ACTIVE (PENDING/PREPARING), READY, ALL

        $itemsQuery = RestaurantOrderItem::whereHas('order', function ($q) use ($hotel) {
            $q->where('hotel_id', $hotel->id)
              ->where('status', '!=', RestaurantOrder::STATUS_CANCELLED);
        })->with(['order.table', 'order.room', 'order.booking.guest']);

        if ($filter === 'ACTIVE') {
            $itemsQuery->whereIn('status', [
                RestaurantOrderItem::STATUS_PENDING,
                RestaurantOrderItem::STATUS_PREPARING,
            ]);
        } elseif ($filter === 'READY') {
            $itemsQuery->where('status', RestaurantOrderItem::STATUS_READY);
        } elseif ($filter === 'ALL') {
            $itemsQuery->whereIn('status', [
                RestaurantOrderItem::STATUS_PENDING,
                RestaurantOrderItem::STATUS_PREPARING,
                RestaurantOrderItem::STATUS_READY,
                RestaurantOrderItem::STATUS_SERVED,
            ]);
        }

        $items = $itemsQuery->oldest('kot_printed_at')->get();

        // Group items by Order ID + KOT Number
        $groupedKots = [];
        foreach ($items as $item) {
            $order = $item->order;
            if (!$order) continue;

            $groupKey = $order->id . '_' . $item->kot_number;

            if (!isset($groupedKots[$groupKey])) {
                $kotTime = $item->kot_printed_at ?? $item->created_at;
                $elapsedMinutes = $kotTime ? (int) max(0, round(abs(Carbon::now()->diffInMinutes($kotTime)))) : 0;

                $groupedKots[$groupKey] = [
                    'group_key' => $groupKey,
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                    'kot_number' => $item->kot_number,
                    'order_type' => $order->order_type,
                    'table_no' => $order->table?->table_no,
                    'room_number' => $order->room?->room_number,
                    'customer_name' => $order->customer_name ?? $order->booking?->guest?->first_name,
                    'covers' => $order->covers,
                    'notes' => $order->notes,
                    'kot_printed_at' => $kotTime?->toIso8601String(),
                    'elapsed_minutes' => $elapsedMinutes,
                    'is_delayed' => $elapsedMinutes >= 15,
                    'items' => [],
                ];
            }

            $groupedKots[$groupKey]['items'][] = [
                'id' => $item->id,
                'item_name' => $item->item_name,
                'food_type' => $item->food_type,
                'quantity' => $item->quantity,
                'special_notes' => $item->special_notes,
                'status' => $item->status,
            ];
        }

        // Determine overall KOT status for each card
        $result = array_values(array_map(function ($kot) {
            $statuses = array_column($kot['items'], 'status');
            if (in_array(RestaurantOrderItem::STATUS_PENDING, $statuses, true)) {
                $kot['overall_status'] = 'PENDING';
            } elseif (in_array(RestaurantOrderItem::STATUS_PREPARING, $statuses, true)) {
                $kot['overall_status'] = 'PREPARING';
            } elseif (in_array(RestaurantOrderItem::STATUS_READY, $statuses, true)) {
                $kot['overall_status'] = 'READY';
            } else {
                $kot['overall_status'] = 'SERVED';
            }
            return $kot;
        }, $groupedKots));

        return response()->json([
            'success' => true,
            'filter' => $filter,
            'kots' => $result,
        ]);
    }

    /**
     * Kitchen Live Queue Summary Metrics.
     */
    public function summary(Request $request): JsonResponse
    {
        $hotel = $this->getHotel($request);

        $counts = RestaurantOrderItem::whereHas('order', function ($q) use ($hotel) {
            $q->where('hotel_id', $hotel->id)
              ->where('status', '!=', RestaurantOrder::STATUS_CANCELLED);
        })
        ->select('status', DB::raw('count(*) as count'), DB::raw('sum(quantity) as total_qty'))
        ->groupBy('status')
        ->get()
        ->keyBy('status');

        $pendingQty = (int) ($counts->get(RestaurantOrderItem::STATUS_PENDING)?->total_qty ?? 0);
        $preparingQty = (int) ($counts->get(RestaurantOrderItem::STATUS_PREPARING)?->total_qty ?? 0);
        $readyQty = (int) ($counts->get(RestaurantOrderItem::STATUS_READY)?->total_qty ?? 0);

        // Count delayed KOTs (> 15 mins)
        $delayedThreshold = Carbon::now()->subMinutes(15);
        $delayedCount = RestaurantOrderItem::whereHas('order', function ($q) use ($hotel) {
            $q->where('hotel_id', $hotel->id)
              ->where('status', '!=', RestaurantOrder::STATUS_CANCELLED);
        })
        ->whereIn('status', [RestaurantOrderItem::STATUS_PENDING, RestaurantOrderItem::STATUS_PREPARING])
        ->where('created_at', '<=', $delayedThreshold)
        ->distinct('kot_number')
        ->count('kot_number');

        return response()->json([
            'success' => true,
            'metrics' => [
                'pending_items' => $pendingQty,
                'preparing_items' => $preparingQty,
                'ready_items' => $readyQty,
                'delayed_kots' => $delayedCount,
                'total_in_kitchen' => $pendingQty + $preparingQty,
            ],
        ]);
    }

    /**
     * Update individual item status (e.g. PENDING -> PREPARING -> READY -> SERVED).
     */
    public function updateItemStatus(Request $request, string $itemId): JsonResponse
    {
        $hotel = $this->getHotel($request);

        $item = RestaurantOrderItem::whereHas('order', function ($q) use ($hotel) {
            $q->where('hotel_id', $hotel->id);
        })->with(['order.items.menuItem'])->findOrFail($itemId);

        $validated = $request->validate([
            'status' => 'required|string|in:PENDING,PREPARING,READY,SERVED,CANCELLED',
        ]);

        if ($validated['status'] === 'CANCELLED') {
            if ($item->order && $item->order->status === RestaurantOrder::STATUS_SETTLED) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot cancel item on an already settled order.',
                ], 422);
            }

            $item->update(['status' => 'CANCELLED']);

            // Recalculate order subtotal and tax on active items
            if ($item->order) {
                $activeItems = $item->order->items()->where('status', '!=', 'CANCELLED')->get();
                $newSubtotal = (float) $activeItems->sum('total_price');
                $newTax = (float) $activeItems->sum(function ($it) {
                    $gst = (float) ($it->menuItem?->gst_percentage ?? 5.00);
                    return round(($it->total_price * $gst) / 100, 2);
                });
                $newGrandTotal = max(0, $newSubtotal + $newTax - (float) $item->order->discount_amount);

                $item->order->update([
                    'subtotal' => $newSubtotal,
                    'tax_amount' => $newTax,
                    'grand_total' => $newGrandTotal,
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => "Item '{$item->item_name}' marked as CANCELLED.",
                'item' => $item,
            ]);
        }

        $item->update(['status' => $validated['status']]);

        return response()->json([
            'success' => true,
            'message' => "Item '{$item->item_name}' marked as {$item->status}.",
            'item' => $item,
        ]);
    }

    /**
     * Batch update all items of a KOT ticket (e.g. "Start Cooking All" or "All Ready").
     */
    public function updateKotStatus(Request $request, string $orderId, string $kotNumber): JsonResponse
    {
        $hotel = $this->getHotel($request);

        $order = $hotel->restaurantOrders()->findOrFail($orderId);

        $validated = $request->validate([
            'status' => 'required|string|in:PREPARING,READY,SERVED',
        ]);

        $affected = RestaurantOrderItem::where('order_id', $order->id)
            ->where('kot_number', $kotNumber)
            ->update(['status' => $validated['status']]);

        return response()->json([
            'success' => true,
            'message' => "All items in {$kotNumber} marked as {$validated['status']}.",
            'affected_count' => $affected,
        ]);
    }
}

