<?php

namespace App\Http\Requests\Api\V1\FrontOffice;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRoomStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => 'required|in:AVAILABLE,OCCUPIED,DIRTY,MAINTENANCE',
        ];
    }
}

