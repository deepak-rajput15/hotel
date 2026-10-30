<?php

namespace App\Domain\FrontOffice\Actions;

use App\Domain\FrontOffice\Models\Room;
use App\Domain\Tenancy\Models\Hotel;
use Illuminate\Validation\ValidationException;

class ManageRoomAction
{
    protected const STATUS_MAP = [
        'Available' => 'AVAILABLE',
        'Occupied' => 'OCCUPIED',
        'Cleaning' => 'DIRTY',
        'Under Maintenance' => 'MAINTENANCE',
    ];

    /**
     * Create a new room in hotel.
     */
    public function createRoom(Hotel $hotel, array $data): Room
    {
        $status = $data['status'] ?? 'AVAILABLE';
        if (isset(self::STATUS_MAP[$status])) {
            $status = self::STATUS_MAP[$status];
        }

        return $hotel->rooms()->create([
            'room_number' => $data['room_number'],
            'room_type' => $data['room_type'],
            'room_mode' => $data['room_mode'] ?? 'AC',
            'floor' => $data['floor'] ?? '1st Floor',
            'base_price' => $data['base_price'],
            'extra_bedding_price' => $data['extra_bedding_price'] ?? 0.00,
            'gst_percentage' => $data['gst_percentage'] ?? 12.00,
            'status' => $status,
            'max_guests' => $data['max_guests'] ?? 2,
            'amenities' => $data['amenities'] ?? ['High-Speed WiFi', 'Smart TV', 'AC', 'Mini Fridge'],
            'remarks' => $data['remarks'] ?? null,
        ]);
    }

    /**
     * Update existing room.
     */
    public function updateRoom(Hotel $hotel, string $roomId, array $data): Room
    {
        $room = $hotel->rooms()->findOrFail($roomId);

        if (isset($data['status']) && isset(self::STATUS_MAP[$data['status']])) {
            $data['status'] = self::STATUS_MAP[$data['status']];
        }

        $room->update($data);
        return $room;
    }

    /**
     * Update room housekeeping status.
     *
     * @throws ValidationException
     */
    public function updateStatus(Hotel $hotel, string $roomId, string $newStatus): Room
    {
        $room = $hotel->rooms()->findOrFail($roomId);

        // Prevent setting room to AVAILABLE or DIRTY if an active guest is currently checked in!
        if (in_array($newStatus, ['AVAILABLE', 'DIRTY', 'MAINTENANCE'], true) && $room->status === 'OCCUPIED') {
            $activeBooking = $hotel->bookings()
                ->where('room_id', $room->id)
                ->where('status', 'CHECKED_IN')
                ->first();

            if ($activeBooking) {
                throw ValidationException::withMessages([
                    'status' => "Cannot change status of Room {$room->room_number} to {$newStatus} because an in-house guest is currently checked in. Please check out the booking first.",
                ]);
            }
        }

        $room->status = $newStatus;
        $room->save();

        return $room;
    }
}

