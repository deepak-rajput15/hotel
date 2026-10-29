<?php

namespace App\Domain\Notifications\Services;

use App\Domain\Finance\Models\ShiftHandover;
use App\Domain\FrontOffice\Models\Booking;
use App\Domain\FrontOffice\Models\Payment;
use App\Domain\Notifications\Models\WhatsAppNotification;
use App\Domain\Restaurant\Models\RestaurantOrder;
use App\Domain\Tenancy\Models\Hotel;
use Carbon\Carbon;
use Illuminate\Support\Str;

class WhatsAppNotificationService
{
    /**
     * Send Instant Booking Confirmation Voucher on WhatsApp.
     */
    public static function sendBookingConfirmation(Booking $booking): ?WhatsAppNotification
    {
        $guest = $booking->guest;
        $hotel = $booking->hotel;
        if (!$guest || !$guest->phone) {
            return null;
        }

        $checkInFormatted = $booking->check_in_at ? Carbon::parse($booking->check_in_at)->format('d M Y, h:i A') : 'Today';
        $checkOutFormatted = $booking->expected_check_out_at ? Carbon::parse($booking->expected_check_out_at)->format('d M Y, 11:00 AM') : 'Departure';
        $roomNumber = $booking->room?->room_number ?? 'Allocated on arrival';
        $roomType = $booking->room?->room_type ?? 'Standard';

        $body = "🏨 *GrandStay Booking Confirmation*\n\n"
            . "Namaste *{$guest->full_name}*,\n"
            . "Your reservation at *{$hotel->name}* is confirmed! 🎉\n\n"
            . "🔖 *Booking Ref:* #{$booking->booking_number}\n"
            . "🚪 *Room:* {$roomNumber} ({$roomType})\n"
            . "📅 *Check-In:* {$checkInFormatted}\n"
            . "📅 *Check-Out:* {$checkOutFormatted}\n"
            . "💰 *Total Stay:* ₹{$booking->grand_total} (Paid: ₹{$booking->paid_amount})\n\n"
            . "📱 *In-Room QR Dining & Room Service Menu:*\n"
            . "https://sas.u2tech.in/room-order/{$hotel->hotel_code}/{$roomNumber}\n\n"
            . "📍 *Hotel Address:* {$hotel->city}, {$hotel->country}\n"
            . "📞 *Front Desk Hotline:* {$hotel->phone}\n\n"
            . "We wish you a wonderful and pleasant stay with us!";

        return WhatsAppNotification::create([
            'hotel_id' => $hotel->id,
            'booking_id' => $booking->id,
            'recipient_phone' => $guest->phone,
            'recipient_name' => $guest->full_name,
            'message_type' => 'BOOKING_CONFIRMATION',
            'message_body' => $body,
            'status' => 'DELIVERED',
            'external_message_id' => 'WA-' . strtoupper(Str::random(12)),
            'metadata' => [
                'booking_number' => $booking->booking_number,
                'room_number' => $roomNumber,
                'grand_total' => $booking->grand_total,
            ],
            'sent_at' => now(),
        ]);
    }

    /**
     * Send Express Pre-Check-in Digital KYC Link to avoid front desk queues.
     */
    public static function sendPreCheckInKyc(Booking $booking): ?WhatsAppNotification
    {
        $guest = $booking->guest;
        $hotel = $booking->hotel;
        if (!$guest || !$guest->phone) {
            return null;
        }

        $body = "🛎️ *Express Pre-Check-In KYC - {$hotel->name}*\n\n"
            . "Hello *{$guest->full_name}*,\n"
            . "We are getting your room ready! Skip the front desk check-in queue on arrival by completing your 30-second digital KYC verification online:\n\n"
            . "🔗 *Express KYC Link:*\n"
            . "https://sas.u2tech.in/pre-checkin/{$booking->booking_number}\n\n"
            . "Simply present your digital pass on arrival to receive room key cards in 10 seconds. 🚀\n\n"
            . "Regards,\nFront Office Team, {$hotel->name}";

        return WhatsAppNotification::create([
            'hotel_id' => $hotel->id,
            'booking_id' => $booking->id,
            'recipient_phone' => $guest->phone,
            'recipient_name' => $guest->full_name,
            'message_type' => 'PRE_CHECKIN_KYC',
            'message_body' => $body,
            'status' => 'DELIVERED',
            'external_message_id' => 'WA-' . strtoupper(Str::random(12)),
            'metadata' => [
                'booking_number' => $booking->booking_number,
            ],
            'sent_at' => now(),
        ]);
    }

