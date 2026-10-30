<?php

namespace App\Domain\FrontOffice\Actions;

use App\Domain\FrontOffice\Models\LostAndFoundItem;
use App\Domain\Tenancy\Models\Hotel;
use App\Models\User;
use Carbon\Carbon;

class DisposeLostItemAction
{
    /**
     * Mark an unclaimed or perishable item as DISPOSED or DONATED.
     *
     * @param Hotel $hotel
     * @param string $itemId
     * @param array $data Validated disposal payload
     * @param User|null $actor
     * @return LostAndFoundItem
     */
    public function execute(Hotel $hotel, string $itemId, array $data, ?User $actor = null): LostAndFoundItem
    {
        $item = $hotel->lostAndFoundItems()->findOrFail($itemId);

        $item->update([
            'status' => LostAndFoundItem::STATUS_DISPOSED,
            'disposed_at' => Carbon::now(),
            'disposal_reason' => $data['disposal_reason'],
            'handover_by_staff_name' => $data['handover_by_staff_name'] ?? ($actor?->name ?? 'Front Office Manager'),
            'handover_notes' => $data['handover_notes'] ?? null,
        ]);

        return $item->fresh(['room', 'booking.guest', 'foundByStaff']);
    }
}
