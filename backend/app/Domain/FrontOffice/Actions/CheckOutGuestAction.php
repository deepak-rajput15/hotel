<?php

namespace App\Domain\FrontOffice\Actions;

use App\Domain\FrontOffice\Models\Booking;
use App\Domain\FrontOffice\Models\Payment;
use App\Domain\Notifications\Services\WhatsAppNotificationService;
use App\Domain\Tenancy\Models\Hotel;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CheckOutGuestAction
{
    /**
     * Process Guest Checkout, settle remaining balance, mark room DIRTY, and generate GST Tax Invoice.
     *
     * @param Hotel $hotel
     * @param string $bookingId
     * @param array $data Validated checkout payload
     * @return array Contains 'invoice', 'booking'
     * @throws ValidationException
     */
    public function execute(Hotel $hotel, string $bookingId, array $data): array
    {
        return DB::transaction(function () use ($hotel, $bookingId, $data) {
            $booking = $hotel->bookings()->where('status', 'CHECKED_IN')->lockForUpdate()->findOrFail($bookingId);

            $booking->recalculateTotals();

            $settlementAmount = isset($data['settlement_amount'])
                ? (float) $data['settlement_amount']
                : (float) $booking->balance_amount;

            $remainingBalance = round((float) $booking->balance_amount - $settlementAmount, 2);
            if ($remainingBalance > 0.01) {
                throw ValidationException::withMessages([
                    'balance_amount' => "Cannot check out booking with an outstanding balance of ₹" . number_format($remainingBalance, 2) . ". The bill must be fully settled before guest departure.",
                ]);
            }

            if ($settlementAmount > 0) {
                $datePrefix = date('Ymd');
                $randomEntropy = strtoupper(Str::random(6));

                Payment::create([
                    'booking_id' => $booking->id,
                    'receipt_number' => "INV-REC-{$datePrefix}-{$randomEntropy}",
                    'amount' => $settlementAmount,
                    'payment_method' => $data['payment_method'] ?? 'UPI_QR',
                    'transaction_reference' => $data['transaction_reference'] ?? ('SETTLE/' . time()),
                    'payment_type' => 'SETTLEMENT',
                    'notes' => $data['notes'] ?? 'Final bill settlement at departure.',
                ]);
            }

            $booking->recalculateTotals();

            $booking->status = 'CHECKED_OUT';
            $booking->check_out_at = Carbon::now();
            $booking->save();

            if ($booking->room) {
                $booking->room->status = 'DIRTY';
                $booking->room->save();
            }

            $invoiceData = [
                'invoice_number' => 'GST-INV-' . date('Ym') . '-' . substr($booking->booking_number, 3),
                'date' => Carbon::now()->format('d M Y, h:i A'),
                'hotel' => [
                    'name' => $hotel->name,
                    'hotel_code' => $hotel->hotel_code,
                    'city' => $hotel->city,
                    'phone' => $hotel->phone,
                    'tax_number' => $hotel->organization?->tax_number ?? '27AAACA1234A1Z5',
                ],
                'guest' => [
                    'name' => $booking->guest?->full_name,
                    'phone' => $booking->guest?->phone,
                    'email' => $booking->guest?->email,
                    'nationality' => $booking->guest?->nationality,
                    'id_type' => $booking->guest?->id_type,
                    'id_number' => $booking->guest?->id_number,
                    'address' => $booking->guest?->address,
                    'country' => $booking->guest?->country ?? 'India',
                    'co_guests' => $booking->bookingGuests,
                ],
                'stay' => [
                    'room_number' => $booking->room?->room_number,
                    'room_type' => $booking->room?->room_type,
                    'check_in' => $booking->check_in_at->format('d M Y, h:i A'),
                    'check_out' => $booking->check_out_at->format('d M Y, h:i A'),
                    'nights' => $booking->total_nights,
                ],
                'charges' => [
                    'room_charges' => (float) $booking->total_room_charges,
                    'extra_charges' => (float) $booking->total_extra_charges,
                    'discount' => (float) $booking->discount_amount,
                    'taxable_amount' => (float) max(0, $booking->total_room_charges - $booking->discount_amount),
                    'gst_12_percent' => (float) $booking->tax_amount,
                    'grand_total' => (float) $booking->grand_total,
                    'total_paid' => (float) $booking->paid_amount,
                    'balance_due' => (float) $booking->balance_amount,
                ],
                'folio_items' => $booking->folioItems,
                'payments' => $booking->payments,
            ];

            try {
                WhatsAppNotificationService::sendCheckoutInvoice($booking, $invoiceData);
            } catch (\Throwable $e) {
                report($e);
            }

            return [
                'invoice' => $invoiceData,
                'booking' => $booking->fresh(['guest', 'room', 'bookingGuests', 'folioItems', 'payments']),
            ];
        });
    }
}

