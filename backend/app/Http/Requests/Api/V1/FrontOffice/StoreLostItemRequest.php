<?php

namespace App\Http\Requests\Api\V1\FrontOffice;

use Illuminate\Foundation\Http\FormRequest;

class StoreLostItemRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'item_name' => 'required|string|max:255',
            'category' => 'required|string|in:ELECTRONICS,VALUABLES,DOCUMENTS,CLOTHING,BAGGAGE,OTHERS',
            'found_location_type' => 'required|string|in:ROOM,RESTAURANT,LOBBY,POOL_GARDEN,BANQUET,OTHER',
            'room_id' => 'nullable|uuid|exists:rooms,id',
            'specific_location' => 'nullable|string|max:255',
            'found_at' => 'nullable|date',
            'found_by_name' => 'required|string|max:255',
            'storage_location' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'estimated_value' => 'nullable|numeric|min:0',
            'guest_name' => 'nullable|string|max:255',
            'guest_phone' => 'nullable|string|max:50',
            'guest_email' => 'nullable|email|max:255',
        ];
    }
}
