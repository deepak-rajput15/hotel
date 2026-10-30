<?php

namespace App\Http\Requests\Api\V1\Hotel;

use Illuminate\Foundation\Http\FormRequest;

class UpdateHotelPaymentSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'upi_id' => ['required', 'string', 'max:150', 'regex:/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/'],
            'upi_payee_name' => ['nullable', 'string', 'max:150'],
            'upi_qr_image' => ['nullable', 'string'],
            'upi_merchant_code' => ['nullable', 'string', 'max:50'],
        ];
    }

    public function messages(): array
    {
        return [
            'upi_id.regex' => 'Please enter a valid UPI ID (e.g., hotelname@okhdfcbank, 9876543210@paytm)',
        ];
    }
}

