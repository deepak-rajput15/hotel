<?php

namespace App\Domain\Finance\Actions;

use App\Domain\Finance\Models\CashDrawerTransaction;
use App\Domain\Finance\Models\ShiftHandover;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RecordCashTransactionAction
{
    /**
     * Record a mid-shift cash transaction (payout, float addition, cash drop) with strict balance guard.
     *
     * @throws ValidationException
     */
    public function execute(ShiftHandover $shift, array $data, User $user): array
    {
        return DB::transaction(function () use ($shift, $data, $user) {
            $shiftLocked = ShiftHandover::where('id', $shift->id)->lockForUpdate()->firstOrFail();

            if ($shiftLocked->status !== 'OPEN') {
                throw ValidationException::withMessages([
                    'shift' => 'Cannot add transactions to a CLOSED shift.',
                ]);
            }

            $currentFinancials = $shiftLocked->computeLiveFinancials();
            $availableCash = (float) $currentFinancials['expected_cash'];
            $txAmount = (float) $data['amount'];

            // Strict Cash Drawer Underflow Guard: Payout or cash drop cannot exceed available cash
            if (in_array($data['transaction_type'], ['PAYOUT', 'CASH_DROP'], true)) {
                if ($txAmount > ($availableCash + 0.01)) {
                    $actionLabel = $data['transaction_type'] === 'PAYOUT' ? 'cash payout' : 'cash drop';
                    throw ValidationException::withMessages([
                        'amount' => "Cannot process {$actionLabel} of ₹" . number_format($txAmount, 2) . ". Current cash available in drawer is only ₹" . number_format($availableCash, 2) . ".",
                    ]);
                }
            }

            $transaction = CashDrawerTransaction::create([
                'shift_handover_id' => $shiftLocked->id,
                'hotel_id' => $shiftLocked->hotel_id,
                'transaction_type' => $data['transaction_type'],
                'amount' => $txAmount,
                'reason' => $data['reason'],
                'recipient_name' => $data['recipient_name'] ?? null,
                'receipt_voucher_no' => $data['receipt_voucher_no'] ?? null,
                'created_by' => $user->id,
            ]);

            $liveFinancials = $shiftLocked->computeLiveFinancials();

            return [
                'transaction' => $transaction->load('creator:id,name'),
                'live_financials' => $liveFinancials,
            ];
        });
    }
}
