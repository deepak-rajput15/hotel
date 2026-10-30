<?php

namespace App\Domain\Finance\Actions;

use App\Domain\Finance\Models\ShiftHandover;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CloseShiftAction
{
    /**
     * Close shift, verify physical count, compute variance, and perform handover with row lock.
     *
     * @throws ValidationException
     */
    public function execute(ShiftHandover $shift, array $data, ?User $actor = null): array
    {
        return DB::transaction(function () use ($shift, $data) {
            $shiftLocked = ShiftHandover::where('id', $shift->id)->lockForUpdate()->firstOrFail();

            if ($shiftLocked->status !== 'OPEN') {
                throw ValidationException::withMessages([
                    'shift' => 'Shift is already CLOSED.',
                ]);
            }

            try {
                $financials = $shiftLocked->computeLiveFinancials();
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('computeLiveFinancials failed during CloseShift: ' . $e->getMessage());
                $financials = [
                    'opening_float' => (float) $shiftLocked->opening_float,
                    'total_cash_sales' => 0.0,
                    'total_upi_sales' => 0.0,
                    'total_card_sales' => 0.0,
                    'cash_payouts' => 0.0,
                    'float_additions' => 0.0,
                    'expected_cash' => (float) $shiftLocked->opening_float,
                ];
            }
            $expectedCash = (float) ($financials['expected_cash'] ?? $shiftLocked->opening_float);
            $actualCounted = (float) $data['actual_cash_counted'];
            $variance = round($actualCounted - $expectedCash, 2);

            $shiftLocked->update([
                'closed_at' => now(),
                'status' => 'CLOSED',
                'system_cash_sales' => $financials['total_cash_sales'] ?? 0.0,
                'system_upi_sales' => $financials['total_upi_sales'] ?? 0.0,
                'system_card_sales' => $financials['total_card_sales'] ?? 0.0,
                'cash_paid_out' => $financials['cash_payouts'] ?? 0.0,
                'expected_cash' => $expectedCash,
                'actual_cash_counted' => $actualCounted,
                'variance' => $variance,
                'denominations' => $data['denominations'] ?? null,
                'handover_to_user_id' => $data['handover_to_user_id'] ?? null,
                'handover_notes' => $data['handover_notes'] ?? null,
            ]);

            $statusText = $variance === 0.0
                ? 'PERFECT MATCH'
                : ($variance > 0 ? "OVERAGE (+₹{$variance})" : "SHORTAGE (-₹" . abs($variance) . ")");

            return [
                'shift' => $shiftLocked->fresh(['user:id,name,email', 'handoverToUser:id,name,email', 'cashTransactions']),
                'status_text' => $statusText,
                'variance_summary' => [
                    'expected_cash' => $expectedCash,
                    'actual_cash_counted' => $actualCounted,
                    'variance' => $variance,
                    'status' => $variance === 0.0 ? 'BALANCED' : ($variance > 0 ? 'OVERAGE' : 'SHORTAGE'),
                ],
            ];
        });
    }
}
