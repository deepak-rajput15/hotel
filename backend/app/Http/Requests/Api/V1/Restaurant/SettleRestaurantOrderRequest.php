<?php

namespace App\Http\Requests\Api\V1\Restaurant;

use Illuminate\Foundation\Http\FormRequest;

class SettleRestaurantOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'settlement_method' => 'required|string|in:ROOM_FOLIO,CASH,UPI_QR,CARD',
            'room_id' => 'required_if:settlement_method,ROOM_FOLIO|nullable|uuid',
            'booking_id' => 'nullable|uuid',
            'discount_amount' => 'nullable|numeric|min:0',
            'transaction_reference' => 'nullable|string|max:100',
        ];
    }
}

