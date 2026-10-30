<?php

namespace App\Http\Controllers\Api\V1\Hotel;

use App\Domain\Tenancy\Contracts\HotelPaymentSettingServiceInterface;
use App\Domain\Tenancy\Models\Hotel;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Hotel\UpdateHotelPaymentSettingsRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class HotelPaymentSettingController extends Controller
{
    public function __construct(
        protected HotelPaymentSettingServiceInterface $paymentSettingService
    ) {}

    protected function resolveHotel(Request $request): ?Hotel
    {
        $hotel = $request->attributes->get('current_hotel');
        if ($hotel) {
            return $hotel;
        }

        $hotelId = $request->header('X-Hotel-Context')
            ?? $request->header('X-Hotel-ID')
            ?? $request->get('hotel_id');

        $user = $request->user();
        if (!$user) {
            return null;
        }

        if (!$hotelId) {
            return $user->hotels()->first();
        }

        $target = Str::isUuid($hotelId)
            ? Hotel::where('id', $hotelId)->first()
            : Hotel::where('hotel_code', $hotelId)->first();

        if ($target && ($user->isPlatformAdmin() || $user->hasAccessToHotel($target->id))) {
            return $target;
        }

        return null;
    }

    /**
     * Get UPI and QR payment settings for the specified/active hotel.
     */
    public function getSettings(Request $request): JsonResponse
    {
        $hotel = $this->resolveHotel($request);
        if (!$hotel) {
            return response()->json([
                'success' => false,
                'message' => 'Hotel context required',
            ], 400);
        }

        $defaultUpi = strtolower(Str::slug($hotel->name, '')) . '@upi';

        return response()->json([
            'success' => true,
            'hotel' => [
                'id' => $hotel->id,
                'hotel_code' => $hotel->hotel_code,
                'name' => $hotel->name,
            ],
            'settings' => [
                'upi_id' => $hotel->upi_id ?? ($hotel->settings['upi_id'] ?? $defaultUpi),
                'upi_payee_name' => $hotel->upi_payee_name ?? ($hotel->settings['upi_payee_name'] ?? $hotel->name),
                'upi_qr_image' => $hotel->upi_qr_image ?? ($hotel->settings['upi_qr_image'] ?? null),
                'upi_merchant_code' => $hotel->upi_merchant_code ?? ($hotel->settings['upi_merchant_code'] ?? null),
                'is_configured' => !empty($hotel->upi_id),
            ],
        ]);
    }

    /**
     * Update hotel UPI ID and QR code settings.
     */
    public function updateSettings(UpdateHotelPaymentSettingsRequest $request): JsonResponse
    {
        $hotel = $this->resolveHotel($request);
        if (!$hotel) {
            return response()->json([
                'success' => false,
                'message' => 'Hotel context required',
            ], 400);
        }

        $hotel = $this->paymentSettingService->updateSettings($hotel, $request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Hotel UPI ID & QR Code settings saved successfully!',
            'settings' => [
                'upi_id' => $hotel->upi_id,
                'upi_payee_name' => $hotel->upi_payee_name,
                'upi_qr_image' => $hotel->upi_qr_image,
                'upi_merchant_code' => $hotel->upi_merchant_code,
                'is_configured' => true,
            ],
        ]);
    }
}
