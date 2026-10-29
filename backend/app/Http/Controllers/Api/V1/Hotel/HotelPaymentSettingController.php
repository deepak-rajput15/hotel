<?php

namespace App\Http\Controllers\Api\V1\Hotel;

use App\Domain\Tenancy\Models\Hotel;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class HotelPaymentSettingController extends Controller
{
    protected function resolveHotel(Request $request): ?Hotel
    {
        $hotelId = $request->header('X-Hotel-Context')
            ?? $request->header('X-Hotel-ID')
            ?? $request->get('hotel_id');

        if (!$hotelId) {
            $user = $request->user();
            return $user ? $user->hotels()->first() : null;
        }

        if (Str::isUuid($hotelId)) {
            return Hotel::where('id', $hotelId)->first();
        }

        return Hotel::where('hotel_code', $hotelId)->first();
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
    public function updateSettings(Request $request): JsonResponse
    {
        $hotel = $this->resolveHotel($request);
        if (!$hotel) {
            return response()->json([
                'success' => false,
                'message' => 'Hotel context required',
            ], 400);
        }

        $validated = $request->validate([
            'upi_id' => ['required', 'string', 'max:150', 'regex:/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/'],
            'upi_payee_name' => ['nullable', 'string', 'max:150'],
            'upi_qr_image' => ['nullable', 'string'],
            'upi_merchant_code' => ['nullable', 'string', 'max:50'],
        ], [
            'upi_id.regex' => 'Please enter a valid UPI ID (e.g., hotelname@okhdfcbank, 9876543210@paytm)',
        ]);

        $upiPayeeName = !empty($validated['upi_payee_name']) ? trim($validated['upi_payee_name']) : $hotel->name;
        $upiId = strtolower(trim($validated['upi_id']));
        $upiQrImage = $validated['upi_qr_image'] ?? null;
        $upiMerchantCode = $validated['upi_merchant_code'] ?? null;

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

