<?php

namespace Tests\Feature;

use App\Domain\FrontOffice\Models\Booking;
use App\Domain\FrontOffice\Models\Room;
use App\Domain\Tenancy\Models\Hotel;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FrontOfficeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        $this->seed(\Database\Seeders\FrontOfficeSeeder::class);
    }

    public function test_can_get_front_office_overview(): void
    {
        $hotel = Hotel::where('hotel_code', 'HTL-1001')->first();
        $frontDeskStaff = User::where('email', 'frontdesk.priya@apexhospitality.com')->first();

        $response = $this->actingAs($frontDeskStaff)
            ->withHeaders(['X-Hotel-ID' => $hotel->id])
            ->getJson('/api/v1/front-office/overview');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'hotel' => ['id', 'hotel_code', 'name'],
                'metrics' => [
                    'total_rooms',
                    'occupied_rooms',
                    'available_rooms',
                    'occupancy_rate',
                    'in_house_guests',
                ],
            ]);
    }

    public function test_guest_walk_in_check_in_with_kyc_and_room_allocation(): void
    {
        $hotel = Hotel::where('hotel_code', 'HTL-1001')->first();
        $frontDeskStaff = User::where('email', 'frontdesk.priya@apexhospitality.com')->first();
        $availableRoom = Room::where('hotel_id', $hotel->id)->where('status', 'AVAILABLE')->first();
        $this->assertNotNull($availableRoom);

        $payload = [
            'first_name' => 'Kavita',
            'last_name' => 'Krishnan',
            'phone' => '+91 9811223344',
            'email' => 'kavita.k@example.com',
            'nationality' => 'Indian',
            'id_type' => 'AADHAAR',
            'id_number' => '9988-7766-5544',
            'address' => '10 MG Road',
            'city' => 'Bengaluru',
            'state' => 'Karnataka',
            'purpose_of_visit' => 'Conference',
            'room_id' => $availableRoom->id,
            'expected_check_out_at' => Carbon::now()->addDays(2)->toIso8601String(),
            'num_adults' => 2,
            'advance_deposit_amount' => 2000.00,
            'payment_method' => 'UPI_QR',
        ];

        $response = $this->actingAs($frontDeskStaff)
            ->withHeaders(['X-Hotel-ID' => $hotel->id])
            ->postJson('/api/v1/front-office/check-in', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
            ]);

        // Assert room status changed to OCCUPIED
        $this->assertEquals('OCCUPIED', $availableRoom->fresh()->status);

        // Assert booking and guest created
        $this->assertDatabaseHas('guests', [
            'phone' => '+91 9811223344',
            'id_number' => '9988-7766-5544',
        ]);
    }

    public function test_cannot_check_in_to_already_occupied_room(): void
    {
        $hotel = Hotel::where('hotel_code', 'HTL-1001')->first();
        $frontDeskStaff = User::where('email', 'frontdesk.priya@apexhospitality.com')->first();
        $occupiedRoom = Room::where('hotel_id', $hotel->id)->where('status', 'OCCUPIED')->first();
        $this->assertNotNull($occupiedRoom);

        $payload = [
            'first_name' => 'Test',
            'phone' => '+91 9999988888',
            'nationality' => 'Indian',
            'id_type' => 'DRIVING_LICENSE',
            'id_number' => 'DL-12345',
            'room_id' => $occupiedRoom->id,
            'expected_check_out_at' => Carbon::now()->addDay()->toIso8601String(),
        ];

        $response = $this->actingAs($frontDeskStaff)
            ->withHeaders(['X-Hotel-ID' => $hotel->id])
            ->postJson('/api/v1/front-office/check-in', $payload);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
            ]);
    }

    public function test_can_add_folio_extra_charge_and_settle_checkout(): void
    {
        $hotel = Hotel::where('hotel_code', 'HTL-1001')->first();
        $frontDeskStaff = User::where('email', 'frontdesk.priya@apexhospitality.com')->first();
        $booking = Booking::where('hotel_id', $hotel->id)->where('status', 'CHECKED_IN')->first();
        $this->assertNotNull($booking);

        // 1. Post laundry extra charge
        $chargeResponse = $this->actingAs($frontDeskStaff)
            ->withHeaders(['X-Hotel-ID' => $hotel->id])
            ->postJson("/api/v1/front-office/bookings/{$booking->id}/folio-items", [
                'item_type' => 'LAUNDRY',
                'description' => 'Express Dry Cleaning (2 Suits)',
                'quantity' => 2,
                'unit_price' => 350.00,
            ]);

        $chargeResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $this->assertDatabaseHas('folio_items', [
            'booking_id' => $booking->id,
            'item_type' => 'LAUNDRY',
            'total_price' => 700.00,
        ]);

        // 2. Checkout and settle bill
        $checkOutResponse = $this->actingAs($frontDeskStaff)
            ->withHeaders(['X-Hotel-ID' => $hotel->id])
            ->postJson("/api/v1/front-office/bookings/{$booking->id}/check-out", [
                'settlement_amount' => $booking->fresh()->balance_amount,
                'payment_method' => 'UPI_QR',
            ]);

        $checkOutResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'invoice' => [
                    'invoice_number',
                    'hotel',
                    'guest',
                    'stay',
                    'charges',
                ],
            ]);

        // Booking status is CHECKED_OUT
        $this->assertEquals('CHECKED_OUT', $booking->fresh()->status);
        // Room status is DIRTY for housekeeping
        $this->assertEquals('DIRTY', $booking->room->fresh()->status);
    }

    public function test_can_get_1_month_room_occupancy_calendar_and_availability(): void
    {
        $hotel = Hotel::where('hotel_code', 'HTL-1001')->first();
        $frontDeskStaff = User::where('email', 'frontdesk.priya@apexhospitality.com')->first();

        $response = $this->actingAs($frontDeskStaff)
            ->withHeaders(['X-Hotel-ID' => $hotel->id])
            ->getJson('/api/v1/front-office/rooms/calendar?month=' . Carbon::now()->format('Y-m'));

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'start_date',
                'end_date',
                'range_label',
                'days_count',
                'month',
                'month_label',
                'days_in_month',
                'days',
                'rooms' => [
                    '*' => [
                        'id',
                        'room_number',
                        'room_type',
                        'base_price',
                        'days' => [
                            '*' => [
                                'day',
                                'date',
                                'status',
                            ],
                        ],
                    ],
                ],
                'daily_aggregates',
            ]);

        // Also test default call without parameters: starts from TODAY for 30 days
        $defaultResponse = $this->actingAs($frontDeskStaff)
            ->withHeaders(['X-Hotel-ID' => $hotel->id])
            ->getJson('/api/v1/front-office/rooms/calendar');

        $defaultResponse->assertStatus(200);
        $this->assertEquals(Carbon::today()->format('Y-m-d'), $defaultResponse->json('start_date'));
        $this->assertEquals(30, $defaultResponse->json('days_count'));
        $this->assertEquals(30, count($defaultResponse->json('days')));
        $this->assertTrue($defaultResponse->json('days.0.is_today'));
    }
}
