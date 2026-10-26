<?php

namespace Database\Seeders;

use App\Domain\FrontOffice\Models\Booking;
use App\Domain\FrontOffice\Models\FolioItem;
use App\Domain\FrontOffice\Models\Guest;
use App\Domain\FrontOffice\Models\Payment;
use App\Domain\FrontOffice\Models\Room;
use App\Domain\Tenancy\Models\Hotel;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class FrontOfficeSeeder extends Seeder
{
    public function run(): void
    {
        $hotels = Hotel::all();

        foreach ($hotels as $hotel) {
            // Seed Rooms for each hotel if none exist
            if ($hotel->rooms()->count() === 0) {
                $roomTemplates = [
                    ['room_number' => '101', 'room_type' => 'Deluxe King Room', 'floor' => '1st Floor', 'base_price' => 2800.00, 'status' => 'OCCUPIED'],
                    ['room_number' => '102', 'room_type' => 'Deluxe King Room', 'floor' => '1st Floor', 'base_price' => 2800.00, 'status' => 'AVAILABLE'],
                    ['room_number' => '103', 'room_type' => 'Executive Suite', 'floor' => '1st Floor', 'base_price' => 4500.00, 'status' => 'AVAILABLE'],
                    ['room_number' => '104', 'room_type' => 'Executive Suite', 'floor' => '1st Floor', 'base_price' => 4500.00, 'status' => 'DIRTY'],
                    ['room_number' => '201', 'room_type' => 'Deluxe Twin Room', 'floor' => '2nd Floor', 'base_price' => 2600.00, 'status' => 'OCCUPIED'],
                    ['room_number' => '202', 'room_type' => 'Deluxe Twin Room', 'floor' => '2nd Floor', 'base_price' => 2600.00, 'status' => 'AVAILABLE'],
                    ['room_number' => '203', 'room_type' => 'Presidential Royal Suite', 'floor' => '2nd Floor', 'base_price' => 7500.00, 'status' => 'AVAILABLE'],
                    ['room_number' => '204', 'room_type' => 'Standard Single Room', 'floor' => '2nd Floor', 'base_price' => 1900.00, 'status' => 'MAINTENANCE'],
                ];

                foreach ($roomTemplates as $rt) {
                    Room::create([
                        'hotel_id' => $hotel->id,
                        'room_number' => $rt['room_number'],
                        'room_type' => $rt['room_type'],
                        'floor' => $rt['floor'],
                        'base_price' => $rt['base_price'],
                        'status' => $rt['status'],
                        'max_guests' => 2,
                        'amenities' => ['High-Speed WiFi', 'Smart TV', 'AC', 'Mini Fridge', 'Tea/Coffee Maker'],
                    ]);
                }
            }

            // Seed Sample In-House Checked-in Guests for HTL-1001 & HTL-1002
            if ($hotel->hotel_code === 'HTL-1001' || $hotel->hotel_code === 'HTL-1002') {
                $room101 = Room::where('hotel_id', $hotel->id)->where('room_number', '101')->first();
                $room201 = Room::where('hotel_id', $hotel->id)->where('room_number', '201')->first();

                // Guest 1: Checked in Room 101 with Aadhaar Card
                if ($room101 && $hotel->bookings()->count() === 0) {
                    $guest1 = Guest::create([
                        'hotel_id' => $hotel->id,
                        'first_name' => 'Aditya',
                        'last_name' => 'Roy',
                        'email' => 'aditya.roy@example.com',
                        'phone' => '+91 9820123456',
                        'nationality' => 'Indian',
                        'id_type' => 'AADHAAR',
                        'id_number' => 'XXXX-XXXX-8912',
                        'id_document_path' => 'verified_aadhaar_scan.pdf',
                        'address' => '42 Park Street, Bandra West',
                        'city' => 'Mumbai',
                        'state' => 'Maharashtra',
                        'purpose_of_visit' => 'Corporate Business Meeting',
                    ]);

                    $booking1 = Booking::create([
                        'hotel_id' => $hotel->id,
                        'booking_number' => 'BK-' . rand(10001, 19999),
                        'guest_id' => $guest1->id,
                        'room_id' => $room101->id,
                        'check_in_at' => Carbon::now()->subDay()->setHour(14)->setMinute(0),
                        'expected_check_out_at' => Carbon::now()->addDays(2)->setHour(11)->setMinute(0),
                        'num_adults' => 2,
                        'num_children' => 0,
                        'status' => 'CHECKED_IN',
                        'room_rate_per_night' => $room101->base_price,
                        'total_nights' => 3,
                        'total_room_charges' => $room101->base_price * 3, // 8400
                        'total_extra_charges' => 0,
                        'tax_amount' => 0,
                        'discount_amount' => 0,
                        'grand_total' => 0,
                        'paid_amount' => 0,
                        'balance_amount' => 0,
                        'payment_status' => 'PENDING',
                        'special_requests' => 'Non-smoking floor, late check-out requested.',
                    ]);

                    // Add room charge item
                    FolioItem::create([
                        'booking_id' => $booking1->id,
                        'item_type' => 'ROOM_CHARGE',
                        'description' => 'Room Tariff (3 Nights x ₹2,800)',
                        'quantity' => 3,
                        'unit_price' => 2800.00,
                        'total_price' => 8400.00,
                        'charged_at' => Carbon::now()->subDay(),
                    ]);

                    // Add Food & Beverage room service
                    FolioItem::create([
                        'booking_id' => $booking1->id,
                        'item_type' => 'FOOD_BEVERAGE',
                        'description' => 'Dinner Room Service (Biryani + Beverages)',
                        'quantity' => 1,
                        'unit_price' => 850.00,
                        'total_price' => 850.00,
                        'charged_at' => Carbon::now()->subHours(18),
                    ]);

                    // Add Advance Deposit Payment
                    Payment::create([
                        'booking_id' => $booking1->id,
                        'receipt_number' => 'REC-' . rand(5001, 9999),
                        'amount' => 5000.00,
                        'payment_method' => 'UPI_QR',
                        'transaction_reference' => 'UPI/GPay/9820123/20261025',
                        'payment_type' => 'ADVANCE_DEPOSIT',
                        'notes' => 'Received ₹5000 advance via Google Pay QR at check-in counter.',
                    ]);

                    $booking1->recalculateTotals();
                }

                // Guest 2: Checked in Room 201 with Passport
                if ($room201 && $hotel->bookings()->count() <= 1) {
                    $guest2 = Guest::create([
                        'hotel_id' => $hotel->id,
                        'first_name' => 'Michael',
                        'last_name' => 'Anderson',
                        'email' => 'm.anderson@uk-corp.co.uk',
                        'phone' => '+44 7700 900123',
                        'nationality' => 'British',
                        'id_type' => 'PASSPORT',
                        'id_number' => 'GBR-98432170',
                        'id_document_path' => 'passport_and_visa_copy.pdf',
                        'address' => '12 Victoria Road, Kensington',
                        'city' => 'London',
                        'state' => 'Greater London',
                        'purpose_of_visit' => 'International Tourism (Form C Verified)',
                    ]);

                    $booking2 = Booking::create([
                        'hotel_id' => $hotel->id,
                        'booking_number' => 'BK-' . rand(20001, 29999),
                        'guest_id' => $guest2->id,
                        'room_id' => $room201->id,
                        'check_in_at' => Carbon::now()->setHour(12)->setMinute(30),
                        'expected_check_out_at' => Carbon::now()->addDays(1)->setHour(11)->setMinute(0),
                        'num_adults' => 1,
                        'num_children' => 0,
                        'status' => 'CHECKED_IN',
                        'room_rate_per_night' => $room201->base_price,
                        'total_nights' => 1,
                        'total_room_charges' => $room201->base_price * 1,
                        'total_extra_charges' => 0,
                        'tax_amount' => 0,
                        'discount_amount' => 0,
                        'grand_total' => 0,
                        'paid_amount' => 0,
                        'balance_amount' => 0,
                        'payment_status' => 'PENDING',
                        'special_requests' => 'Airport drop required tomorrow 9 AM.',
                    ]);

                    FolioItem::create([
                        'booking_id' => $booking2->id,
                        'item_type' => 'ROOM_CHARGE',
                        'description' => 'Room Tariff (1 Night x ₹2,600)',
                        'quantity' => 1,
                        'unit_price' => 2600.00,
                        'total_price' => 2600.00,
                        'charged_at' => Carbon::now(),
                    ]);

                    Payment::create([
                        'booking_id' => $booking2->id,
                        'receipt_number' => 'REC-' . rand(5001, 9999),
                        'amount' => 2600.00,
                        'payment_method' => 'CARD',
                        'transaction_reference' => 'VISA-CHIP-4821',
                        'payment_type' => 'ADVANCE_DEPOSIT',
                        'notes' => 'Pre-authorized international Visa card payment.',
                    ]);

                    $booking2->recalculateTotals();
                }
            }
        }
    }
}
