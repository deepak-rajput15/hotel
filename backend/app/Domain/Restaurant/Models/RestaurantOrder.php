<?php

namespace App\Domain\Restaurant\Models;

use App\Domain\FrontOffice\Models\Booking;
use App\Domain\FrontOffice\Models\Room;
use App\Domain\Tenancy\Models\Hotel;
use App\Domain\Tenancy\Traits\BelongsToHotel;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class RestaurantOrder extends Model
{
    use HasFactory, HasUuids, SoftDeletes, BelongsToHotel;

    public const STATUS_OPEN = 'OPEN';
    public const STATUS_BILLED = 'BILLED';
    public const STATUS_SETTLED = 'SETTLED';
    public const STATUS_CANCELLED = 'CANCELLED';

    public const ORDER_TYPE_DINE_IN = 'DINE_IN';
    public const ORDER_TYPE_ROOM_SERVICE = 'ROOM_SERVICE';
    public const ORDER_TYPE_TAKEAWAY = 'TAKEAWAY';

    public const SETTLEMENT_ROOM_FOLIO = 'ROOM_FOLIO';
    public const SETTLEMENT_CASH = 'CASH';
    public const SETTLEMENT_UPI_QR = 'UPI_QR';
    public const SETTLEMENT_CARD = 'CARD';

    protected $fillable = [
        'hotel_id',
        'order_number',
        'order_type',
        'table_id',
        'room_id',
        'booking_id',
        'customer_name',
        'customer_phone',
        'covers',
        'status',
        'subtotal',
        'tax_amount',
        'discount_amount',
        'grand_total',
        'settlement_method',
        'settlement_reference',
        'billed_at',
        'settled_at',
        'notes',
    ];

    protected $casts = [
        'covers' => 'integer',
        'subtotal' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'grand_total' => 'decimal:2',
        'billed_at' => 'datetime',
        'settled_at' => 'datetime',
    ];

    public function hotel(): BelongsTo
    {
        return $this->belongsTo(Hotel::class);
    }

    public function table(): BelongsTo
    {
        return $this->belongsTo(RestaurantTable::class, 'table_id');
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class, 'room_id');
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class, 'booking_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(RestaurantOrderItem::class, 'order_id');
    }
}

