<?php

namespace App\Domain\Store\Actions;

use App\Domain\Purchase\Models\Supplier;
use App\Domain\Tenancy\Models\Hotel;

class ManageSupplierAction
{
    /**
     * Create a new supplier for the hotel property.
     */
    public function createSupplier(Hotel $hotel, array $data): Supplier
    {
        return $hotel->suppliers()->create([
            'firm_name' => $data['firm_name'],
            'address' => $data['address'] ?? null,
            'contact_person' => $data['contact_person'] ?? null,
            'mobile' => $data['mobile'],
            'email' => $data['email'] ?? null,
            'gst_no' => $data['gst_no'] ?? null,
            'pan_no' => $data['pan_no'] ?? null,
            'aadhar_no' => $data['aadhar_no'] ?? null,
            'status' => $data['status'] ?? 'Active',
        ]);
    }
}

