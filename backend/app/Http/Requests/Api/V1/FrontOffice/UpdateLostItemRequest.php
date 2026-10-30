<?php

namespace App\Http\Requests\Api\V1\FrontOffice;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLostItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'item_name' => 'sometimes|required|string|max:255',
            'category' => 'sometimes|required|string|in:ELECTRONICS,VALUABLES,DOCUMENTS,CLOTHING,BAGGAGE,OTHERS',
            'found_location_type' => 'sometimes|required|string|in:ROOM,RESTAURANT,LOBBY,POOL_GARDEN,BANQUET,OTHER',
            'room_id' => 'nullable|uuid|exists:rooms,id',
            'specific_location' => 'nullable|string|max:255',
            'storage_location' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'estimated_value' => 'nullable|numeric|min:0',
            'guest_name' => 'nullable|string|max:255',
            'guest_phone' => 'nullable|string|max:50',
            'guest_email' => 'nullable|email|max:255',
        ];
    }
}
