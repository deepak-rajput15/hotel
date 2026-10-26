<?php

namespace App\Domain\FrontOffice\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FolioItem extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'booking_id',
        'item_type',
        'description',
        'quantity',
        'unit_price',
        'total_price',
        'charged_at',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_price' => 'decimal:2',
        'total_price' => 'decimal:2',
        'charged_at' => 'datetime',
    ];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }
}
