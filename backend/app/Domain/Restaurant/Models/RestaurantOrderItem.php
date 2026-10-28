<?php

namespace App\Domain\Restaurant\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RestaurantOrderItem extends Model
{
    use HasFactory, HasUuids;

    public const STATUS_PENDING = 'PENDING';
    public const STATUS_PREPARING = 'PREPARING';
    public const STATUS_READY = 'READY';
    public const STATUS_SERVED = 'SERVED';
    public const STATUS_CANCELLED = 'CANCELLED';

    protected $fillable = [
        'order_id',
        'menu_item_id',
        'kot_number',
        'item_name',
        'food_type',
        'quantity',
        'unit_price',
        'total_price',
        'special_notes',
        'status',
        'kot_printed_at',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_price' => 'decimal:2',
        'total_price' => 'decimal:2',
        'kot_printed_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(RestaurantOrder::class, 'order_id');
    }

    public function menuItem(): BelongsTo
    {
        return $this->belongsTo(MenuItem::class, 'menu_item_id');
    }
}

