<?php

namespace App\Domain\Restaurant\Contracts;

use App\Domain\FrontOffice\Models\Booking;
use App\Domain\FrontOffice\Models\Room;
use App\Domain\Tenancy\Models\Hotel;

interface RoomDiningGuestServiceInterface
{
    public function placeOrder(Hotel $hotel, Room $room, Booking $booking, array $data): array;
}

