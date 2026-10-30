<?php

namespace App\Domain\FrontOffice\Actions;

use App\Domain\FrontOffice\Models\Booking;
use App\Domain\Tenancy\Models\Hotel;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ConfirmReservationAction
{
    /**
     * Confirm check-in for an advance reservation upon guest arrival at the property.
     *
     * @param Hotel $hotel
     * @param string $bookingId
     * @return Booking
     * @throws ValidationException
     */
    public function execute(Hotel $hotel, string $bookingId): Booking
    {
        $booking = $hotel->bookings()->with(['room', 'guest'])->findOrFail($bookingId);

        if ($booking->status !== 'RESERVED') {
            throw ValidationException::withMessages([
                'status' => "Only RESERVED bookings can be confirmed for check-in. Current status is {$booking->status}.",
            ]);
        }

        // Premature check-in prevention: Cannot confirm check-in if scheduled arrival is > 48 hours ahead
        if ($booking->check_in_at && Carbon::parse($booking->check_in_at)->isAfter(Carbon::now()->addDays(2)->addHours(2))) {
            $scheduledDate = Carbon::parse($booking->check_in_at)->format('d M Y');
            throw ValidationException::withMessages([
                'check_in_at' => "Cannot confirm check-in prematurely. Reservation is scheduled for {$scheduledDate}. Guests may only be checked in within 48 hours of scheduled arrival.",
            ]);
        }

        $room = $booking->room;
        if (!$room) {
            throw ValidationException::withMessages([
                'room_id' => 'No room is assigned to this reservation.',
            ]);
        }

        if ($room->status === 'OCCUPIED') {
            throw ValidationException::withMessages([
                'room_id' => "Room {$room->room_number} is currently occupied by another in-house guest.",
            ]);
        }

        if (in_array($room->status, ['DIRTY', 'MAINTENANCE'], true)) {
            throw ValidationException::withMessages([
                'room_id' => "Room {$room->room_number} is currently {$room->status}. Please clean/inspect the room before confirming check-in.",
            ]);
        }

        return DB::transaction(function () use ($booking, $room) {
            $booking->status = 'CHECKED_IN';
            $booking->check_in_at = Carbon::now();
            $booking->save();

            $room->status = 'OCCUPIED';
            $room->save();

            return $booking->fresh(['guest', 'room', 'bookingGuests', 'folioItems', 'payments']);
        });
    }
}

