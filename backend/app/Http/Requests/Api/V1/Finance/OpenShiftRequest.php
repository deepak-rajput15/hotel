<?php

namespace App\Http\Requests\Api\V1\Finance;

use Illuminate\Foundation\Http\FormRequest;

class OpenShiftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'department' => 'required|in:FRONT_DESK,RESTAURANT_POS,COMBINED',
            'shift_type' => 'required|in:MORNING,EVENING,NIGHT,GENERAL',
            'opening_float' => 'required|numeric|min:0',
            'opening_notes' => 'nullable|string|max:500',
        ];
    }
}

