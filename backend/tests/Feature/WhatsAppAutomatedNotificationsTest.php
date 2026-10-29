<?php

namespace Tests\Feature;

use App\Domain\FrontOffice\Models\Booking;
use App\Domain\FrontOffice\Models\Guest;
use App\Domain\FrontOffice\Models\Payment;
use App\Domain\FrontOffice\Models\Room;
use App\Domain\Notifications\Models\WhatsAppNotification;
use App\Domain\Tenancy\Models\Hotel;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WhatsAppAutomatedNotificationsTest extends TestCase
{
    use RefreshDatabase;

    protected User $cashier;
    protected User $owner;
    protected Hotel $hotel;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        $this->owner = User::where('email', 'owner@apexhospitality.com')->first();
        $this->cashier = User::where('email', 'frontdesk.priya@apexhospitality.com')->first();
        $this->hotel = Hotel::where('hotel_code', 'HTL-1001')->first();
    }

    public function test_checkin_automatically_sends_whatsapp_booking_confirmation(): void
    {
        $room = $this->hotel->rooms()->where('status', 'AVAILABLE')->first();

        $response = $this->actingAs($this->cashier)
            ->withHeader('X-Hotel-Context', $this->hotel->id)
            ->postJson('/api/v1/front-office/check-in', [
                'first_name' => 'Aditya',
                'last_name' => 'Verma',
                'phone' => '+919988776655',
                'email' => 'aditya@example.com',
                'id_type' => 'AADHAAR',
                'id_number' => '456789012345',
                'nationality' => 'India',
                'address' => '102 Civil Lines, Jaipur',
                'city' => 'Jaipur',
                'state' => 'Rajasthan',
                'country' => 'India',
                'room_id' => $room->id,
                'check_in_at' => now()->toIso8601String(),
                'expected_check_out_at' => now()->addDays(2)->toIso8601String(),
                'adults' => 2,
                'children' => 0,
                'room_rate' => 3000,
                'paid_amount' => 1000,
                'payment_method' => 'UPI_QR',
                'co_guests' => [],
            ]);

        $response->assertStatus(201);
        $bookingId = $response->json('booking.id');

        // Check WhatsApp notification log
        $this->assertDatabaseHas('whatsapp_notifications', [
            'hotel_id' => $this->hotel->id,
            'booking_id' => $bookingId,
            'recipient_phone' => '+919988776655',
            'message_type' => 'BOOKING_CONFIRMATION',
            'status' => 'DELIVERED',
        ]);

        $wa = WhatsAppNotification::where('booking_id', $bookingId)->first();
        $this->assertStringContainsString('GrandStay Booking Confirmation', $wa->message_body);
        $this->assertStringContainsString($room->room_number, $wa->message_body);
        $this->assertStringContainsString('https://sas.u2tech.in/room-order/', $wa->message_body);
    }

    public function test_checkout_automatically_sends_whatsapp_tax_invoice(): void
    {
        $room = $this->hotel->rooms()->where('status', 'AVAILABLE')->first();
        $guest = Guest::create([
            'hotel_id' => $this->hotel->id,
            'first_name' => 'Kavita',
            'last_name' => 'Sharma',
            'phone' => '+919123456789',
            'id_type' => 'PASSPORT',
            'id_number' => 'Z9876543',
        ]);

        $booking = Booking::create([
            'hotel_id' => $this->hotel->id,
            'guest_id' => $guest->id,
            'room_id' => $room->id,
            'booking_number' => 'BKG-WA-TEST-02',
            'check_in_at' => now()->subDays(2),
            'expected_check_out_at' => now(),
            'status' => 'CHECKED_IN',
            'room_rate_per_night' => 2000,
            'total_nights' => 2,
            'total_room_charges' => 4000,
            'grand_total' => 4000,
            'paid_amount' => 0,
            'balance_amount' => 4000,
        ]);

        $room->status = 'OCCUPIED';
        $room->save();

        // Perform checkout with settlement
        $booking->recalculateTotals();
        $response = $this->actingAs($this->cashier)
            ->withHeader('X-Hotel-Context', $this->hotel->id)
            ->postJson("/api/v1/front-office/bookings/{$booking->id}/check-out", [
                'settlement_amount' => $booking->balance_amount,
                'payment_method' => 'UPI_QR',
            ]);

        $response->assertStatus(200);

        // Check WhatsApp Tax Invoice notification log
        $this->assertDatabaseHas('whatsapp_notifications', [
            'hotel_id' => $this->hotel->id,
            'booking_id' => $booking->id,
            'recipient_phone' => '+919123456789',
            'message_type' => 'CHECKOUT_INVOICE',
            'status' => 'DELIVERED',
        ]);

        $wa = WhatsAppNotification::where('booking_id', $booking->id)
            ->where('message_type', 'CHECKOUT_INVOICE')
            ->first();

        $this->assertStringContainsString('Tax Invoice & Thank You', $wa->message_body);
        $this->assertStringContainsString('https://sas.u2tech.in/invoices/', $wa->message_body);
    }

    public function test_can_manually_trigger_pre_checkin_kyc_whatsapp(): void
    {
        $room = $this->hotel->rooms()->first();
        $guest = Guest::create([
            'hotel_id' => $this->hotel->id,
            'first_name' => 'Rahul',
            'last_name' => 'Mehta',
            'phone' => '+919876112233',
            'id_type' => 'AADHAAR',
            'id_number' => '998877665544',
        ]);

        $booking = Booking::create([
            'hotel_id' => $this->hotel->id,
            'guest_id' => $guest->id,
            'room_id' => $room->id,
            'booking_number' => 'BKG-WA-RESV-01',
            'check_in_at' => now()->addDays(3),
            'expected_check_out_at' => now()->addDays(5),
            'status' => 'RESERVED',
            'room_rate_per_night' => 3500,
            'total_nights' => 2,
            'total_room_charges' => 7000,
            'grand_total' => 7000,
            'paid_amount' => 2000,
            'balance_amount' => 5000,
        ]);

        $response = $this->actingAs($this->cashier)
            ->withHeader('X-Hotel-Context', $this->hotel->id)
            ->postJson('/api/v1/whatsapp/resend', [
                'booking_id' => $booking->id,
                'type' => 'PRE_CHECKIN_KYC',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $this->assertDatabaseHas('whatsapp_notifications', [
            'booking_id' => $booking->id,
            'message_type' => 'PRE_CHECKIN_KYC',
            'recipient_phone' => '+919876112233',
        ]);
    }

    public function test_can_send_daily_morning_summary_to_hotel_owner(): void
    {
        $response = $this->actingAs($this->owner)
            ->withHeader('X-Hotel-Context', $this->hotel->id)
            ->postJson('/api/v1/whatsapp/daily-summary');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $this->assertDatabaseHas('whatsapp_notifications', [
            'hotel_id' => $this->hotel->id,
            'message_type' => 'DAILY_OWNER_SUMMARY',
            'status' => 'DELIVERED',
        ]);
    }

    public function test_can_fetch_whatsapp_notification_audit_logs(): void
    {
        $response = $this->actingAs($this->owner)
            ->withHeader('X-Hotel-Context', $this->hotel->id)
            ->getJson('/api/v1/whatsapp/logs');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'logs' => [
                    'data',
                ],
            ]);
    }
}
