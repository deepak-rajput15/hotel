<?php

namespace App\Domain\Restaurant\Actions;

use App\Domain\FrontOffice\Models\Booking;
use App\Domain\FrontOffice\Models\FolioItem;
use App\Domain\FrontOffice\Models\Room;
use App\Domain\Restaurant\Models\MenuItem;
use App\Domain\Restaurant\Models\RestaurantOrder;
use App\Domain\Restaurant\Models\RestaurantOrderItem;
use App\Domain\Tenancy\Models\Hotel;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PlaceRoomDiningOrderAction
{
    /**
     * Place an in-room dining order submitted by guest phone terminal.
     *
     * @throws ValidationException
     */
    public function execute(Hotel $hotel, Room $room, Booking $booking, array $data): array
    {
        return DB::transaction(function () use ($hotel, $room, $booking, $data) {
            $menuItemIds = collect($data['items'])->pluck('menu_item_id');
            $menuItems = MenuItem::where('hotel_id', $hotel->id)
                ->whereIn('id', $menuItemIds)
                ->get()
                ->keyBy('id');

            $subtotal = 0.00;
            $itemsData = [];

            foreach ($data['items'] as $itemInput) {
                $menuItem = $menuItems->get($itemInput['menu_item_id']);
                if (!$menuItem || !$menuItem->is_available) {
                    throw ValidationException::withMessages([
                        'items' => "Item '{$menuItem?->name}' is currently unavailable.",
                    ]);
                }

                $qty = (int) $itemInput['quantity'];
                $unitPrice = (float) $menuItem->price;
                $lineTotal = round($unitPrice * $qty, 2);
                $subtotal += $lineTotal;

                $itemsData[] = [
                    'menu_item' => $menuItem,
                    'quantity' => $qty,
                    'unit_price' => $unitPrice,
                    'line_total' => $lineTotal,
                    'special_notes' => $itemInput['special_notes'] ?? null,
                ];
            }

            // 5% GST for restaurant dining
            $taxAmount = round($subtotal * 0.05, 2);
            $grandTotal = round($subtotal + $taxAmount, 2);

            // Generate Order Number: ORD-YYYYMMDD-XXX-XXXX
            $datePrefix = Carbon::now()->format('Ymd');
            $countToday = RestaurantOrder::where('hotel_id', $hotel->id)
                ->whereDate('created_at', Carbon::today())
                ->count();
            $orderNumber = 'ORD-' . $datePrefix . '-' . str_pad($countToday + 1, 3, '0', STR_PAD_LEFT) . '-' . strtoupper(Str::random(4));

            $settlementPref = $data['settlement_preference'] ?? 'ROOM_FOLIO';
            $customerName = $booking->guest
                ? ($booking->guest->first_name . ' ' . ($booking->guest->last_name ?? ''))
                : 'Guest Room ' . $room->room_number;

            $order = RestaurantOrder::create([
                'hotel_id' => $hotel->id,
                'order_number' => $orderNumber,
                'order_type' => RestaurantOrder::ORDER_TYPE_ROOM_SERVICE,
                'table_id' => null,
                'room_id' => $room->id,
                'booking_id' => $booking->id,
                'customer_name' => $customerName,
                'customer_phone' => $booking->guest?->phone,
                'covers' => 1,
                'status' => RestaurantOrder::STATUS_OPEN,
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'discount_amount' => 0.00,
                'grand_total' => $grandTotal,
                'settlement_method' => $settlementPref,
                'notes' => $data['special_instructions'] ?? null,
            ]);

            // Create KOT & Order Items
            $kotNumber = 'KOT-001';
            foreach ($itemsData as $row) {
                RestaurantOrderItem::create([
                    'order_id' => $order->id,
                    'menu_item_id' => $row['menu_item']->id,
                    'kot_number' => $kotNumber,
                    'item_name' => $row['menu_item']->name,
                    'food_type' => $row['menu_item']->food_type,
                    'quantity' => $row['quantity'],
                    'unit_price' => $row['unit_price'],
                    'total_price' => $row['line_total'],
                    'special_notes' => $row['special_notes'],
                    'status' => 'PENDING',
                    'kot_printed_at' => Carbon::now(),
                ]);
            }

            // If ROOM_FOLIO selected, automatically post to guest's folio ledger
            if ($settlementPref === 'ROOM_FOLIO') {
                $folioItem = FolioItem::create([
                    'booking_id' => $booking->id,
                    'item_type' => 'FOOD_BEVERAGE',
                    'description' => "In-Room Dining: Order #{$order->order_number} (Room {$room->room_number})",
                    'quantity' => 1,
                    'unit_price' => $grandTotal,
                    'total_price' => $grandTotal,
                    'charged_at' => Carbon::now(),
                ]);

                $booking->recalculateTotals();
                $booking->save();

                $order->settlement_reference = "FOLIO-{$folioItem->id}";
                $order->save();
            }

            return [
                'order' => $order,
                'grand_total' => $grandTotal,
                'settlement_method' => $settlementPref,
                'room_number' => $room->room_number,
            ];
        });
    }
}

