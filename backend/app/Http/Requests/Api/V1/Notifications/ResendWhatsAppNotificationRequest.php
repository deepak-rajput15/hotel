<?php

namespace App\Http\Requests\Api\V1\Notifications;

use Illuminate\Foundation\Http\FormRequest;

class ResendWhatsAppNotificationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'booking_id' => 'required|exists:bookings,id',
            'type' => 'required|in:BOOKING_CONFIRMATION,PRE_CHECKIN_KYC,CHECKOUT_INVOICE',
        ];
    }
}

