<?php

namespace App\Domain\Restaurant\Models;

use App\Domain\Tenancy\Models\Hotel;
use App\Domain\Tenancy\Traits\BelongsToHotel;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class RestaurantTable extends Model
{
    use HasFactory, HasUuids, SoftDeletes, BelongsToHotel;

    public const STATUS_AVAILABLE = 'AVAILABLE';
    public const STATUS_OCCUPIED = 'OCCUPIED';
    public const STATUS_RESERVED = 'RESERVED';
    public const STATUS_CLEANING = 'CLEANING';

    protected $fillable = [
        'hotel_id',
        'table_no',
        'qr_code',
        'capacity',
        'seating_area',
        'status',
        'notes',
    ];

    protected $casts = [
        'capacity' => 'integer',
    ];

    public function hotel(): BelongsTo
    {
        return $this->belongsTo(Hotel::class);
    }
}
