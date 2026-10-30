<?php

namespace App\Domain\FrontOffice\Actions;

use App\Domain\FrontOffice\Models\LostAndFoundItem;
use App\Domain\Tenancy\Models\Hotel;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

class ClaimLostItemAction
{
    /**
     * Handover item to guest or authorized representative and mark as CLAIMED.
     *
     * @param Hotel $hotel
     * @param string $itemId
     * @param array $data Validated claim payload
     * @return LostAndFoundItem
     * @throws ValidationException
     */
    public function execute(Hotel $hotel, string $itemId, array $data): LostAndFoundItem
    {
        $item = $hotel->lostAndFoundItems()->findOrFail($itemId);

        if ($item->status === LostAndFoundItem::STATUS_CLAIMED) {
            throw ValidationException::withMessages([
                'status' => "This item has already been claimed on {$item->claimed_at?->format('d M Y')}.",
            ]);
        }

        $item->update([
            'status' => LostAndFoundItem::STATUS_CLAIMED,
            'claimed_at' => Carbon::now(),
            'claimed_by_name' => $data['claimed_by_name'],
            'claimed_by_phone' => $data['claimed_by_phone'],
            'claimed_by_id_proof' => $data['claimed_by_id_proof'] ?? null,
            'handover_by_staff_name' => $data['handover_by_staff_name'],
            'handover_notes' => $data['handover_notes'] ?? null,
        ]);

        return $item->fresh(['room', 'booking.guest', 'foundByStaff']);
    }
}
