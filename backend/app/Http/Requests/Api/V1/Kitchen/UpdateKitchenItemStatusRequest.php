<?php

namespace App\Http\Requests\Api\V1\Kitchen;

use Illuminate\Foundation\Http\FormRequest;

class UpdateKitchenItemStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => 'required|string|in:PENDING,PREPARING,READY,SERVED,CANCELLED',
        ];
    }
}

