<?php

namespace App\Http\Requests\Api\V1\FrontOffice;

use Illuminate\Foundation\Http\FormRequest;

class AddFolioChargeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'item_type' => 'required|in:FOOD_BEVERAGE,LAUNDRY,EXTRA_BED,MISC',
            'description' => 'required|string|max:255',
            'quantity' => 'required|integer|min:1',
            'unit_price' => 'required|numeric|min:0',
        ];
    }
}

