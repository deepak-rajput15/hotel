<?php

namespace App\Domain\FrontOffice\Actions;

use App\Domain\FrontOffice\Models\Booking;
use App\Domain\FrontOffice\Models\BookingGuest;
use App\Domain\FrontOffice\Models\FolioItem;
use App\Domain\FrontOffice\Models\Guest;
use App\Domain\FrontOffice\Models\Payment;
use App\Domain\FrontOffice\Models\Room;
use App\Domain\Notifications\Services\WhatsAppNotificationService;
use App\Domain\Tenancy\Models\Hotel;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CheckInGuestAction
{
    /**
     * Perform guest walk-in or advance reservation check-in with KYC, Form-C, and initial Folio setup.
     *
     * @param Hotel $hotel
     * @param array $data Validated payload
     * @return array Contains 'booking', 'message', 'is_future_reservation'
     * @throws ValidationException
     */
    public function execute(Hotel $hotel, array $data): array
    {
        return DB::transaction(function () use ($hotel, $data) {
            $room = $hotel->rooms()->where('id', $data['room_id'])->lockForUpdate()->firstOrFail();

            $checkInTime = !empty($data['check_in_at'])
                ? Carbon::parse($data['check_in_at'])
                : Carbon::now();
            $checkOutTime = Carbon::parse($data['expected_check_out_at']);

            if ($checkOutTime->lte($checkInTime)) {
                throw ValidationException::withMessages([
                    'expected_check_out_at' => 'Check-out date and time must be after the check-in date and time.',
                ]);
            }

            if ($checkOutTime->isPast()) {
                throw ValidationException::withMessages([
                    'expected_check_out_at' => 'Expected check-out date and time cannot be in the past.',
                ]);
            }

            // Check if there is an overlapping active or reserved booking for this room
            $overlapping = Booking::where('room_id', $room->id)
                ->whereIn('status', ['CHECKED_IN', 'RESERVED'])
                ->where(function ($q) use ($checkInTime, $checkOutTime) {
                    $q->where('check_in_at', '<', $checkOutTime)
                      ->where('expected_check_out_at', '>', $checkInTime);
                })
                ->with('guest')
                ->first();

            if ($overlapping) {
                $guestName = $overlapping->guest ? ($overlapping->guest->first_name . ' ' . $overlapping->guest->last_name) : 'another guest';
                $start = $overlapping->check_in_at->format('d M Y, h:i A');
                $end = $overlapping->expected_check_out_at->format('d M Y, h:i A');
                throw ValidationException::withMessages([
                    'room_id' => "Room {$room->room_number} is not available for the selected dates. It is already booked by {$guestName} from {$start} to {$end}.",
                ]);
            }

            // If check-in is in the future (> 6 hours ahead), treat as advance reservation
            $isFutureReservation = $checkInTime->isAfter(Carbon::now()->addHours(6));

            if (!$isFutureReservation) {
                if ($room->status === 'OCCUPIED') {
                    throw ValidationException::withMessages([
                        'room_id' => "Room {$room->room_number} is currently occupied by an in-house guest today.",
                    ]);
                }

                if ($room->status === 'DIRTY') {
                    throw ValidationException::withMessages([
                        'room_id' => "Room {$room->room_number} is currently dirty and awaiting housekeeping cleaning. Please clean and inspect before check-in.",
                    ]);
                }

                if ($room->status === 'MAINTENANCE') {
                    throw ValidationException::withMessages([
                        'room_id' => "Room {$room->room_number} is under active maintenance and cannot be assigned to guests.",
                    ]);
                }
            }

            $bookingStatus = $isFutureReservation ? 'RESERVED' : 'CHECKED_IN';

            // 1. Create or update guest profile with KYC identity
            $guest = Guest::create([
                'hotel_id' => $hotel->id,
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'] ?? null,
                'email' => $data['email'] ?? null,
                'phone' => $data['phone'],
                'nationality' => $data['nationality'],
                'id_type' => $data['id_type'],
                'id_number' => $data['id_number'],
                'id_document_path' => $data['id_document_path'] ?? 'verified_id_scan_' . time() . '.pdf',
                'address' => $data['address'] ?? null,
                'city' => $data['city'] ?? null,
                'state' => $data['state'] ?? null,
                'country' => $data['country'] ?? 'India',
                'purpose_of_visit' => $data['purpose_of_visit'] ?? 'Business / Leisure',
            ]);

            // 2. Validate Multi-Occupant Co-Guests (Both additional adults AND children)
            $adultCount = (int) ($data['num_adults'] ?? 1);
            $childrenCount = (int) ($data['num_children'] ?? 0);
            $neededAdditionalOccupants = max(0, $adultCount - 1) + max(0, $childrenCount);
            $coGuests = $data['co_guests'] ?? [];

            if (isset($data['co_guests']) && $neededAdditionalOccupants > 0 && count($coGuests) < $neededAdditionalOccupants) {
                $missing = $neededAdditionalOccupants - count($coGuests);
                throw ValidationException::withMessages([
                    'co_guests' => "Room has {$adultCount} adult(s) and {$childrenCount} child(ren) ({$neededAdditionalOccupants} additional occupants total). Details for all occupants are required (Full KYC & Address). Missing details for {$missing} occupant(s).",
                ]);
            }

            // 3. Calculate duration
            $nights = max(1, (int) $checkInTime->copy()->startOfDay()->diffInDays($checkOutTime->copy()->startOfDay()));

            $ratePerNight = isset($data['room_rate_per_night']) && $data['room_rate_per_night'] > 0
                ? (float) $data['room_rate_per_night']
                : (float) $room->base_price;

            $totalRoomCharges = $ratePerNight * $nights;
            $discount = (float) ($data['discount_amount'] ?? 0);

            if ($discount > $totalRoomCharges) {
                throw ValidationException::withMessages([
                    'discount_amount' => "Discount (₹" . number_format($discount, 2) . ") cannot exceed the total room tariff charges (₹" . number_format($totalRoomCharges, 2) . ").",
                ]);
            }

            // 4. Create Booking
            $datePrefix = Carbon::now()->format('Ymd');
            $countToday = Booking::where('hotel_id', $hotel->id)
                ->whereDate('created_at', Carbon::today())
                ->count();
            $bookingNumber = 'BK-' . $datePrefix . '-' . str_pad($countToday + 1, 4, '0', STR_PAD_LEFT) . '-' . strtoupper(Str::random(4));

            $booking = Booking::create([
                'hotel_id' => $hotel->id,
                'booking_number' => $bookingNumber,
                'guest_id' => $guest->id,
                'room_id' => $room->id,
                'check_in_at' => $checkInTime,
                'expected_check_out_at' => $checkOutTime,
                'num_adults' => $adultCount,
                'num_children' => $data['num_children'] ?? 0,
                'co_guests' => $coGuests,
                'status' => $bookingStatus,
                'room_rate_per_night' => $ratePerNight,
                'total_nights' => $nights,
                'total_room_charges' => $totalRoomCharges,
                'total_extra_charges' => 0,
                'discount_amount' => $discount,
                'special_requests' => $data['special_requests'] ?? null,
            ]);

            // 5. Store relational Co-Guests records for Police / Form C Compliance
            foreach ($coGuests as $cg) {
                BookingGuest::create([
                    'booking_id' => $booking->id,
                    'hotel_id' => $hotel->id,
                    'guest_category' => strtoupper($cg['guest_category'] ?? 'ADULT'),
                    'first_name' => $cg['first_name'],
                    'last_name' => $cg['last_name'],
                    'gender' => strtoupper($cg['gender'] ?? 'MALE'),
                    'age' => (int) $cg['age'],
                    'phone' => $cg['phone'] ?? null,
                    'id_type' => $cg['id_type'] ?? 'AADHAAR',
                    'id_number' => $cg['id_number'],
                    'relationship' => $cg['relationship'] ?? 'Family',
                    'nationality' => $cg['nationality'] ?? ($data['nationality'] ?? 'India'),
                    'address' => $cg['address'] ?? ($data['address'] ?? null),
                    'city' => $cg['city'] ?? ($data['city'] ?? null),
                    'state' => $cg['state'] ?? ($data['state'] ?? null),
                    'country' => $cg['country'] ?? ($data['country'] ?? 'India'),
                ]);
            }

            // 6. Mark room as OCCUPIED only if immediate check-in today
            if (!$isFutureReservation) {
                $room->status = 'OCCUPIED';
                $room->save();
            }

            // 7. Post Room Tariff to Folio
            FolioItem::create([
                'booking_id' => $booking->id,
                'item_type' => 'ROOM_CHARGE',
                'description' => $isFutureReservation
                    ? "Advance Reservation Tariff ({$nights} Nights x ₹" . number_format($ratePerNight, 2) . ")"
                    : "Room Tariff ({$nights} Nights x ₹" . number_format($ratePerNight, 2) . ")",
                'quantity' => $nights,
                'unit_price' => $ratePerNight,
                'total_price' => $totalRoomCharges,
                'charged_at' => $checkInTime,
            ]);

            // 8. Record Advance Deposit if provided
            $advanceAmount = (float) ($data['advance_deposit_amount'] ?? 0);
            if ($advanceAmount > 0) {
                Payment::create([
                    'booking_id' => $booking->id,
                    'receipt_number' => 'REC-' . date('Ymd') . '-' . strtoupper(Str::random(6)),
                    'amount' => $advanceAmount,
                    'payment_method' => $data['payment_method'] ?? 'UPI_QR',
                    'transaction_reference' => $data['transaction_reference'] ?? ('DEP/' . time()),
                    'payment_type' => 'ADVANCE_DEPOSIT',
                    'notes' => $isFutureReservation
                        ? 'Advance deposit collected for future room reservation.'
                        : 'Advance deposit collected at front desk check-in counter.',
                ]);
            }

            // 9. Calculate final totals, taxes, and balance
            $booking->recalculateTotals();

            // 10. Automated WhatsApp Confirmation Voucher Engine
            try {
                WhatsAppNotificationService::sendBookingConfirmation($booking);
            } catch (\Throwable $e) {
                report($e);
            }

            $message = $isFutureReservation
                ? "Advance Reservation confirmed for Room {$room->room_number} ({$booking->booking_number}) from " . $checkInTime->format('d M Y, h:i A') . " to " . $checkOutTime->format('d M Y, h:i A') . " ({$nights} Nights)."
                : "Guest {$guest->full_name} checked in to Room {$room->room_number} successfully ({$nights} Nights). Folio #{$booking->booking_number} generated.";

            return [
                'success' => true,
                'message' => $message,
                'is_future_reservation' => $isFutureReservation,
                'booking' => $booking->fresh(['guest', 'room', 'bookingGuests', 'folioItems', 'payments']),
            ];
        });
    }
}

