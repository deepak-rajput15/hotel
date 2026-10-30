<?php

namespace App\Http\Requests\Api\V1\Restaurant;

use Illuminate\Foundation\Http\FormRequest;

class CreateRestaurantOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'order_type' => 'required|string|in:DINE_IN,ROOM_SERVICE,TAKEAWAY',
            'table_id' => 'required_if:order_type,DINE_IN|nullable|uuid',
            'room_id' => 'required_if:order_type,ROOM_SERVICE|nullable|uuid',
            'booking_id' => 'nullable|uuid',
            'customer_name' => 'nullable|string|max:100',
            'customer_phone' => 'nullable|string|max:30',
            'covers' => 'nullable|integer|min:1',
            'notes' => 'nullable|string|max:255',
            'items' => 'required|array|min:1',
            'items.*.menu_item_id' => 'required|uuid',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.special_notes' => 'nullable|string|max:255',
        ];
    }
}

