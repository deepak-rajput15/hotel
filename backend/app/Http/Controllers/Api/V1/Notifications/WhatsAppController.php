<?php

namespace App\Http\Controllers\Api\V1\Notifications;

use App\Domain\FrontOffice\Models\Booking;
use App\Domain\Notifications\Models\WhatsAppNotification;
use App\Domain\Notifications\Services\WhatsAppNotificationService;
use App\Domain\Tenancy\Models\Hotel;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class WhatsAppController extends Controller
{
    protected function resolveHotel(Request $request): ?Hotel
    {
        $hotelId = $request->header('X-Hotel-Context') ?? $request->get('hotel_id');

        if (!$hotelId) {
            $user = $request->user();
            return $user->hotels()->first();
        }

        if (Str::isUuid($hotelId)) {
            return Hotel::where('id', $hotelId)->first();
        }

        return Hotel::where('hotel_code', $hotelId)->first();
    }

    /**
     * Get WhatsApp notification logs for the hotel.
     */
    public function logs(Request $request): JsonResponse
    {
        $hotel = $this->resolveHotel($request);
        if (!$hotel) {
            return response()->json(['success' => false, 'message' => 'Hotel context required'], 400);
        }

        $query = WhatsAppNotification::withoutGlobalScopes()
            ->where('hotel_id', $hotel->id)
            ->with(['booking:id,booking_number,room_id', 'booking.room:id,room_number']);

        if ($request->filled('message_type')) {
            $query->where('message_type', $request->message_type);
        }
        if ($request->filled('booking_id')) {
            $query->where('booking_id', $request->booking_id);
        }

        $logs = $query->latest('sent_at')->paginate(25);

        return response()->json([
            'success' => true,
            'logs' => $logs,
        ]);
    }

    /**
     * Resend or manually trigger WhatsApp notification for a booking.
     */
    public function resend(Request $request): JsonResponse
    {
        $hotel = $this->resolveHotel($request);
        if (!$hotel) {
            return response()->json(['success' => false, 'message' => 'Hotel context required'], 400);
        }

        $validated = $request->validate([
            'booking_id' => 'required|exists:bookings,id',
            'type' => 'required|in:BOOKING_CONFIRMATION,PRE_CHECKIN_KYC,CHECKOUT_INVOICE',
        ]);

        $booking = Booking::withoutGlobalScopes()
            ->where('hotel_id', $hotel->id)
            ->where('id', $validated['booking_id'])
            ->with(['guest', 'room', 'hotel'])
            ->first();

        if (!$booking) {
            return response()->json(['success' => false, 'message' => 'Booking not found'], 404);
        }

        if (!$booking->guest || !$booking->guest->phone) {
            return response()->json(['success' => false, 'message' => 'Guest phone number is missing in booking profile'], 422);
        }

        $notification = null;

        switch ($validated['type']) {
            case 'BOOKING_CONFIRMATION':
                $notification = WhatsAppNotificationService::sendBookingConfirmation($booking);
                break;
            case 'PRE_CHECKIN_KYC':
                $notification = WhatsAppNotificationService::sendPreCheckInKyc($booking);
                break;
            case 'CHECKOUT_INVOICE':
                $notification = WhatsAppNotificationService::sendCheckoutInvoice($booking);
                break;
        }

        return response()->json([
            'success' => true,
            'message' => "WhatsApp {$validated['type']} sent successfully to {$booking->guest->phone}.",
            'notification' => $notification,
        ]);
    }

    /**
     * Trigger Daily Morning Executive Briefing to Owner.
     */
    public function sendDailySummary(Request $request): JsonResponse
    {
        $hotel = $this->resolveHotel($request);
        if (!$hotel) {
            return response()->json(['success' => false, 'message' => 'Hotel context required'], 400);
        }

        $user = $request->user();
        $ownerPhone = $user->phone ?? '+919876543210';
        $ownerName = $user->name;

        $notification = WhatsAppNotificationService::sendOwnerDailySummary($hotel, $ownerPhone, $ownerName);

        return response()->json([
            'success' => true,
            'message' => "Daily Executive Briefing WhatsApp notification sent to {$ownerPhone}.",
            'notification' => $notification,
        ]);
    }
}

