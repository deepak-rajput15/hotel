<?php

namespace App\Http\Requests\Api\V1\Restaurant;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRestaurantTableRequest extends FormRequest
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
            'table_no' => [
                'required',
                'string',
                'max:50',
                Rule::unique('restaurant_tables')->where(function ($q) use ($hotelId) {
                    return $q->where('hotel_id', $hotelId);
                }),
            ],
            'capacity' => 'required|integer|min:1|max:50',
            'seating_area' => 'required|string|max:100',
            'notes' => 'nullable|string|max:255',
        ];
    }
}

