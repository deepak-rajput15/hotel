<?php

namespace App\Domain\Tenancy\Contracts;

use App\Domain\Tenancy\Models\Hotel;

interface HotelPaymentSettingServiceInterface
{
    public function updateSettings(Hotel $hotel, array $data): Hotel;
}

