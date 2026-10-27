<?php

namespace App\Domain\FrontOffice\Models;

use App\Domain\Tenancy\Models\Hotel;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Room extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    public const TYPES = [
        'SINGLE' => 'Single',
        'DOUBLE' => 'Double',
        'DELUXE' => 'Deluxe',
        'SEMI_DELUXE' => 'Semi Deluxe',
        'SUITE' => 'Suite',
    ];

    public const MODES = [
        'AC' => 'AC',
        'NON_AC' => 'Non AC',
    ];

    public const STATUS_AVAILABLE = 'AVAILABLE';
    public const STATUS_OCCUPIED = 'OCCUPIED';
    public const STATUS_UNDER_MAINTENANCE = 'MAINTENANCE';
    public const STATUS_CLEANING = 'DIRTY';

    protected $fillable = [
        'hotel_id',
        'room_number',
        'room_type',
        'room_mode',
        'floor',
        'base_price',
        'extra_bedding_price',
        'gst_percentage',
        'status',
        'max_guests',
        'amenities',
        'remarks',
    ];

    protected $casts = [
        'base_price' => 'decimal:2',
        'extra_bedding_price' => 'decimal:2',
        'gst_percentage' => 'decimal:2',
        'max_guests' => 'integer',
        'amenities' => 'array',
    ];

    public function hotel(): BelongsTo
    {
        return $this->belongsTo(Hotel::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    public function currentBooking(): HasMany
    {
        return $this->hasMany(Booking::class)->where('status', 'CHECKED_IN');
    }

    public function getCapacityAttribute(): int
    {
        return $this->max_guests;
    }

    public function getPricePerDayAttribute(): string
    {
        return (string) $this->base_price;
    }
}
