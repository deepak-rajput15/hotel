<?php

namespace App\Domain\FrontOffice\Actions;

use App\Domain\FrontOffice\Models\Booking;
use App\Domain\FrontOffice\Models\LostAndFoundItem;
use App\Domain\FrontOffice\Models\Room;
use App\Domain\Tenancy\Models\Hotel;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class LogLostItemAction
{
    /**
     * Log a new found belonging and place it into safe custody.
     *
     * @param Hotel $hotel
     * @param array $data Validated payload
     * @param User|null $actor Staff user performing the log
     * @return LostAndFoundItem
     */
    public function execute(Hotel $hotel, array $data, ?User $actor = null): LostAndFoundItem
    {
        return DB::transaction(function () use ($hotel, $data, $actor) {
            // Auto-generate reference number: LF-YYYYMMDD-XXX
            $datePrefix = Carbon::now()->format('Ymd');
            $todayCount = $hotel->lostAndFoundItems()
                ->whereDate('created_at', Carbon::today())
                ->count() + 1;
            $referenceNo = sprintf('LF-%s-%03d', $datePrefix, $todayCount);

            // Auto-detect previous or in-house guest if found in a guest room
            $bookingId = null;
            if (!empty($data['room_id'])) {
                $room = Room::where('hotel_id', $hotel->id)->find($data['room_id']);
                if ($room) {
                    $recentBooking = Booking::where('hotel_id', $hotel->id)
                        ->where('room_id', $room->id)
                        ->with('guest')
                        ->latest('check_in_at')
                        ->first();

                    if ($recentBooking) {
                        $bookingId = $recentBooking->id;
                        if (empty($data['guest_name'])) {
                            $data['guest_name'] = $recentBooking->guest?->name;
                        }
                        if (empty($data['guest_phone'])) {
                            $data['guest_phone'] = $recentBooking->guest?->phone;
                        }
                        if (empty($data['guest_email'])) {
                            $data['guest_email'] = $recentBooking->guest?->email;
                        }
                    }
                }
            }

            return $hotel->lostAndFoundItems()->create([
                'reference_no' => $referenceNo,
                'item_name' => $data['item_name'],
                'category' => $data['category'],
                'found_location_type' => $data['found_location_type'],
                'room_id' => $data['room_id'] ?? null,
                'specific_location' => $data['specific_location'] ?? null,
                'found_at' => !empty($data['found_at']) ? Carbon::parse($data['found_at']) : Carbon::now(),
                'found_by_name' => $data['found_by_name'],
                'found_by_staff_id' => $actor?->id,
                'storage_location' => $data['storage_location'] ?? 'Front Desk Safe Locker',
                'description' => $data['description'] ?? null,
                'estimated_value' => $data['estimated_value'] ?? null,
                'status' => LostAndFoundItem::STATUS_IN_CUSTODY,
                'guest_name' => $data['guest_name'] ?? null,
                'guest_phone' => $data['guest_phone'] ?? null,
                'guest_email' => $data['guest_email'] ?? null,
                'booking_id' => $bookingId,
            ]);
        });
    }
}
