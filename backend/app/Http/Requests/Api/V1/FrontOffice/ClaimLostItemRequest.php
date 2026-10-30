<?php

namespace App\Http\Requests\Api\V1\FrontOffice;

use Illuminate\Foundation\Http\FormRequest;

class ClaimLostItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'claimed_by_name' => 'required|string|max:255',
            'claimed_by_phone' => 'required|string|max:50',
            'claimed_by_id_proof' => 'nullable|string|max:255',
            'handover_by_staff_name' => 'required|string|max:255',
            'handover_notes' => 'nullable|string',
        ];
    }
}
