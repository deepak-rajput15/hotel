<?php

namespace App\Domain\FrontOffice\Services;

use App\Domain\FrontOffice\Actions\AddFolioChargeAction;
use App\Domain\FrontOffice\Actions\CheckInGuestAction;
use App\Domain\FrontOffice\Actions\CheckOutGuestAction;
use App\Domain\FrontOffice\Actions\ConfirmReservationAction;
use App\Domain\FrontOffice\Actions\ManageRoomAction;
use App\Domain\FrontOffice\Actions\RecordFolioPaymentAction;
use App\Domain\FrontOffice\Contracts\FrontOfficeServiceInterface;
use App\Domain\FrontOffice\Models\Booking;
use App\Domain\FrontOffice\Models\Room;
use App\Domain\Tenancy\Models\Hotel;

class FrontOfficeService implements FrontOfficeServiceInterface
{
    public function __construct(
        protected CheckInGuestAction $checkInGuestAction,
        protected ConfirmReservationAction $confirmReservationAction,
        protected AddFolioChargeAction $addFolioChargeAction,
        protected RecordFolioPaymentAction $recordFolioPaymentAction,
        protected CheckOutGuestAction $checkOutGuestAction,
        protected ManageRoomAction $manageRoomAction,
    ) {}

    public function checkInGuest(Hotel $hotel, array $data): array
    {
        return $this->checkInGuestAction->execute($hotel, $data);
    }

    public function confirmReservation(Hotel $hotel, string $bookingId): Booking
    {
        return $this->confirmReservationAction->execute($hotel, $bookingId);
    }

    public function addFolioCharge(Hotel $hotel, string $bookingId, array $data): array
    {
        return $this->addFolioChargeAction->execute($hotel, $bookingId, $data);
    }

    public function recordFolioPayment(Hotel $hotel, string $bookingId, array $data): array
    {
        return $this->recordFolioPaymentAction->execute($hotel, $bookingId, $data);
    }

    public function checkOutGuest(Hotel $hotel, string $bookingId, array $data): array
    {
        return $this->checkOutGuestAction->execute($hotel, $bookingId, $data);
    }

    public function createRoom(Hotel $hotel, array $data): Room
    {
        return $this->manageRoomAction->createRoom($hotel, $data);
    }

    public function updateRoom(Hotel $hotel, string $roomId, array $data): Room
    {
        return $this->manageRoomAction->updateRoom($hotel, $roomId, $data);
    }

    public function updateRoomStatus(Hotel $hotel, string $roomId, string $status): Room
    {
        return $this->manageRoomAction->updateStatus($hotel, $roomId, $status);
    }
}

