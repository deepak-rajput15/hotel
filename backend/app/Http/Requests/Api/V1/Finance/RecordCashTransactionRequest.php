<?php

namespace App\Http\Requests\Api\V1\Finance;

use Illuminate\Foundation\Http\FormRequest;

class RecordCashTransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'transaction_type' => 'required|in:PAYOUT,FLOAT_ADDITION,CASH_DROP',
            'amount' => 'required|numeric|min:1',
            'reason' => 'required|string|max:255',
            'recipient_name' => 'nullable|string|max:100',
            'receipt_voucher_no' => 'nullable|string|max:50',
        ];
    }
}

