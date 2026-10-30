<?php

namespace App\Http\Requests\Api\V1\Restaurant;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMenuItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $hotel = $this->attributes->get('current_hotel');
        $hotelId = $hotel?->id ?? $this->header('X-Hotel-ID');

        return [
            'category_name' => 'required|string|max:100',
            'item_code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('menu_items')->where(function ($q) use ($hotelId) {
                    return $q->where('hotel_id', $hotelId);
                }),
            ],
            'name' => 'required|string|max:150',
            'description' => 'nullable|string|max:500',
            'price' => 'required|numeric|min:0',
            'gst_percentage' => 'nullable|numeric|min:0|max:28',
            'food_type' => 'required|string|in:VEG,NON_VEG,EGG',
            'is_available' => 'nullable|boolean',
            'preparation_time_minutes' => 'nullable|integer|min:1',
        ];
    }
}

