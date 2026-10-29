<?php

namespace Tests\Feature;

use App\Domain\ChannelManager\Models\OtaChannel;
use App\Domain\ChannelManager\Models\OtaSyncLog;
use App\Domain\FrontOffice\Models\Booking;
use App\Domain\Notifications\Models\WhatsAppNotification;
use App\Domain\Tenancy\Models\Hotel;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OtaChannelManagerAndSimulatorTest extends TestCase
{
    use RefreshDatabase;

    protected User $owner;
    protected User $cashier;
    protected Hotel $hotel;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        $this->owner = User::where('email', 'owner@apexhospitality.com')->first();
        $this->cashier = User::where('email', 'frontdesk.priya@apexhospitality.com')->first();
        $this->hotel = Hotel::where('hotel_code', 'HTL-1001')->first();
    }

    public function test_can_list_and_auto_seed_default_ota_channels(): void
    {
        $response = $this->actingAs($this->owner)
            ->withHeader('X-Hotel-Context', $this->hotel->id)
            ->getJson('/api/v1/ota/channels');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'channels',
                'metrics' => [
                    'total_ota_bookings',
                    'gross_ota_revenue',
                    'total_commission_paid',
                    'net_ota_payout',
                    'connected_channels_count',
                ],
            ]);

        $this->assertDatabaseHas('ota_channels', [
            'hotel_id' => $this->hotel->id,
            'channel_code' => 'MAKEMYTRIP',
            'is_connected' => true,
        ]);

        $this->assertDatabaseHas('ota_channels', [
            'hotel_id' => $this->hotel->id,
            'channel_code' => 'BOOKING_COM',
            'is_connected' => true,
        ]);
    }

    public function test_can_update_ota_channel_commission_and_connection(): void
    {
        // First seed channels
        $this->actingAs($this->owner)
            ->withHeader('X-Hotel-Context', $this->hotel->id)
            ->getJson('/api/v1/ota/channels');

        $response = $this->actingAs($this->owner)
            ->withHeader('X-Hotel-Context', $this->hotel->id)
            ->putJson('/api/v1/ota/channels/MAKEMYTRIP', [
                'commission_rate_percent' => 16.50,
                'hotel_channel_id' => 'MMT-MUM-9999',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'channel' => [
                    'channel_code' => 'MAKEMYTRIP',
                    'commission_rate_percent' => '16.50',
                    'hotel_channel_id' => 'MMT-MUM-9999',
                ],
            ]);

        $this->assertDatabaseHas('ota_channels', [
            'hotel_id' => $this->hotel->id,
            'channel_code' => 'MAKEMYTRIP',
            'commission_rate_percent' => 16.50,
            'hotel_channel_id' => 'MMT-MUM-9999',
        ]);
    }

    public function test_can_push_live_ari_inventory_to_connected_channels(): void
    {
        $response = $this->actingAs($this->owner)
            ->withHeader('X-Hotel-Context', $this->hotel->id)
            ->postJson('/api/v1/ota/channels/push-ari');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'synced_channels',
                'inventory_snapshot',
            ]);

        $this->assertDatabaseHas('ota_sync_logs', [
            'hotel_id' => $this->hotel->id,
            'direction' => 'OUTBOUND',
            'event_type' => 'ARI_PUSH',
            'status' => 'SUCCESS',
        ]);
    }

    public function test_can_simulate_inbound_makemytrip_booking_and_auto_allocate_room_and_folio(): void
    {
        $response = $this->actingAs($this->cashier)
            ->withHeader('X-Hotel-Context', $this->hotel->id)
            ->postJson('/api/v1/ota/simulate-booking', [
                'channel_code' => 'MAKEMYTRIP',
                'guest_name' => 'Aditi Singhania',
                'guest_phone' => '+919876001122',
                'guest_email' => 'aditi.s@example.com',
                'room_type' => 'DELUXE',
                'rate_per_night' => 3000,
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'financials' => [
                    'commission_percent' => 18,
                ],
            ]);

        $bookingId = $response->json('booking.id');
        $this->assertNotNull($bookingId);

        // Verify booking in Front Desk
        $booking = Booking::find($bookingId);
        $this->assertEquals('RESERVED', $booking->status);
        $this->assertEquals('PAID', $booking->payment_status);
        $this->assertStringContainsString('MakeMyTrip', $booking->special_requests);

        // Verify OTA Sync Log
        $this->assertDatabaseHas('ota_sync_logs', [
            'hotel_id' => $this->hotel->id,
            'channel_code' => 'MAKEMYTRIP',
            'direction' => 'INBOUND',
            'guest_name' => 'Aditi Singhania',
            'status' => 'SUCCESS',
        ]);

        // Verify WhatsApp Confirmation was sent
        $this->assertDatabaseHas('whatsapp_notifications', [
            'hotel_id' => $this->hotel->id,
            'booking_id' => $bookingId,
            'recipient_phone' => '+919876001122',
            'message_type' => 'BOOKING_CONFIRMATION',
        ]);
    }

    public function test_public_inbound_webhook_processes_booking(): void
    {
        // First seed channels
        $this->actingAs($this->owner)
            ->withHeader('X-Hotel-Context', $this->hotel->id)
            ->getJson('/api/v1/ota/channels');

        $channel = OtaChannel::where('hotel_id', $this->hotel->id)
            ->where('channel_code', 'BOOKING_COM')
            ->first();

        $response = $this->withHeader('X-Hotel-Channel-Id', $channel->hotel_channel_id)
            ->postJson('/api/v1/public/ota/webhook/BOOKING_COM', [
                'ota_reservation_id' => 'BKG-99228811',
                'guest_name' => 'Jonathan Vance',
                'guest_phone' => '+447911000999',
                'guest_email' => 'jonathan@example.com',
                'room_type' => 'DELUXE',
                'rate_per_night' => 3500,
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $this->assertDatabaseHas('ota_sync_logs', [
            'hotel_id' => $this->hotel->id,
            'channel_code' => 'BOOKING_COM',
            'ota_reservation_id' => 'BKG-99228811',
            'status' => 'SUCCESS',
        ]);
    }
}

