<?php

namespace App\Http\Requests\Api\V1\FrontOffice;

use Illuminate\Foundation\Http\FormRequest;

class RecordPaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'amount' => 'required|numeric|min:1',
            'payment_method' => 'required|in:CASH,UPI_QR,CARD,BANK_TRANSFER',
            'transaction_reference' => 'nullable|string|max:100',
            'notes' => 'nullable|string|max:255',
        ];
    }
}

