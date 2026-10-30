<?php

namespace App\Http\Requests\Api\V1\Finance;

use Illuminate\Foundation\Http\FormRequest;

class CloseShiftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'actual_cash_counted' => 'required|numeric|min:0',
            'denominations' => 'nullable|array',
            'handover_to_user_id' => 'nullable|exists:users,id',
            'handover_notes' => 'nullable|string|max:1000',
        ];
    }
}

