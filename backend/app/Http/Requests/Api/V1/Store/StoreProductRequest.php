<?php

namespace App\Http\Requests\Api\V1\Store;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductRequest extends FormRequest
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
            'category' => 'required|string|max:100',
            'name' => 'required|string|max:150',
            'product_code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('products', 'product_code')->where('hotel_id', $hotelId),
            ],
            'description' => 'nullable|string',
            'unit' => 'required|string|max:30',
            'expiry_period' => 'nullable|string|max:20',
            'rate' => 'required|numeric|min:0',
            'gst_percentage' => 'nullable|numeric|min:0|max:100',
            'opening_stock' => 'required|numeric|min:0',
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

