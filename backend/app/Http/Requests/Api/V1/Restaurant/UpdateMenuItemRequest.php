<?php

namespace App\Http\Requests\Api\V1\Restaurant;

use Illuminate\Foundation\Http\FormRequest;

class UpdateMenuItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:150',
            'category_name' => 'sometimes|string|max:100',
            'price' => 'sometimes|numeric|min:0',
            'gst_percentage' => 'sometimes|numeric|min:0',
            'food_type' => 'sometimes|string|in:VEG,NON_VEG,EGG',
            'is_available' => 'sometimes|boolean',
            'description' => 'nullable|string|max:500',
            'preparation_time_minutes' => 'sometimes|integer|min:1',
        ];
    }
}

