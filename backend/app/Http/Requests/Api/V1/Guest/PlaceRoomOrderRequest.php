<?php

namespace App\Http\Requests\Api\V1\Guest;

use Illuminate\Foundation\Http\FormRequest;

class PlaceRoomOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'items' => 'required|array|min:1',
            'items.*.menu_item_id' => 'required|uuid|exists:menu_items,id',
            'items.*.quantity' => 'required|integer|min:1|max:20',
            'items.*.special_notes' => 'nullable|string|max:255',
            'special_instructions' => 'nullable|string|max:500',
            'settlement_preference' => 'nullable|string|in:ROOM_FOLIO,PAY_ON_DELIVERY',
        ];
    }
}

