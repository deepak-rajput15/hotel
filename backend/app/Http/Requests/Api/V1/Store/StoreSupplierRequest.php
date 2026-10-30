<?php

namespace App\Http\Requests\Api\V1\Store;

use Illuminate\Foundation\Http\FormRequest;

class StoreSupplierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'firm_name' => 'required|string|max:150',
            'address' => 'nullable|string',
            'contact_person' => 'nullable|string|max:100',
            'mobile' => 'required|string|max:30',
            'email' => 'nullable|email|max:150',
            'gst_no' => 'nullable|string|max:30',
            'pan_no' => 'nullable|string|max:30',
            'aadhar_no' => 'nullable|string|max:30',
            'status' => 'nullable|string|in:Active,Inactive',
        ];
    }
}

