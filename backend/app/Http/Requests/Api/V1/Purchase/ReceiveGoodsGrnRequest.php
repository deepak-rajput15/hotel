<?php

namespace App\Http\Requests\Api\V1\Purchase;

use Illuminate\Foundation\Http\FormRequest;

class ReceiveGoodsGrnRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'delivery_challan_no' => 'nullable|string|max:100',
            'invoice_no' => 'nullable|string|max:100',
            'received_date' => 'required|date',
            'remarks' => 'nullable|string|max:500',
            'items' => 'required|array|min:1',
            'items.*.purchase_order_item_id' => 'required|uuid',
            'items.*.quantity_received' => 'required|numeric|min:0.01',
        ];
    }
}

