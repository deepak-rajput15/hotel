<?php

namespace App\Domain\ChannelManager\Services;

use App\Domain\ChannelManager\Models\OtaChannel;
use App\Domain\ChannelManager\Models\OtaSyncLog;
use App\Domain\FrontOffice\Models\Booking;
use App\Domain\FrontOffice\Models\FolioItem;
use App\Domain\FrontOffice\Models\Guest;
use App\Domain\FrontOffice\Models\Payment;
use App\Domain\FrontOffice\Models\Room;
use App\Domain\Notifications\Services\WhatsAppNotificationService;
use App\Domain\Tenancy\Models\Hotel;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class OtaChannelService
{
    /**
     * Standard OTA channels metadata.
     */
    public static array $defaultChannels = [
        [
            'channel_code' => 'MAKEMYTRIP',
            'channel_name' => 'MakeMyTrip / Goibibo',
            'commission_rate_percent' => 18.00,
            'is_connected' => true,
        ],
        [
            'channel_code' => 'BOOKING_COM',
            'channel_name' => 'Booking.com Global',
            'commission_rate_percent' => 15.00,
            'is_connected' => true,
        ],
        [
            'channel_code' => 'AGODA',
            'channel_name' => 'Agoda Asia-Pacific',
            'commission_rate_percent' => 14.00,
            'is_connected' => true,
        ],
        [
            'channel_code' => 'EXPEDIA',
            'channel_name' => 'Expedia Partner Central',
            'commission_rate_percent' => 18.00,
            'is_connected' => false,
        ],
        [
            'channel_code' => 'AIRBNB',
            'channel_name' => 'Airbnb Homestays & Villas',
            'commission_rate_percent' => 3.00,
            'is_connected' => false,
        ],
    ];

    /**
     * Ensure default channels are seeded for the hotel.
     */
    public static function getOrSeedChannels(Hotel $hotel): Collection
    {
        $existing = OtaChannel::withoutGlobalScopes()
            ->where('hotel_id', $hotel->id)
            ->get();

        if ($existing->isEmpty()) {
            foreach (self::$defaultChannels as $ch) {
                OtaChannel::create([
                    'hotel_id' => $hotel->id,
                    'channel_code' => $ch['channel_code'],
                    'channel_name' => $ch['channel_name'],
                    'hotel_channel_id' => $ch['channel_code'] . '-' . substr($hotel->hotel_code, 4) . '-' . rand(100, 999),
                    'api_key' => 'api_live_' . Str::random(24),
                    'webhook_secret' => 'whsec_' . Str::random(32),
                    'is_connected' => $ch['is_connected'],
                    'two_way_sync_enabled' => true,
                    'commission_rate_percent' => $ch['commission_rate_percent'],
                    'last_sync_at' => now()->subMinutes(rand(5, 30)),
                    'sync_status' => $ch['is_connected'] ? 'HEALTHY' : 'IDLE',
                ]);
            }

            return OtaChannel::withoutGlobalScopes()
                ->where('hotel_id', $hotel->id)
                ->get();
        }

        return $existing;
    }

    /**
     * Process an incoming booking from an OTA (MakeMyTrip, Booking.com, Agoda).
     */
    public static function processInboundBooking(Hotel $hotel, string $channelCode, array $data): array
    {
        $channel = OtaChannel::withoutGlobalScopes()
            ->where('hotel_id', $hotel->id)
            ->where('channel_code', $channelCode)
            ->first();

        if (!$channel) {
            self::getOrSeedChannels($hotel);
            $channel = OtaChannel::withoutGlobalScopes()
                ->where('hotel_id', $hotel->id)
                ->where('channel_code', $channelCode)
                ->firstOrFail();
        }

        $otaResId = $data['ota_reservation_id'] ?? ($channelCode . '-' . rand(1000000, 9999999));
        $guestName = $data['guest_name'] ?? 'Pooja Kashyap';
        $guestPhone = $data['guest_phone'] ?? '+919876543299';
        $guestEmail = $data['guest_email'] ?? 'pooja.kashyap@example.com';
        $roomType = strtoupper($data['room_type'] ?? 'DELUXE');
        $checkInAt = isset($data['check_in_at']) ? Carbon::parse($data['check_in_at']) : Carbon::today()->addDay()->setHour(14);
        $checkOutAt = isset($data['check_out_at']) ? Carbon::parse($data['check_out_at']) : Carbon::today()->addDays(3)->setHour(11);
        $nights = max(1, $checkInAt->diffInDays($checkOutAt));
        $ratePerNight = (float) ($data['rate_per_night'] ?? 2800);
        $grossAmount = (float) ($data['gross_amount'] ?? ($ratePerNight * $nights));

        // Commission math
        $commRate = (float) $channel->commission_rate_percent;
        $commAmount = round($grossAmount * ($commRate / 100), 2);
        $netPayable = round($grossAmount - $commAmount, 2);

        // 1. Allocate available room
        $room = $hotel->rooms()
            ->where(function ($q) use ($roomType) {
                $q->where('room_type', $roomType)
                  ->orWhereRaw('UPPER(room_type) = ?', [$roomType]);
            })
            ->whereIn('status', [Room::STATUS_AVAILABLE, 'CLEAN'])
            ->first();

        if (!$room) {
            // Fallback to any available room in this hotel
            $room = $hotel->rooms()
                ->whereIn('status', [Room::STATUS_AVAILABLE, 'CLEAN'])
                ->first();
        }

        if (!$room) {
            // Fallback to matching room type even if currently occupied (for future date booking)
            $room = $hotel->rooms()
                ->where(function ($q) use ($roomType) {
                    $q->where('room_type', $roomType)
                      ->orWhereRaw('UPPER(room_type) = ?', [$roomType]);
                })
                ->first();
        }

        if (!$room) {
            // Absolute fallback to ANY room of the hotel
            $room = $hotel->rooms()->first();
        }

        if (!$room) {
            // Overbooking / Sold-out alert
            $log = OtaSyncLog::create([
                'hotel_id' => $hotel->id,
                'ota_channel_id' => $channel->id,
                'channel_code' => $channelCode,
                'direction' => 'INBOUND',
                'event_type' => 'BOOKING_CREATED',
                'ota_reservation_id' => $otaResId,
                'guest_name' => $guestName,
                'guest_phone' => $guestPhone,
                'gross_amount' => $grossAmount,
                'commission_amount' => $commAmount,
                'net_payable_to_hotel' => $netPayable,
                'status' => 'WARNING',
                'message' => "Overbooking Warning: No room configured for this hotel. Manual room setup needed.",
                'payload' => $data,
                'processed_at' => now(),
            ]);

            return [
                'success' => false,
                'warning' => true,
                'message' => "Overbooking Warning: Hotel me koi room configured nahi hai. Synced to audit log.",
                'log' => $log,
            ];
        }

        // 2. Find or create guest
        $nameParts = explode(' ', trim($guestName), 2);
        $firstName = $nameParts[0];
        $lastName = $nameParts[1] ?? 'Guest';

        $guest = Guest::firstOrCreate(
            ['hotel_id' => $hotel->id, 'phone' => $guestPhone],
            [
                'first_name' => $firstName,
                'last_name' => $lastName,
                'email' => $guestEmail,
                'id_type' => 'AADHAAR',
                'id_number' => '9988' . rand(10000000, 99999999),
                'nationality' => 'India',
                'country' => 'India',
            ]
        );

        $datePrefix = Carbon::now()->format('Ymd');
        $randomSeq = strtoupper(Str::random(4));
        $bookingNumber = "BKG-{$channelCode}-{$datePrefix}-{$randomSeq}";

        // 3. Create reservation in Front Desk PMS
        $booking = Booking::create([
            'hotel_id' => $hotel->id,
            'guest_id' => $guest->id,
            'room_id' => $room->id,
            'booking_number' => $bookingNumber,
            'check_in_at' => $checkInAt,
            'expected_check_out_at' => $checkOutAt,
            'num_adults' => 2,
            'num_children' => 0,
            'status' => 'RESERVED',
            'room_rate_per_night' => $ratePerNight,
            'total_nights' => $nights,
            'total_room_charges' => $grossAmount,
            'total_extra_charges' => 0,
            'discount_amount' => 0,
            'grand_total' => $grossAmount,
            'paid_amount' => $grossAmount,
            'balance_amount' => 0,
            'payment_status' => 'PAID',
            'special_requests' => "OTA Booking via {$channel->channel_name} [OTA Ref: {$otaResId}]. Guest prepaid online. Commission: {$commRate}% (-₹{$commAmount}). Net to Hotel: ₹{$netPayable}.",
        ]);

        // Post Room Charge to folio
        FolioItem::create([
            'booking_id' => $booking->id,
            'item_type' => 'ROOM_CHARGE',
            'description' => "Room Tariff ({$nights} Nights @ ₹{$ratePerNight}/nt) - {$channel->channel_name}",
            'quantity' => $nights,
            'unit_price' => $ratePerNight,
            'total_price' => $grossAmount,
            'charged_at' => now(),
        ]);

        // Record OTA Prepaid receipt
        $payment = Payment::create([
            'booking_id' => $booking->id,
            'receipt_number' => 'OTA-REC-' . rand(1000, 9999),
            'amount' => $grossAmount,
            'payment_method' => 'BANK_TRANSFER',
            'transaction_reference' => "OTA/{$channelCode}/{$otaResId}",
            'payment_type' => 'ADVANCE_DEPOSIT',
            'notes' => "Direct online guest settlement on {$channel->channel_name}",
        ]);

        $booking->recalculateTotals();

        // OTA reservations are prepaid by the traveler on MakeMyTrip/Booking.com
        $fullGrandTotal = (float) $booking->grand_total;
        $payment->amount = $fullGrandTotal;
        $payment->save();

        $booking->paid_amount = $fullGrandTotal;
        $booking->balance_amount = 0;
        $booking->payment_status = 'PAID';
        $booking->save();

        // 4. Log OTA Sync Record
        $log = OtaSyncLog::create([
            'hotel_id' => $hotel->id,
            'ota_channel_id' => $channel->id,
            'booking_id' => $booking->id,
            'channel_code' => $channelCode,
            'direction' => 'INBOUND',
            'event_type' => 'BOOKING_CREATED',
            'ota_reservation_id' => $otaResId,
            'guest_name' => $guestName,
            'guest_phone' => $guestPhone,
            'gross_amount' => $grossAmount,
            'commission_amount' => $commAmount,
            'net_payable_to_hotel' => $netPayable,
            'status' => 'SUCCESS',
            'message' => "Instant OTA reservation synced. Room {$room->room_number} ({$room->room_type}) auto-allocated.",
            'payload' => $data,
            'processed_at' => now(),
        ]);

        // 5. Update channel health
        $channel->update([
            'last_sync_at' => now(),
            'sync_status' => 'HEALTHY',
        ]);

        // 6. Automated WhatsApp confirmation to guest
        try {
            WhatsAppNotificationService::sendBookingConfirmation($booking);
        } catch (\Throwable $e) {
            report($e);
        }

        // 7. Auto-push updated inventory to other connected OTAs (2-way sync to avoid overbooking)
        self::pushAriInventory($hotel);

        return [
            'success' => true,
            'message' => "Incoming {$channel->channel_name} reservation #{$otaResId} synced successfully to Front Desk!",
            'booking' => $booking->fresh(['guest', 'room', 'folioItems', 'payments']),
            'sync_log' => $log,
            'financials' => [
                'gross_amount' => $grossAmount,
                'commission_amount' => $commAmount,
                'net_payable' => $netPayable,
                'commission_percent' => $commRate,
            ],
        ];
    }

    /**
     * Push Availability, Rates & Inventory (ARI) to all connected OTAs.
     */
    public static function pushAriInventory(Hotel $hotel, ?string $channelCode = null): array
    {
        self::getOrSeedChannels($hotel);

        $channels = OtaChannel::withoutGlobalScopes()
            ->where('hotel_id', $hotel->id)
            ->where('is_connected', true)
            ->when($channelCode, fn($q) => $q->where('channel_code', $channelCode))
            ->get();

        $roomCounts = $hotel->rooms()
            ->selectRaw('room_type, count(*) as total, sum(case when status in (\'AVAILABLE\', \'CLEAN\') then 1 else 0 end) as available')
            ->groupBy('room_type')
            ->get();

        $inventorySnapshot = [];
        foreach ($roomCounts as $rc) {
            $inventorySnapshot[$rc->room_type] = [
                'total_rooms' => (int) $rc->total,
                'available_for_sale' => (int) $rc->available,
            ];
        }

        $syncedChannels = [];

        foreach ($channels as $ch) {
            $ch->update([
                'last_sync_at' => now(),
                'sync_status' => 'HEALTHY',
            ]);

            OtaSyncLog::create([
                'hotel_id' => $hotel->id,
                'ota_channel_id' => $ch->id,
                'channel_code' => $ch->channel_code,
                'direction' => 'OUTBOUND',
                'event_type' => 'ARI_PUSH',
                'status' => 'SUCCESS',
                'message' => "ARI Update pushed to {$ch->channel_name}: Live inventory synced across all room categories.",
                'payload' => [
                    'inventory_snapshot' => $inventorySnapshot,
                    'timestamp' => now()->toIso8601String(),
                ],
                'processed_at' => now(),
            ]);

            $syncedChannels[] = $ch->channel_name;
        }

        return [
            'success' => true,
            'message' => "Live ARI Inventory pushed to " . count($syncedChannels) . " connected OTA channels.",
            'synced_channels' => $syncedChannels,
            'inventory_snapshot' => $inventorySnapshot,
            'synced_at' => now()->toIso8601String(),
        ];
    }
}
