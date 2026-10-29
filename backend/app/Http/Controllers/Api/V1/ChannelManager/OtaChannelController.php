<?php

namespace App\Http\Controllers\Api\V1\ChannelManager;

use App\Domain\ChannelManager\Models\OtaChannel;
use App\Domain\ChannelManager\Models\OtaSyncLog;
use App\Domain\ChannelManager\Services\OtaChannelService;
use App\Domain\Tenancy\Models\Hotel;
use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class OtaChannelController extends Controller
{
    protected function resolveHotel(Request $request): ?Hotel
    {
        $hotelId = $request->header('X-Hotel-Context') ?? $request->get('hotel_id');

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
     * List all OTA channels, connection statuses, commission rates, and high-level metrics.
     */
    public function listChannels(Request $request): JsonResponse
    {
        $hotel = $this->resolveHotel($request);
        if (!$hotel) {
            return response()->json(['success' => false, 'message' => 'Hotel context required'], 400);
        }

        $channels = OtaChannelService::getOrSeedChannels($hotel);

        // Compute high-level OTA metrics
        $todayStart = Carbon::today()->startOfDay();
        $totalOtaBookings = OtaSyncLog::withoutGlobalScopes()
            ->where('hotel_id', $hotel->id)
            ->where('event_type', 'BOOKING_CREATED')
            ->count();

        $grossOtaRevenue = (float) OtaSyncLog::withoutGlobalScopes()
            ->where('hotel_id', $hotel->id)
            ->where('event_type', 'BOOKING_CREATED')
            ->where('status', 'SUCCESS')
            ->sum('gross_amount');

        $totalCommissionPaid = (float) OtaSyncLog::withoutGlobalScopes()
            ->where('hotel_id', $hotel->id)
            ->where('event_type', 'BOOKING_CREATED')
            ->where('status', 'SUCCESS')
            ->sum('commission_amount');

        $netOtaPayout = (float) OtaSyncLog::withoutGlobalScopes()
            ->where('hotel_id', $hotel->id)
            ->where('event_type', 'BOOKING_CREATED')
            ->where('status', 'SUCCESS')
            ->sum('net_payable_to_hotel');

        return response()->json([
            'success' => true,
            'hotel' => [
                'id' => $hotel->id,
                'hotel_code' => $hotel->hotel_code,
                'name' => $hotel->name,
            ],
            'channels' => $channels,
            'metrics' => [
                'total_ota_bookings' => $totalOtaBookings,
                'gross_ota_revenue' => $grossOtaRevenue,
                'total_commission_paid' => $totalCommissionPaid,
                'net_ota_payout' => $netOtaPayout,
                'connected_channels_count' => $channels->where('is_connected', true)->count(),
            ],
        ]);
    }

    /**
     * Update an OTA channel configuration (Toggle Connection, Commission %, Property ID).
     */
    public function updateChannel(Request $request, string $channelCode): JsonResponse
    {
        $hotel = $this->resolveHotel($request);
        if (!$hotel) {
            return response()->json(['success' => false, 'message' => 'Hotel context required'], 400);
        }

        $channel = OtaChannel::withoutGlobalScopes()
            ->where('hotel_id', $hotel->id)
            ->where('channel_code', $channelCode)
            ->first();

        if (!$channel) {
            return response()->json(['success' => false, 'message' => 'Channel not found'], 404);
        }

        $validated = $request->validate([
            'is_connected' => 'nullable|boolean',
            'commission_rate_percent' => 'nullable|numeric|min:0|max:50',
            'hotel_channel_id' => 'nullable|string|max:100',
            'two_way_sync_enabled' => 'nullable|boolean',
        ]);

        $channel->update($validated);

        if (isset($validated['is_connected']) && $validated['is_connected']) {
            $channel->update(['sync_status' => 'HEALTHY', 'last_sync_at' => now()]);
        }

        return response()->json([
            'success' => true,
            'message' => "Channel {$channel->channel_name} settings updated successfully.",
            'channel' => $channel->fresh(),
        ]);
    }

    /**
     * Trigger Outbound ARI Push (Availability, Rates & Inventory) to all connected channels.
     */
    public function pushAri(Request $request): JsonResponse
    {
        $hotel = $this->resolveHotel($request);
        if (!$hotel) {
            return response()->json(['success' => false, 'message' => 'Hotel context required'], 400);
        }

        $result = OtaChannelService::pushAriInventory($hotel, $request->channel_code);

        return response()->json($result);
    }

    /**
     * Get live audit feed of OTA sync logs.
     */
    public function logs(Request $request): JsonResponse
    {
        $hotel = $this->resolveHotel($request);
        if (!$hotel) {
            return response()->json(['success' => false, 'message' => 'Hotel context required'], 400);
        }

        $query = OtaSyncLog::withoutGlobalScopes()
            ->where('hotel_id', $hotel->id)
            ->with(['booking:id,booking_number,room_id', 'booking.room:id,room_number']);

        if ($request->filled('channel_code')) {
            $query->where('channel_code', $request->channel_code);
        }
        if ($request->filled('direction')) {
            $query->where('direction', $request->direction);
        }

        $logs = $query->latest('processed_at')->paginate(20);

        return response()->json([
            'success' => true,
            'logs' => $logs,
        ]);
    }

    /**
     * Interactive OTA Simulator to test real-time inbound booking.
     */
    public function simulateBooking(Request $request): JsonResponse
    {
        $hotel = $this->resolveHotel($request);
        if (!$hotel) {
            return response()->json(['success' => false, 'message' => 'Hotel context required'], 400);
        }

        $channelCode = $request->get('channel_code', 'MAKEMYTRIP');

        // Sample Indian & Global Travelers pool
        $mockGuests = [
            ['name' => 'Amitabh Sengupta', 'phone' => '+919830012345', 'email' => 'amitabh.s@example.com', 'rate' => 3200],
            ['name' => 'Meera Deshmukh', 'phone' => '+919820098765', 'email' => 'meera.d@example.com', 'rate' => 2800],
            ['name' => 'David Miller', 'phone' => '+447911123456', 'email' => 'david.m@example.co.uk', 'rate' => 4500],
            ['name' => 'Harshita Agarwal', 'phone' => '+919414055555', 'email' => 'harshita.a@example.com', 'rate' => 3000],
            ['name' => 'Rohan Oberoi', 'phone' => '+919811199888', 'email' => 'rohan.o@example.com', 'rate' => 3800],
        ];

        $randomGuest = $mockGuests[array_rand($mockGuests)];

        $bookingData = [
            'ota_reservation_id' => $channelCode . '-' . rand(1000000, 9999999),
            'guest_name' => $request->get('guest_name', $randomGuest['name']),
            'guest_phone' => $request->get('guest_phone', $randomGuest['phone']),
            'guest_email' => $request->get('guest_email', $randomGuest['email']),
            'room_type' => $request->get('room_type', 'DELUXE'),
            'rate_per_night' => (float) $request->get('rate_per_night', $randomGuest['rate']),
            'check_in_at' => $request->get('check_in_at', Carbon::today()->addDay()->setHour(14)->toIso8601String()),
            'check_out_at' => $request->get('check_out_at', Carbon::today()->addDays(3)->setHour(11)->toIso8601String()),
        ];

        $result = OtaChannelService::processInboundBooking($hotel, $channelCode, $bookingData);

        return response()->json($result);
    }

    /**
     * Public Webhook endpoint that receives live inbound bookings from MakeMyTrip / Booking.com.
     */
    public function inboundWebhook(Request $request, string $channelCode): JsonResponse
    {
        $hotelChannelId = $request->header('X-Hotel-Channel-Id') ?? $request->get('hotel_channel_id');
        $hotel = null;

        if ($hotelChannelId) {
            $channel = OtaChannel::withoutGlobalScopes()
                ->where('hotel_channel_id', $hotelChannelId)
                ->first();
            if ($channel) {
                $hotel = $channel->hotel;
            }
        }

        if (!$hotel) {
            $hotelId = $request->header('X-Hotel-Context') ?? $request->get('hotel_id');
            if ($hotelId) {
                $hotel = Str::isUuid($hotelId)
                    ? Hotel::where('id', $hotelId)->first()
                    : Hotel::where('hotel_code', $hotelId)->first();
            }
        }

        if (!$hotel) {
            return response()->json(['success' => false, 'message' => 'Hotel channel ID could not be identified'], 400);
        }

        $payload = $request->all();
        $result = OtaChannelService::processInboundBooking($hotel, strtoupper($channelCode), $payload);

        return response()->json($result);
    }
}
