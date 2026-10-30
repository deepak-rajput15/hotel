<?php

namespace App\Http\Requests\Api\V1\FrontOffice;

use Illuminate\Foundation\Http\FormRequest;

class CheckInRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Guest KYC details
            'first_name' => 'required|string|max:100',
            'last_name' => 'nullable|string|max:100',
            'phone' => 'required|string|max:30',
            'email' => 'nullable|email|max:150',
            'nationality' => 'required|string|max:100',
            'id_type' => 'required|in:AADHAAR,PASSPORT,DRIVING_LICENSE,VOTER_ID',
            'id_number' => 'required|string|max:100',
            'id_document_path' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'purpose_of_visit' => 'nullable|string|max:150',

            // Stay parameters
            'room_id' => 'required|uuid|exists:rooms,id',
            'check_in_at' => 'nullable|date',
            'expected_check_out_at' => 'required|date',
            'num_adults' => 'nullable|integer|min:1',
            'num_children' => 'nullable|integer|min:0',
            'special_requests' => 'nullable|string',

            // Additional Co-Guests KYC (Police Form C Compliance)
            'co_guests' => 'nullable|array',
            'co_guests.*.guest_category' => 'nullable|string|in:ADULT,CHILD,Adult,Child',
            'co_guests.*.first_name' => 'required|string|max:100',
            'co_guests.*.last_name' => 'required|string|max:100',
            'co_guests.*.gender' => 'required|string|in:MALE,FEMALE,OTHER,Male,Female,Other',
            'co_guests.*.age' => 'required|integer|min:0|max:120',
            'co_guests.*.id_type' => 'nullable|string|max:50',
            'co_guests.*.id_number' => 'required|string|max:100',
            'co_guests.*.phone' => 'nullable|string|max:30',
            'co_guests.*.relationship' => 'nullable|string|max:50',
            'co_guests.*.nationality' => 'nullable|string|max:100',
            'co_guests.*.address' => 'nullable|string|max:255',
            'co_guests.*.city' => 'nullable|string|max:100',
            'co_guests.*.state' => 'nullable|string|max:100',
            'co_guests.*.country' => 'nullable|string|max:100',

            // Tariff & Billing
            'room_rate_per_night' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'advance_deposit_amount' => 'nullable|numeric|min:0',
            'payment_method' => 'nullable|in:CASH,UPI_QR,CARD,BANK_TRANSFER',
            'transaction_reference' => 'nullable|string|max:100',
        ];
    }
}

