<?php

namespace App\Http\Requests\Api\V1\FrontOffice;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRoomRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $hotel = $this->attributes->get('current_hotel');
        $hotelId = $hotel ? $hotel->id : null;
        $roomId = $this->route('roomId');

        return [
            'room_number' => [
                'sometimes',
                'required',
                'string',
                'max:20',
                Rule::unique('rooms', 'room_number')->where('hotel_id', $hotelId)->ignore($roomId),
            ],
            'room_type' => 'sometimes|required|string|max:100',
            'room_mode' => 'nullable|string|in:AC,Non AC',
            'floor' => 'nullable|string|max:50',
            'base_price' => 'sometimes|required|numeric|min:0',
            'extra_bedding_price' => 'nullable|numeric|min:0',
            'gst_percentage' => 'nullable|numeric|min:0|max:100',
            'status' => 'nullable|string',
            'max_guests' => 'nullable|integer|min:1',
            'amenities' => 'nullable|array',
            'remarks' => 'nullable|string|max:500',
        ];
    }
}

