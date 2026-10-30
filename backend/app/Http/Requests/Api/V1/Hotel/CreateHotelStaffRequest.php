<?php

namespace App\Http\Requests\Api\V1\Hotel;

use Illuminate\Foundation\Http\FormRequest;

class CreateHotelStaffRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:150',
            'email' => 'required|email|max:150|unique:users,email',
            'phone' => 'nullable|string|max:30',
            'password' => 'required|string|min:6',
            'role_id' => 'required|uuid|exists:roles,id',
            'hotel_id' => 'nullable|string',
        ];
    }
}

