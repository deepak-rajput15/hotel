<?php

namespace App\Domain\FrontOffice\Actions;

use App\Domain\FrontOffice\Models\Booking;
use App\Domain\FrontOffice\Models\FolioItem;
use App\Domain\Tenancy\Models\Hotel;
use Carbon\Carbon;

class AddFolioChargeAction
{
    /**
     * Add extra incidental charges to in-house guest bill.
     *
     * @param Hotel $hotel
     * @param string $bookingId
     * @param array $data Validated charge details
     * @return array Contains 'folio_item', 'updated_booking', 'total_price'
     */
    public function execute(Hotel $hotel, string $bookingId, array $data): array
    {
        $booking = $hotel->bookings()->where('status', 'CHECKED_IN')->findOrFail($bookingId);

        $qty = (int) $data['quantity'];
        $unitPrice = (float) $data['unit_price'];
        $totalPrice = $qty * $unitPrice;

        $folioItem = FolioItem::create([
            'booking_id' => $booking->id,
            'item_type' => $data['item_type'],
            'description' => $data['description'],
            'quantity' => $qty,
            'unit_price' => $unitPrice,
            'total_price' => $totalPrice,
            'charged_at' => Carbon::now(),
        ]);

        $booking->recalculateTotals();

        return [
            'folio_item' => $folioItem,
            'updated_booking' => $booking->fresh(['folioItems', 'payments']),
            'total_price' => $totalPrice,
            'room_number' => $booking->room?->room_number,
        ];
    }
}

