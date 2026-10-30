<?php

namespace App\Http\Requests\Api\V1\Store;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $hotel = $this->attributes->get('current_hotel');
        $hotelId = $hotel?->id ?? $this->header('X-Hotel-ID');
        $productId = $this->route('id');

        return [
            'category' => 'sometimes|required|string|max:100',
            'name' => 'sometimes|required|string|max:150',
            'product_code' => [
                'sometimes',
                'required',
                'string',
                'max:50',
                Rule::unique('products', 'product_code')->where('hotel_id', $hotelId)->ignore($productId),
            ],
            'description' => 'nullable|string',
            'unit' => 'sometimes|required|string|max:30',
            'expiry_period' => 'nullable|string|max:20',
            'rate' => 'sometimes|required|numeric|min:0',
            'gst_percentage' => 'nullable|numeric|min:0|max:100',
            'minimum_stock_qty' => 'nullable|numeric|min:0',
            'status' => 'nullable|string|in:Active,Inactive',
            'supplier_id' => [
                'nullable',
                'uuid',
                Rule::exists('suppliers', 'id')->where('hotel_id', $hotelId),
            ],
        ];
    }
}

