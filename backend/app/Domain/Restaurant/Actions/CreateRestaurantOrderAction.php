<?php

namespace App\Domain\Restaurant\Actions;

use App\Domain\Restaurant\Models\RestaurantOrder;
use App\Domain\Restaurant\Models\RestaurantOrderItem;
use App\Domain\Restaurant\Models\RestaurantTable;
use App\Domain\Tenancy\Models\Hotel;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CreateRestaurantOrderAction
{
    /**
     * Create a new dining / room service order and generate KOT-001.
     *
     * @throws ValidationException
     */
    public function execute(Hotel $hotel, array $data, ?User $actor = null): RestaurantOrder
    {
        return DB::transaction(function () use ($hotel, $data) {
            $table = null;
            if ($data['order_type'] === RestaurantOrder::ORDER_TYPE_DINE_IN) {
                $table = $hotel->restaurantTables()->where('id', $data['table_id'])->lockForUpdate()->firstOrFail();

                $existingOrder = $hotel->restaurantOrders()
                    ->where('table_id', $table->id)
                    ->whereIn('status', [RestaurantOrder::STATUS_OPEN, RestaurantOrder::STATUS_BILLED])
                    ->lockForUpdate()
                    ->first();

                if ($existingOrder) {
                    throw ValidationException::withMessages([
                        'table_id' => "Table {$table->table_no} already has an active order (#{$existingOrder->order_number}). Please add items to existing order or settle it first.",
                    ]);
                }

                $table->update(['status' => RestaurantTable::STATUS_OCCUPIED]);
            }

            $room = null;
            $booking = null;
            if ($data['order_type'] === RestaurantOrder::ORDER_TYPE_ROOM_SERVICE) {
                $room = $hotel->rooms()->where('id', $data['room_id'])->lockForUpdate()->firstOrFail();

                if (!empty($data['booking_id'])) {
                    $booking = $hotel->bookings()->where('id', $data['booking_id'])->lockForUpdate()->firstOrFail();
                    if ($booking->room_id !== $room->id || $booking->status !== 'CHECKED_IN') {
                        throw ValidationException::withMessages([
                            'booking_id' => "Booking #{$booking->booking_number} is not an active in-house booking for Room {$room->room_number}.",
                        ]);
                    }
                } else {
                    $booking = $hotel->bookings()
                        ->where('room_id', $room->id)
                        ->where('status', 'CHECKED_IN')
                        ->lockForUpdate()
                        ->latest('check_in_at')
                        ->first();
                }

                if (!$booking) {
                    throw ValidationException::withMessages([
                        'room_id' => "Cannot place Room Service order for Room {$room->room_number} because there is no active checked-in guest.",
                    ]);
                }
            }

            // Generate unique Order Number (e.g. ORD-20261028-001-A1B2)
            $datePrefix = Carbon::now()->format('Ymd');
            $countToday = RestaurantOrder::where('hotel_id', $hotel->id)
                ->whereDate('created_at', Carbon::today())
                ->count();
            $orderNumber = 'ORD-' . $datePrefix . '-' . str_pad($countToday + 1, 3, '0', STR_PAD_LEFT) . '-' . strtoupper(Str::random(4));

            $order = RestaurantOrder::create([
                'hotel_id' => $hotel->id,
                'order_number' => $orderNumber,
                'order_type' => $data['order_type'],
                'table_id' => $table?->id,
                'room_id' => $room?->id,
                'booking_id' => $booking?->id,
                'customer_name' => $data['customer_name'] ?? ($booking ? $booking->guest?->first_name . ' ' . $booking->guest?->last_name : null),
                'customer_phone' => $data['customer_phone'] ?? $booking?->guest?->phone,
                'covers' => $data['covers'] ?? 1,
                'status' => RestaurantOrder::STATUS_OPEN,
                'notes' => $data['notes'] ?? null,
            ]);

            // Punch items under KOT-001
            $kotNumber = 'KOT-001';
            $subtotal = 0;
            $taxAmount = 0;

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

                $subtotal += $itemTotal;
                $taxAmount += $itemGst;
            }

            $grandTotal = $subtotal + $taxAmount;

            $order->update([
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'grand_total' => $grandTotal,
            ]);

            return $order->load(['items', 'table', 'room']);
        });
    }
}