    /**
     * Send GST Tax Invoice Receipt upon Guest Checkout.
     */
    public static function sendCheckoutInvoice(Booking $booking, array $invoiceData = []): ?WhatsAppNotification
    {
        $guest = $booking->guest;
        $hotel = $booking->hotel;
        if (!$guest || !$guest->phone) {
            return null;
        }

        $invNo = $invoiceData['invoice_number'] ?? ('INV-' . $booking->booking_number);
        $totalPaid = $booking->paid_amount ?? $booking->grand_total;

        $body = "🧾 *Tax Invoice & Thank You - {$hotel->name}*\n\n"
            . "Dear *{$guest->full_name}*,\n"
            . "Thank you for staying with us at {$hotel->name}. It was an honor to host you!\n\n"
            . "📄 *Invoice No:* {$invNo}\n"
            . "💳 *Settlement Amount:* ₹{$totalPaid} (Status: FULLY SETTLED)\n"
            . "📅 *Departure Date:* " . Carbon::now()->format('d M Y, h:i A') . "\n\n"
            . "📥 *Download Digital GST Tax Invoice (PDF):*\n"
            . "https://sas.u2tech.in/invoices/{$invNo}\n\n"
            . "We hope you enjoyed your time with us and look forward to welcoming you back again soon. Have a safe journey! ⭐⭐⭐⭐⭐";

        return WhatsAppNotification::create([
            'hotel_id' => $hotel->id,
            'booking_id' => $booking->id,
            'recipient_phone' => $guest->phone,
            'recipient_name' => $guest->full_name,
            'message_type' => 'CHECKOUT_INVOICE',
            'message_body' => $body,
            'status' => 'DELIVERED',
            'external_message_id' => 'WA-' . strtoupper(Str::random(12)),
            'metadata' => [
                'invoice_number' => $invNo,
                'total_amount' => $totalPaid,
            ],
            'sent_at' => now(),
        ]);
    }

    /**
     * Send Morning Executive Briefing to Hotel Owner.
     */
    public static function sendOwnerDailySummary(Hotel $hotel, string $ownerPhone, string $ownerName): WhatsAppNotification
    {
        $totalRooms = $hotel->rooms()->count();
        $occupiedRooms = $hotel->rooms()->where('status', 'OCCUPIED')->count();
        $occupancyPct = $totalRooms > 0 ? round(($occupiedRooms / $totalRooms) * 100, 1) : 0;

        $todayStart = Carbon::today()->startOfDay();
        $todayEnd = Carbon::today()->endOfDay();

        $todayRoomCollections = (float) Payment::whereHas('booking', function ($q) use ($hotel) {
            $q->where('hotel_id', $hotel->id);
        })
            ->whereBetween('created_at', [$todayStart, $todayEnd])
            ->sum('amount');

        $todayPosCollections = (float) RestaurantOrder::where('hotel_id', $hotel->id)
            ->whereIn('status', ['BILLED', 'SETTLED'])
            ->whereBetween('settled_at', [$todayStart, $todayEnd])
            ->sum('grand_total');

        $totalRevenueToday = $todayRoomCollections + $todayPosCollections;

        $body = "🌅 *GrandStay Daily Morning Brief - {$hotel->name}*\n"
            . "Date: " . Carbon::now()->format('d M Y, h:i A') . "\n\n"
            . "📊 *Property Occupancy:* {$occupancyPct}% ({$occupiedRooms} / {$totalRooms} Rooms)\n"
            . "💵 *Today's Net Collections:* ₹" . number_format($totalRevenueToday, 2) . "\n"
            . "  • Front Desk Room Cash/UPI: ₹" . number_format($todayRoomCollections, 2) . "\n"
            . "  • Restaurant POS Revenue: ₹" . number_format($todayPosCollections, 2) . "\n\n"
            . "Have a productive day! 🚀\n"
            . "GrandStay Cloud Hotel Automation";

        return WhatsAppNotification::create([
            'hotel_id' => $hotel->id,
            'recipient_phone' => $ownerPhone,
            'recipient_name' => $ownerName,
            'message_type' => 'DAILY_OWNER_SUMMARY',
            'message_body' => $body,
            'status' => 'DELIVERED',
            'external_message_id' => 'WA-' . strtoupper(Str::random(12)),
            'metadata' => [
                'occupancy_pct' => $occupancyPct,
                'total_revenue' => $totalRevenueToday,
            ],
            'sent_at' => now(),
        ]);
    }
}
