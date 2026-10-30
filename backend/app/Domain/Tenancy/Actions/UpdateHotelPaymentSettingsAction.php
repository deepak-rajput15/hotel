<?php

namespace App\Domain\Tenancy\Actions;

use App\Domain\Tenancy\Models\Hotel;

class UpdateHotelPaymentSettingsAction
{
    /**
     * Update hotel UPI ID and QR code configuration.
     */
    public function execute(Hotel $hotel, array $data): Hotel
    {
        $upiPayeeName = !empty($data['upi_payee_name']) ? trim($data['upi_payee_name']) : $hotel->name;
        $upiId = strtolower(trim($data['upi_id']));
        $upiQrImage = $data['upi_qr_image'] ?? null;
        $upiMerchantCode = $data['upi_merchant_code'] ?? null;

        $existingSettings = $hotel->settings ?? [];
        $existingSettings['upi_id'] = $upiId;
        $existingSettings['upi_payee_name'] = $upiPayeeName;
        if ($upiQrImage !== null) {
            $existingSettings['upi_qr_image'] = $upiQrImage;
        }
        if ($upiMerchantCode !== null) {
            $existingSettings['upi_merchant_code'] = $upiMerchantCode;
        }

        $hotel->update([
            'upi_id' => $upiId,
            'upi_payee_name' => $upiPayeeName,
            'upi_qr_image' => $upiQrImage,
            'upi_merchant_code' => $upiMerchantCode,
            'settings' => $existingSettings,
        ]);

        return $hotel;
    }
}

