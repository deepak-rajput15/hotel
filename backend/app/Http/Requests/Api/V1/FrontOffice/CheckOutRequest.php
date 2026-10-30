<?php

namespace App\Http\Requests\Api\V1\FrontOffice;

use Illuminate\Foundation\Http\FormRequest;

class CheckOutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'settlement_amount' => 'nullable|numeric|min:0',
            'payment_method' => 'nullable|in:CASH,UPI_QR,CARD,BANK_TRANSFER',
            'transaction_reference' => 'nullable|string|max:100',
            'notes' => 'nullable|string|max:255',
        ];
    }
}

