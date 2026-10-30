<?php

namespace App\Domain\Tenancy\Services;

use App\Domain\Tenancy\Actions\UpdateHotelPaymentSettingsAction;
use App\Domain\Tenancy\Contracts\HotelPaymentSettingServiceInterface;
use App\Domain\Tenancy\Models\Hotel;

class HotelPaymentSettingService implements HotelPaymentSettingServiceInterface
{
    public function __construct(
        protected UpdateHotelPaymentSettingsAction $updateSettingsAction
    ) {}

    public function updateSettings(Hotel $hotel, array $data): Hotel
    {
        return $this->updateSettingsAction->execute($hotel, $data);
    }
}

