<?php

namespace App\Domain\Restaurant\Services;

use App\Domain\FrontOffice\Models\Booking;
use App\Domain\FrontOffice\Models\Room;
use App\Domain\Restaurant\Actions\PlaceRoomDiningOrderAction;
use App\Domain\Restaurant\Contracts\RoomDiningGuestServiceInterface;
use App\Domain\Tenancy\Models\Hotel;

class RoomDiningGuestService implements RoomDiningGuestServiceInterface
{
    public function __construct(
        protected PlaceRoomDiningOrderAction $placeOrderAction
    ) {}

    public function placeOrder(Hotel $hotel, Room $room, Booking $booking, array $data): array
    {
        return $this->placeOrderAction->execute($hotel, $room, $booking, $data);
    }
}

