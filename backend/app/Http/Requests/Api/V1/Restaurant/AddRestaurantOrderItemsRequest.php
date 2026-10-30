<?php

namespace App\Http\Requests\Api\V1\Restaurant;

use Illuminate\Foundation\Http\FormRequest;

class AddRestaurantOrderItemsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'items' => 'required|array|min:1',
            'items.*.menu_item_id' => 'required|uuid',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.special_notes' => 'nullable|string|max:255',
        ];
    }
}

