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

    public function test_future_date_advance_reservation_creates_reserved_booking_and_keeps_room_available(): void
    {
        $hotel = Hotel::where('hotel_code', 'HTL-1001')->first();
        $frontDeskStaff = User::where('email', 'frontdesk.priya@apexhospitality.com')->first();
        $room = $hotel->rooms()->where('status', 'AVAILABLE')->first();

        $futureCheckIn = Carbon::today()->addDays(10)->setTime(14, 0, 0);
        $futureCheckOut = Carbon::today()->addDays(13)->setTime(11, 0, 0);

        $response = $this->actingAs($frontDeskStaff)
            ->withHeaders(['X-Hotel-ID' => $hotel->id])
            ->postJson('/api/v1/front-office/check-in', [
                'first_name' => 'Vikram',
                'last_name' => 'Mehta',
                'phone' => '+91 99887 76655',
                'nationality' => 'Indian',
                'id_type' => 'AADHAAR',
                'id_number' => '9988-7766-5544',
                'room_id' => $room->id,
                'check_in_at' => $futureCheckIn->toDateTimeString(),
                'expected_check_out_at' => $futureCheckOut->toDateTimeString(),
                'room_rate_per_night' => (float) $room->base_price,
                'advance_deposit_amount' => 1500.00,
                'payment_method' => 'UPI_QR',
                'transaction_reference' => 'UPI-ADV-9988',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'booking' => [
                    'status' => 'RESERVED',
                    'total_nights' => 3,
                ],
            ]);

        // Room status must remain AVAILABLE today (not OCCUPIED)
        $this->assertEquals('AVAILABLE', $room->fresh()->status);

        // Advance payment was recorded
        $bookingId = $response->json('booking.id');
        $this->assertDatabaseHas('payments', [
            'booking_id' => $bookingId,
            'amount' => 1500.00,
        ]);

        // Folio item has 3 nights tariff
        $this->assertDatabaseHas('folio_items', [
            'booking_id' => $bookingId,
            'quantity' => 3,
            'item_type' => 'ROOM_CHARGE',
        ]);

        // Overlapping reservation for the same room must be rejected
        $overlappingCheckIn = Carbon::today()->addDays(11)->setTime(12, 0, 0);
        $overlappingCheckOut = Carbon::today()->addDays(14)->setTime(11, 0, 0);

        $conflictResponse = $this->actingAs($frontDeskStaff)
            ->withHeaders(['X-Hotel-ID' => $hotel->id])
            ->postJson('/api/v1/front-office/check-in', [
                'first_name' => 'Amit',
                'last_name' => 'Verma',
                'phone' => '+91 91234 56789',
                'nationality' => 'Indian',
                'id_type' => 'AADHAAR',
                'id_number' => '1122-3344-5566',
                'room_id' => $room->id,
                'check_in_at' => $overlappingCheckIn->toDateTimeString(),
                'expected_check_out_at' => $overlappingCheckOut->toDateTimeString(),
            ]);

        $conflictResponse->assertStatus(422)
            ->assertJson([
                'success' => false,
            ]);
        $this->assertStringContainsString('already booked', $conflictResponse->json('message'));
    }

    /**
     * Test country column and mandatory co-guests KYC registration.
     */
    public function test_checkin_supports_country_and_enforces_all_room_guests_kyc(): void
    {
        $hotel = Hotel::first();
        $frontDeskStaff = User::where('email', 'frontdesk.priya@apexhospitality.com')->first();
        $room = Room::where('hotel_id', $hotel->id)->where('status', 'AVAILABLE')->first();

        // 1. Room with 2 adults but missing co-guest details -> Rejected with 422!
        $missingGuestRes = $this->actingAs($frontDeskStaff)
            ->withHeaders(['X-Hotel-ID' => $hotel->id])
            ->postJson('/api/v1/front-office/check-in', [
                'first_name' => 'Kunal',
                'last_name' => 'Kapoor',
                'phone' => '+91 98888 11223',
                'nationality' => 'Indian',
                'id_type' => 'AADHAAR',
                'id_number' => '1234-5678-9012',
                'address' => '10 Marine Drive',
                'city' => 'Mumbai',
                'state' => 'Maharashtra',
                'country' => 'India',
                'room_id' => $room->id,
                'num_adults' => 2, // 2 Adults!
                'co_guests' => [], // Empty co-guests!
                'expected_check_out_at' => Carbon::now()->addDay()->toDateTimeString(),
            ]);

        $missingGuestRes->assertStatus(422)
            ->assertJsonPath('success', false);
        $this->assertStringContainsString('Details for all occupants are required', $missingGuestRes->json('message'));

        // 2. Room with 2 adults + 1 child and complete KYC and addresses for all occupants -> Accepted (201 Created)!
        $validRes = $this->actingAs($frontDeskStaff)
            ->withHeaders(['X-Hotel-ID' => $hotel->id])
            ->postJson('/api/v1/front-office/check-in', [
                'first_name' => 'Kunal',
                'last_name' => 'Kapoor',
                'phone' => '+91 98888 11223',
                'nationality' => 'Indian',
                'id_type' => 'AADHAAR',
                'id_number' => '1234-5678-9012',
                'address' => '10 Marine Drive',
                'city' => 'Mumbai',
                'state' => 'Maharashtra',
                'country' => 'India',
                'room_id' => $room->id,
                'num_adults' => 2,
                'num_children' => 1,
                'co_guests' => [
                    [
                        'guest_category' => 'ADULT',
                        'first_name' => 'Pooja',
                        'last_name' => 'Kapoor',
                        'gender' => 'FEMALE',
                        'age' => 27,
                        'phone' => '+91 98888 44556',
                        'id_type' => 'AADHAAR',
                        'id_number' => '9876-5432-1098',
                        'relationship' => 'Spouse',
                        'nationality' => 'Indian',
                        'address' => '10 Marine Drive',
                        'city' => 'Mumbai',
                        'state' => 'Maharashtra',
                        'country' => 'India',
                    ],
                    [
                        'guest_category' => 'CHILD',
                        'first_name' => 'Aarav',
                        'last_name' => 'Kapoor',
                        'gender' => 'MALE',
                        'age' => 6,
                        'phone' => '+91 98888 11223',
                        'id_type' => 'AADHAAR',
                        'id_number' => 'BAL-9988-7766',
                        'relationship' => 'Child',
                        'nationality' => 'Indian',
                        'address' => '10 Marine Drive',
                        'city' => 'Mumbai',
                        'state' => 'Maharashtra',
                        'country' => 'India',
                    ],
                ],
                'expected_check_out_at' => Carbon::now()->addDay()->toDateTimeString(),
            ]);

        $validRes->assertStatus(201);
        $bookingId = $validRes->json('booking.id');

        // Verify country is saved in guests table
        $this->assertDatabaseHas('guests', [
            'first_name' => 'Kunal',
            'country' => 'India',
        ]);

        // Verify adult co-guest is saved in booking_guests table with address
        $this->assertDatabaseHas('booking_guests', [
            'booking_id' => $bookingId,
            'guest_category' => 'ADULT',
            'first_name' => 'Pooja',
            'last_name' => 'Kapoor',
            'id_number' => '9876-5432-1098',
            'relationship' => 'Spouse',
            'city' => 'Mumbai',
            'country' => 'India',
        ]);

        // Verify child co-guest is saved in booking_guests table with address
        $this->assertDatabaseHas('booking_guests', [
            'booking_id' => $bookingId,
            'guest_category' => 'CHILD',
            'first_name' => 'Aarav',
            'last_name' => 'Kapoor',
            'age' => 6,
            'id_number' => 'BAL-9988-7766',
            'relationship' => 'Child',
            'city' => 'Mumbai',
            'country' => 'India',
        ]);
    }
}
