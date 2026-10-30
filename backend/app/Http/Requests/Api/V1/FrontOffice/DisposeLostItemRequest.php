<?php

namespace App\Http\Requests\Api\V1\FrontOffice;

use Illuminate\Foundation\Http\FormRequest;

class DisposeLostItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'disposal_reason' => 'required|string|max:500',
            'handover_by_staff_name' => 'nullable|string|max:255',
            'handover_notes' => 'nullable|string',
        ];
    }
}
