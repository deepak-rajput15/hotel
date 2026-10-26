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

    protected $fillable = [
        'hotel_id',
        'room_number',
        'room_type',
        'floor',
        'base_price',
        'status',
        'max_guests',
        'amenities',
    ];

    protected $casts = [
        'base_price' => 'decimal:2',
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
}
