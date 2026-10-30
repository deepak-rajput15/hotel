<?php

namespace App\Http\Requests\Api\V1\Store;

use Illuminate\Foundation\Http\FormRequest;

class AdjustStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (!$this->has('type') && $this->has('operation')) {
            $this->merge(['type' => $this->input('operation')]);
        }
    }

    public function rules(): array
    {
        return [
            'type' => 'required|in:ADD,SUBTRACT,SET',
            'quantity' => 'required|numeric|min:0.01',
            'reason' => 'required|string|max:150',
            'notes' => 'nullable|string|max:255',
            'batch_no' => 'nullable|string|max:50',
            'expiry_period' => 'nullable|string|max:20',
        ];
    }
}

