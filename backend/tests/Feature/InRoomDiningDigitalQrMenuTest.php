<?php

namespace Tests\Feature;

use App\Domain\FrontOffice\Models\Booking;
use App\Domain\FrontOffice\Models\Room;
use App\Domain\Restaurant\Models\MenuItem;
use App\Domain\Restaurant\Models\RestaurantOrder;
use App\Domain\Tenancy\Models\Hotel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InRoomDiningDigitalQrMenuTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_guest_can_access_in_room_dining_menu_for_checked_in_room(): void
    {
        // Hotel B (HTL-1002) has restaurant module enabled
        $hotelB = Hotel::where('hotel_code', 'HTL-1002')->first();
        $this->assertNotNull($hotelB);

        // Find or create checked-in room
        $room = $hotelB->rooms()->first();
        $this->assertNotNull($room);

        // Call public endpoint
        $response = $this->getJson("/api/v1/public/room-dining/{$hotelB->hotel_code}/{$room->room_number}");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'hotel' => [
                        'code' => $hotelB->hotel_code,
                        'name' => $hotelB->name,
                    ],
                    'room' => [
                        'room_number' => $room->room_number,
                    ],
                ],
            ])
            ->assertJsonStructure([
                'success',
                'data' => [
                    'hotel',
                    'room',
                    'guest',
                    'can_order',
                    'categories',
                    'menu_items',
                ],
            ]);
    }

    public function test_guest_can_place_order_and_auto_charge_to_room_folio(): void
    {
        $hotelB = Hotel::where('hotel_code', 'HTL-1002')->first();
        $room = $hotelB->rooms()->first();

        $guest = \App\Domain\FrontOffice\Models\Guest::create([
            'hotel_id' => $hotelB->id,
            'first_name' => 'Rahul',
            'last_name' => 'Verma',
            'phone' => '+91 9876543210',
            'id_type' => 'AADHAAR',
            'id_number' => '1234-5678-9012',
        ]);

        // Ensure active checked-in booking
        $booking = Booking::create([
            'hotel_id' => $hotelB->id,
            'booking_number' => 'BKG-TEST-101',
            'guest_id' => $guest->id,
            'room_id' => $room->id,
            'check_in_at' => now(),
            'expected_check_out_at' => now()->addDays(2),
            'room_rate_per_night' => 1500,
            'total_nights' => 2,
            'status' => 'CHECKED_IN',
            'total_room_charges' => 3000,
            'total_extra_charges' => 0,
            'tax_amount' => 360,
            'discount_amount' => 0,
            'grand_total' => 3360,
            'paid_amount' => 1000,
            'balance_amount' => 2360,
            'payment_status' => 'PARTIAL',
        ]);

        $menuItem = MenuItem::where('hotel_id', $hotelB->id)->where('is_available', true)->first();
        $this->assertNotNull($menuItem);

        // Place Order from Mobile
        $orderResponse = $this->postJson("/api/v1/public/room-dining/{$hotelB->hotel_code}/{$room->room_number}/order", [
            'items' => [
                [
                    'menu_item_id' => $menuItem->id,
                    'quantity' => 2,
                    'special_notes' => 'Please serve hot with extra mint chutney',
                ],
            ],
            'special_instructions' => 'Do not ring door bell, knock gently',
            'settlement_preference' => 'ROOM_FOLIO',
        ]);

        $orderResponse->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'room_number' => $room->room_number,
                    'settlement_method' => 'ROOM_FOLIO',
                    'status' => 'RECEIVED',
                ],
            ]);

        $orderNumber = $orderResponse->json('data.order_number');
        $this->assertNotNull($orderNumber);

        // Verify Order in DB
        $order = RestaurantOrder::where('order_number', $orderNumber)->first();
        $this->assertEquals(RestaurantOrder::ORDER_TYPE_ROOM_SERVICE, $order->order_type);
        $this->assertEquals($room->id, $order->room_id);
        $this->assertEquals($booking->id, $order->booking_id);

        // Verify Folio charge created and booking balance updated
        $booking->refresh();
        $this->assertGreaterThan(0, $booking->total_extra_charges);
        $this->assertEquals($order->grand_total, $booking->total_extra_charges);

        // Verify Live Order Tracking
        $trackResponse = $this->getJson("/api/v1/public/room-dining/orders/{$orderNumber}");
        $trackResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'order_number' => $orderNumber,
                    'overall_step' => 'RECEIVED',
                    'step_index' => 1,
                ],
            ]);
    }

    public function test_cannot_place_room_order_if_room_is_vacant(): void
    {
        $hotelB = Hotel::where('hotel_code', 'HTL-1002')->first();
        $room = $hotelB->rooms()->first();

        // Make sure no checked in booking for this room
        Booking::where('room_id', $room->id)->update(['status' => 'CHECKED_OUT']);

        $menuItem = MenuItem::where('hotel_id', $hotelB->id)->where('is_available', true)->first();

        $response = $this->postJson("/api/v1/public/room-dining/{$hotelB->hotel_code}/{$room->room_number}/order", [
            'items' => [
                [
                    'menu_item_id' => $menuItem->id,
                    'quantity' => 1,
                ],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'error_code' => 'NO_ACTIVE_BOOKING',
            ]);
    }
}
