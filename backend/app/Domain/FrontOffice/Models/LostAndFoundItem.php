<?php

namespace App\Domain\FrontOffice\Models;

use App\Models\User;
use App\Domain\Tenancy\Models\Hotel;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LostAndFoundItem extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'lost_and_found_items';

    public const STATUS_IN_CUSTODY = 'IN_CUSTODY';
    public const STATUS_CLAIMED = 'CLAIMED';
    public const STATUS_DISPOSED = 'DISPOSED';

    public const CAT_ELECTRONICS = 'ELECTRONICS';
    public const CAT_VALUABLES = 'VALUABLES';
    public const CAT_DOCUMENTS = 'DOCUMENTS';
    public const CAT_CLOTHING = 'CLOTHING';
    public const CAT_BAGGAGE = 'BAGGAGE';
    public const CAT_OTHERS = 'OTHERS';

    public const LOC_ROOM = 'ROOM';
    public const LOC_RESTAURANT = 'RESTAURANT';
    public const LOC_LOBBY = 'LOBBY';
    public const LOC_POOL_GARDEN = 'POOL_GARDEN';
    public const LOC_BANQUET = 'BANQUET';
    public const LOC_OTHER = 'OTHER';

    protected $fillable = [
        'hotel_id',
        'reference_no',
        'item_name',
        'category',
        'found_location_type',
        'room_id',
        'specific_location',
        'found_at',
        'found_by_name',
        'found_by_staff_id',
        'storage_location',
        'description',
        'estimated_value',
        'status',
        'guest_name',
        'guest_phone',
        'guest_email',
        'booking_id',
        'claimed_at',
        'claimed_by_name',
        'claimed_by_phone',
        'claimed_by_id_proof',
        'handover_by_staff_name',
        'handover_notes',
        'disposed_at',
        'disposal_reason',
    ];

    protected $casts = [
        'found_at' => 'datetime',
        'claimed_at' => 'datetime',
        'disposed_at' => 'datetime',
        'estimated_value' => 'float',
    ];

    public function hotel(): BelongsTo
    {
        return $this->belongsTo(Hotel::class);
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function foundByStaff(): BelongsTo
    {
        return $this->belongsTo(User::class, 'found_by_staff_id');
    }
}
