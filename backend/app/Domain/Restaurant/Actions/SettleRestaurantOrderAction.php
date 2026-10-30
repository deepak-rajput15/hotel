<?php

namespace App\Domain\Restaurant\Actions;

use App\Domain\FrontOffice\Models\Booking;
use App\Domain\FrontOffice\Models\FolioItem;
use App\Domain\Restaurant\Models\RestaurantOrder;
use App\Domain\Restaurant\Models\RestaurantTable;
use App\Domain\Tenancy\Models\Hotel;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SettleRestaurantOrderAction
{
    /**
     * Settle restaurant order via direct payment or room folio charge.
     *
     * @throws ValidationException
     */
    public function execute(RestaurantOrder $order, array $data, ?User $actor = null): RestaurantOrder
    {
        if ($order->status === RestaurantOrder::STATUS_SETTLED) {
            throw ValidationException::withMessages([
                'status' => 'This order is already settled.',
            ]);
        }

        return DB::transaction(function () use ($order, $data) {
            $order = RestaurantOrder::where('id', $order->id)->lockForUpdate()->firstOrFail();
            $hotel = $order->hotel;
            $discount = isset($data['discount_amount']) ? (float) $data['discount_amount'] : (float) $order->discount_amount;
            $billTotal = (float) $order->subtotal + (float) $order->tax_amount;

            if ($discount > $billTotal) {
                throw ValidationException::withMessages([
                    'discount_amount' => "Discount cannot exceed the total bill amount (₹" . number_format($billTotal, 2) . ").",
                ]);
            }

            $grandTotal = max(0, $billTotal - $discount);

            $order->discount_amount = $discount;
            $order->grand_total = $grandTotal;
            $order->settlement_method = $data['settlement_method'];
            $order->billed_at = $order->billed_at ?? Carbon::now();
            $order->settled_at = Carbon::now();

            // 1. Cross-Module Settlement: Charge to Room Folio
            if ($data['settlement_method'] === RestaurantOrder::SETTLEMENT_ROOM_FOLIO) {
                $roomId = $data['room_id'] ?? $order->room_id;
                $booking = null;

                if (!empty($data['booking_id'])) {
                    $booking = $hotel->bookings()->where('id', $data['booking_id'])->lockForUpdate()->first();
                    if ($booking && $roomId && $booking->room_id !== $roomId) {
                        throw ValidationException::withMessages([
                            'booking_id' => 'The specified booking does not match the specified room.',
                        ]);
                    }
                } elseif ($roomId) {
                    $booking = $hotel->bookings()
                        ->where('room_id', $roomId)
                        ->where('status', 'CHECKED_IN')
                        ->lockForUpdate()
                        ->latest('check_in_at')
                        ->first();
                }

                if (!$booking || $booking->status !== 'CHECKED_IN') {
                    throw ValidationException::withMessages([
                        'room_id' => 'Cannot charge order to room folio because guest is not currently checked in.',
                    ]);
                }

                $tableLabel = $order->table ? " (Table {$order->table->table_no})" : '';
                $folioDescription = "Restaurant Dining POS - Order #{$order->order_number}{$tableLabel}";

                // Post Folio Item to Booking
                $folioItem = FolioItem::create([
                    'booking_id' => $booking->id,
                    'item_type' => 'FOOD_BEVERAGE',
                    'description' => $folioDescription,
                    'quantity' => 1,
                    'unit_price' => $grandTotal,
                    'total_price' => $grandTotal,
                    'charged_at' => Carbon::now(),
                ]);

                // Recalculate Booking Extra Charges & Balance
                $booking->recalculateTotals();

                $order->room_id = $roomId;
                $order->booking_id = $booking->id;
                $order->settlement_reference = "FOLIO-{$folioItem->id}";
            } else {
                $order->settlement_reference = $data['transaction_reference'] ?? ('POS-' . strtoupper(Str::random(8)));
            }

            $order->status = RestaurantOrder::STATUS_SETTLED;
            $order->save();

            // Release table if order was dine-in
            if ($order->table) {
                $order->table->update(['status' => RestaurantTable::STATUS_AVAILABLE]);
            }

            return $order->load(['table', 'room', 'booking.guest', 'items']);
        });
    }
}

