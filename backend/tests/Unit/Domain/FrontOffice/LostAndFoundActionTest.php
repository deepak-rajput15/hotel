<?php

namespace Tests\Unit\Domain\FrontOffice;

use App\Domain\FrontOffice\Actions\ClaimLostItemAction;
use App\Domain\FrontOffice\Actions\DisposeLostItemAction;
use App\Domain\FrontOffice\Actions\LogLostItemAction;
use App\Domain\FrontOffice\Models\LostAndFoundItem;
use App\Domain\Tenancy\Models\Hotel;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class LostAndFoundActionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        $this->seed(\Database\Seeders\FrontOfficeSeeder::class);
    }

    public function test_log_lost_item_action_creates_record_in_custody(): void
    {
        $hotel = Hotel::where('hotel_code', 'HTL-1001')->first();
        $staff = User::where('email', 'frontdesk.priya@apexhospitality.com')->first();
        $action = new LogLostItemAction();

        $item = $action->execute($hotel, [
            'item_name' => 'Sony Wireless Headphones WH-1000XM5',
            'category' => 'ELECTRONICS',
            'found_location_type' => 'LOBBY',
            'specific_location' => 'Sofa near glass fountain',
            'found_by_name' => 'Sunil Security',
            'storage_location' => 'Front Desk Safe Locker #03',
            'estimated_value' => 29000,
        ], $staff);

        $this->assertInstanceOf(LostAndFoundItem::class, $item);
        $this->assertEquals(LostAndFoundItem::STATUS_IN_CUSTODY, $item->status);
        $this->assertStringStartsWith('LF-', $item->reference_no);
        $this->assertEquals($hotel->id, $item->hotel_id);
        $this->assertEquals($staff->id, $item->found_by_staff_id);
    }

    public function test_claim_lost_item_action_marks_item_claimed(): void
    {
        $hotel = Hotel::where('hotel_code', 'HTL-1001')->first();
        $item = $hotel->lostAndFoundItems()->create([
            'reference_no' => 'LF-20261030-999',
            'item_name' => 'Gold Bracelet',
            'category' => 'VALUABLES',
            'found_location_type' => 'ROOM',
            'found_at' => Carbon::now(),
            'found_by_name' => 'HK Staff',
            'storage_location' => 'Safe Locker Box #01',
            'status' => LostAndFoundItem::STATUS_IN_CUSTODY,
        ]);

        $action = new ClaimLostItemAction();
        $claimedItem = $action->execute($hotel, $item->id, [
            'claimed_by_name' => 'Meera Patel',
            'claimed_by_phone' => '+91 9123456789',
            'claimed_by_id_proof' => 'Aadhaar 1234-5678-9012',
            'handover_by_staff_name' => 'Priya Desk In-charge',
            'handover_notes' => 'Handover verified and signed',
        ]);

        $this->assertEquals(LostAndFoundItem::STATUS_CLAIMED, $claimedItem->status);
        $this->assertEquals('Meera Patel', $claimedItem->claimed_by_name);
        $this->assertNotNull($claimedItem->claimed_at);
    }

    public function test_claim_action_throws_validation_exception_if_already_claimed(): void
    {
        $hotel = Hotel::where('hotel_code', 'HTL-1001')->first();
        $item = $hotel->lostAndFoundItems()->create([
            'reference_no' => 'LF-20261030-888',
            'item_name' => 'Silver Pen',
            'category' => 'VALUABLES',
            'found_location_type' => 'LOBBY',
            'found_at' => Carbon::now(),
            'found_by_name' => 'HK Staff',
            'storage_location' => 'Safe Locker',
            'status' => LostAndFoundItem::STATUS_CLAIMED,
            'claimed_at' => Carbon::now(),
        ]);

        $this->expectException(ValidationException::class);

        $action = new ClaimLostItemAction();
        $action->execute($hotel, $item->id, [
            'claimed_by_name' => 'Test',
            'claimed_by_phone' => '+91 9999999999',
            'handover_by_staff_name' => 'Staff',
        ]);
    }

    public function test_dispose_action_marks_item_disposed(): void
    {
        $hotel = Hotel::where('hotel_code', 'HTL-1001')->first();
        $item = $hotel->lostAndFoundItems()->create([
            'reference_no' => 'LF-20261030-777',
            'item_name' => 'Expired Sweets Box',
            'category' => 'OTHERS',
            'found_location_type' => 'RESTAURANT',
            'found_at' => Carbon::now()->subDays(5),
            'found_by_name' => 'Waiter',
            'storage_location' => 'Pantry Locker',
            'status' => LostAndFoundItem::STATUS_IN_CUSTODY,
        ]);

        $action = new DisposeLostItemAction();
        $disposed = $action->execute($hotel, $item->id, [
            'disposal_reason' => 'Perishable food item spoiled after 48h',
            'handover_by_staff_name' => 'Duty Manager',
        ]);

        $this->assertEquals(LostAndFoundItem::STATUS_DISPOSED, $disposed->status);
        $this->assertEquals('Perishable food item spoiled after 48h', $disposed->disposal_reason);
    }
}

