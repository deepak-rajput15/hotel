<?php

namespace App\Http\Requests\Api\V1\Store;

use Illuminate\Foundation\Http\FormRequest;

class UpdateStockBatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'expiry_period' => 'required|string|max:20',
            'notes' => 'nullable|string|max:255',
        ];
    }
}

