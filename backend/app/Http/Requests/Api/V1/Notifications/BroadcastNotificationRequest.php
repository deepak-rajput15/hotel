<?php

namespace App\Http\Requests\Api\V1\Notifications;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BroadcastNotificationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'priority' => 'nullable|string|in:INFO,WARNING,URGENT',
            'is_banner' => 'nullable|boolean',
            'target_scope' => [
                'required',
                'string',
                Rule::in(['GLOBAL_OWNERS', 'ORGANIZATION_OWNERS', 'ALL_STAFF', 'SPECIFIC_ROLE', 'SPECIFIC_HOTEL']),
            ],
            'target_role' => [
                'nullable',
                'string',
                'required_if:target_scope,SPECIFIC_ROLE',
                Rule::in(['front-desk', 'restaurant-cashier', 'head-chef', 'storekeeper', 'general-manager']),
            ],
            'hotel_id' => 'nullable|uuid|exists:hotels,id',
            'organization_id' => 'nullable|uuid|exists:organizations,id',
            'expires_at' => 'nullable|date',
        ];
    }
}

