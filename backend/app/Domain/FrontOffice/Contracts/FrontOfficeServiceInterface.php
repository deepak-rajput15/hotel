<?php

namespace App\Domain\FrontOffice\Contracts;

use App\Domain\FrontOffice\Models\Booking;
use App\Domain\FrontOffice\Models\Room;
use App\Domain\Tenancy\Models\Hotel;

interface FrontOfficeServiceInterface
{
    public function checkInGuest(Hotel $hotel, array $data): array;

    public function confirmReservation(Hotel $hotel, string $bookingId): Booking;

    public function addFolioCharge(Hotel $hotel, string $bookingId, array $data): array;

    public function recordFolioPayment(Hotel $hotel, string $bookingId, array $data): array;

    public function checkOutGuest(Hotel $hotel, string $bookingId, array $data): array;

    public function createRoom(Hotel $hotel, array $data): Room;

    public function updateRoom(Hotel $hotel, string $roomId, array $data): Room;

    public function updateRoomStatus(Hotel $hotel, string $roomId, string $status): Room;
}

