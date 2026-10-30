<?php

namespace Tests\Feature;

use App\Domain\FrontOffice\Models\Booking;
use App\Domain\FrontOffice\Models\LostAndFoundItem;
use App\Domain\FrontOffice\Models\Room;
use App\Domain\Tenancy\Models\Hotel;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LostAndFoundTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        $this->seed(\Database\Seeders\FrontOfficeSeeder::class);
    }

    public function test_can_log_new_lost_item_with_auto_reference_number(): void
    {
        $hotel = Hotel::where('hotel_code', 'HTL-1001')->first();
        $staff = User::where('email', 'frontdesk.priya@apexhospitality.com')->first();
        $room = Room::where('hotel_id', $hotel->id)->first();

        $payload = [
            'item_name' => 'Apple AirPods Pro 2nd Gen',
            'category' => 'ELECTRONICS',
            'found_location_type' => 'ROOM',
            'room_id' => $room->id,
            'specific_location' => 'Under bedside drawer',
            'found_by_name' => 'Suresh Kumar (Housekeeping)',
            'storage_location' => 'Safe Locker Box #04',
            'description' => 'White case with silicon blue cover and initials RK',
            'estimated_value' => 24900,
        ];

        $response = $this->actingAs($staff)
            ->withHeaders(['X-Hotel-ID' => $hotel->id])
            ->postJson('/api/v1/front-office/lost-and-found', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('item.item_name', 'Apple AirPods Pro 2nd Gen')
            ->assertJsonPath('item.status', 'IN_CUSTODY');

        $refNo = $response->json('item.reference_no');
        $this->assertStringStartsWith('LF-', $refNo);

        $this->assertDatabaseHas('lost_and_found_items', [
            'hotel_id' => $hotel->id,
            'item_name' => 'Apple AirPods Pro 2nd Gen',
            'category' => 'ELECTRONICS',
            'status' => 'IN_CUSTODY',
            'reference_no' => $refNo,
        ]);
    }

    public function test_logging_item_in_occupied_room_autofills_guest_details(): void
    {
        $hotel = Hotel::where('hotel_code', 'HTL-1001')->first();
        $staff = User::where('email', 'frontdesk.priya@apexhospitality.com')->first();
        $activeBooking = Booking::where('hotel_id', $hotel->id)->where('status', 'CHECKED_IN')->with('guest')->first();
        $this->assertNotNull($activeBooking);

        $payload = [
            'item_name' => 'Car Key Fob with BMW Emblem',
            'category' => 'VALUABLES',
            'found_location_type' => 'ROOM',
            'room_id' => $activeBooking->room_id,
            'found_by_name' => 'Sunita (HK)',
            'storage_location' => 'Safe Locker Box #01',
        ];

        $response = $this->actingAs($staff)
            ->withHeaders(['X-Hotel-ID' => $hotel->id])
            ->postJson('/api/v1/front-office/lost-and-found', $payload);

        $response->assertStatus(201);
        $this->assertEquals($activeBooking->guest->name, $response->json('item.guest_name'));
        $this->assertEquals($activeBooking->id, $response->json('item.booking_id'));
    }

    public function test_can_list_items_with_summary_and_status_filtering(): void
    {
        $hotel = Hotel::where('hotel_code', 'HTL-1001')->first();
        $staff = User::where('email', 'frontdesk.priya@apexhospitality.com')->first();

        // Create 2 items: 1 in custody, 1 claimed
        $hotel->lostAndFoundItems()->create([
            'reference_no' => 'LF-20261030-001',
            'item_name' => 'Titan Quartz Watch',
            'category' => 'VALUABLES',
            'found_location_type' => 'RESTAURANT',
            'found_at' => Carbon::now()->subDays(2),
            'found_by_name' => 'Chef Vikram',
            'storage_location' => 'Locker A',
            'status' => LostAndFoundItem::STATUS_IN_CUSTODY,
        ]);

        $hotel->lostAndFoundItems()->create([
            'reference_no' => 'LF-20261030-002',
            'item_name' => 'Black Leather Wallet',
            'category' => 'DOCUMENTS',
            'found_location_type' => 'LOBBY',
            'found_at' => Carbon::now()->subDays(1),
            'found_by_name' => 'Security Guard Santosh',
            'storage_location' => 'Locker B',
            'status' => LostAndFoundItem::STATUS_CLAIMED,
            'claimed_at' => Carbon::now(),
            'claimed_by_name' => 'Aditya Sharma',
            'claimed_by_phone' => '+91 9988776655',
            'handover_by_staff_name' => 'Priya Desk Manager',
        ]);

        // Get ALL items
        $response = $this->actingAs($staff)
            ->withHeaders(['X-Hotel-ID' => $hotel->id])
            ->getJson('/api/v1/front-office/lost-and-found');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('summary.total_items', 2)
            ->assertJsonPath('summary.in_custody', 1)
            ->assertJsonPath('summary.claimed', 1);

        // Filter by IN_CUSTODY
        $filterResponse = $this->actingAs($staff)
            ->withHeaders(['X-Hotel-ID' => $hotel->id])
            ->getJson('/api/v1/front-office/lost-and-found?status=IN_CUSTODY');

        $filterResponse->assertStatus(200);
        $items = $filterResponse->json('items.data');
        $this->assertCount(1, $items);
        $this->assertEquals('Titan Quartz Watch', $items[0]['item_name']);
    }

    public function test_can_claim_and_handover_item_with_id_proof(): void
    {
        $hotel = Hotel::where('hotel_code', 'HTL-1001')->first();
        $staff = User::where('email', 'frontdesk.priya@apexhospitality.com')->first();

        $item = $hotel->lostAndFoundItems()->create([
            'reference_no' => 'LF-20261030-003',
            'item_name' => 'Passport & Visa Documents',
            'category' => 'DOCUMENTS',
            'found_location_type' => 'ROOM',
            'found_at' => Carbon::now()->subHours(5),
            'found_by_name' => 'Sunita (Housekeeping)',
            'storage_location' => 'Front Desk Main Safe',
            'status' => LostAndFoundItem::STATUS_IN_CUSTODY,
            'guest_name' => 'Johnathan Smith',
            'guest_phone' => '+44 7700900077',
        ]);

        $claimPayload = [
            'claimed_by_name' => 'Johnathan Smith',
            'claimed_by_phone' => '+44 7700900077',
            'claimed_by_id_proof' => 'UK Passport #987654321',
            'handover_by_staff_name' => 'Priya Sharma (Front Desk)',
            'handover_notes' => 'Verified face with passport photo and signature before handover',
        ];

        $response = $this->actingAs($staff)
            ->withHeaders(['X-Hotel-ID' => $hotel->id])
            ->postJson("/api/v1/front-office/lost-and-found/{$item->id}/claim", $claimPayload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('item.status', 'CLAIMED')
            ->assertJsonPath('item.claimed_by_name', 'Johnathan Smith')
            ->assertJsonPath('item.claimed_by_id_proof', 'UK Passport #987654321');

        $this->assertDatabaseHas('lost_and_found_items', [
            'id' => $item->id,
            'status' => 'CLAIMED',
            'claimed_by_name' => 'Johnathan Smith',
        ]);
    }

    public function test_can_dispose_unclaimed_or_perishable_item(): void
    {
        $hotel = Hotel::where('hotel_code', 'HTL-1001')->first();
        $staff = User::where('email', 'frontdesk.priya@apexhospitality.com')->first();

        $item = $hotel->lostAndFoundItems()->create([
            'reference_no' => 'LF-20261030-004',
            'item_name' => 'Perishable Bakery Box',
            'category' => 'OTHERS',
            'found_location_type' => 'RESTAURANT',
            'found_at' => Carbon::now()->subDays(3),
            'found_by_name' => 'Server Rajesh',
            'storage_location' => 'Pantry Storage',
            'status' => LostAndFoundItem::STATUS_IN_CUSTODY,
        ]);

        $disposePayload = [
            'disposal_reason' => 'Perishable food item expired after 72 hours storage policy',
            'handover_by_staff_name' => 'Priya Sharma (Duty Manager)',
            'handover_notes' => 'Disposed in bio-waste with manager approval',
        ];

        $response = $this->actingAs($staff)
            ->withHeaders(['X-Hotel-ID' => $hotel->id])
            ->postJson("/api/v1/front-office/lost-and-found/{$item->id}/dispose", $disposePayload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('item.status', 'DISPOSED')
            ->assertJsonPath('item.disposal_reason', 'Perishable food item expired after 72 hours storage policy');

        $this->assertDatabaseHas('lost_and_found_items', [
            'id' => $item->id,
            'status' => 'DISPOSED',
        ]);
    }

    public function test_multi_tenant_isolation_prevents_cross_hotel_access(): void
    {
        $hotelA = Hotel::where('hotel_code', 'HTL-1001')->first();
        $hotelB = Hotel::where('hotel_code', 'HTL-1002')->first();
        $owner = User::where('email', 'owner@apexhospitality.com')->first();

        $itemA = $hotelA->lostAndFoundItems()->create([
            'reference_no' => 'LF-20261030-005',
            'item_name' => 'Diamond Ring in Velvet Box',
            'category' => 'VALUABLES',
            'found_location_type' => 'ROOM',
            'found_at' => Carbon::now(),
            'found_by_name' => 'Staff A',
            'storage_location' => 'Hotel A Safe Locker',
            'status' => LostAndFoundItem::STATUS_IN_CUSTODY,
        ]);

        // Owner is valid for Hotel B, but itemA belongs to Hotel A -> returns 404
        $response = $this->actingAs($owner)
            ->withHeaders(['X-Hotel-ID' => $hotelB->id])
            ->getJson("/api/v1/front-office/lost-and-found/{$itemA->id}");

        $response->assertStatus(404);
    }
}
