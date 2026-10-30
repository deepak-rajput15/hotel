<?php

namespace App\Domain\FrontOffice\Actions;

use App\Domain\FrontOffice\Models\Booking;
use App\Domain\FrontOffice\Models\Payment;
use App\Domain\Tenancy\Models\Hotel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class RecordFolioPaymentAction
{
    /**
     * Record partial or mid-stay payment on guest folio with balance guard and transaction locking.
     *
     * @param Hotel $hotel
     * @param string $bookingId
     * @param array $data Validated payment payload
     * @return array Contains 'payment', 'updated_booking'
     * @throws ValidationException
     */
    public function execute(Hotel $hotel, string $bookingId, array $data): array
    {
        return DB::transaction(function () use ($hotel, $bookingId, $data) {
            $booking = $hotel->bookings()->where('id', $bookingId)->lockForUpdate()->firstOrFail();

            if (!in_array($booking->status, ['CHECKED_IN', 'RESERVED'], true)) {
                throw ValidationException::withMessages([
                    'status' => "Cannot record payment on booking {$booking->booking_number} because guest has already {$booking->status}.",
                ]);
            }

            // Recalculate live to get exact latest balance
            $booking->recalculateTotals();
            $currentBalance = (float) $booking->balance_amount;
            $payAmount = (float) $data['amount'];

            // Strict Folio Overpayment Guard
            if ($payAmount > ($currentBalance + 0.01)) {
                throw ValidationException::withMessages([
                    'amount' => "Payment amount (₹" . number_format($payAmount, 2) . ") exceeds outstanding folio balance (₹" . number_format($currentBalance, 2) . "). Overpayments are not permitted on active guest folios.",
                ]);
            }

            $datePrefix = date('Ymd');
            $randomEntropy = strtoupper(Str::random(6));

            $payment = Payment::create([
                'booking_id' => $booking->id,
                'receipt_number' => "REC-{$datePrefix}-{$randomEntropy}",
                'amount' => $payAmount,
                'payment_method' => $data['payment_method'],
                'transaction_reference' => $data['transaction_reference'] ?? ('TXN/' . time()),
                'payment_type' => 'PARTIAL',
                'notes' => $data['notes'] ?? 'Mid-stay payment collected.',
            ]);

            $booking->recalculateTotals();

            return [
                'payment' => $payment,
                'updated_booking' => $booking->fresh(['folioItems', 'payments']),
            ];
        });
    }
}
