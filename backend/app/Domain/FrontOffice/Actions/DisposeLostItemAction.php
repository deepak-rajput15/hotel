<?php

namespace App\Domain\FrontOffice\Actions;

use App\Domain\FrontOffice\Models\LostAndFoundItem;
use App\Domain\Tenancy\Models\Hotel;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

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
     * @throws ValidationException
     */
    public function execute(Hotel $hotel, string $itemId, array $data, ?User $actor = null): LostAndFoundItem
    {
        return DB::transaction(function () use ($hotel, $itemId, $data, $actor) {
            $item = $hotel->lostAndFoundItems()->where('id', $itemId)->lockForUpdate()->firstOrFail();

            if ($item->status === LostAndFoundItem::STATUS_CLAIMED) {
                $claimedDate = $item->claimed_at ? $item->claimed_at->format('d M Y') : 'a previous date';
                throw ValidationException::withMessages([
                    'status' => "Cannot dispose this item because it has already been CLAIMED by guest '{$item->claimed_by_name}' on {$claimedDate}.",
                ]);
            }

            if ($item->status === LostAndFoundItem::STATUS_DISPOSED) {
                $disposedDate = $item->disposed_at ? $item->disposed_at->format('d M Y') : 'a previous date';
                throw ValidationException::withMessages([
                    'status' => "This item has already been marked as DISPOSED on {$disposedDate}.",
                ]);
            }

            $item->update([
                'status' => LostAndFoundItem::STATUS_DISPOSED,
                'disposed_at' => Carbon::now(),
                'disposal_reason' => $data['disposal_reason'],
                'handover_by_staff_name' => $data['handover_by_staff_name'] ?? ($actor?->name ?? 'Front Office Manager'),
                'handover_notes' => $data['handover_notes'] ?? null,
            ]);

            return $item->fresh(['room', 'booking.guest', 'foundByStaff']);
        });
    }
}
