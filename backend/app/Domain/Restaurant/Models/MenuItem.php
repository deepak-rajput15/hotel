<?php

namespace App\Domain\Restaurant\Models;

use App\Domain\Tenancy\Models\Hotel;
use App\Domain\Tenancy\Traits\BelongsToHotel;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class MenuItem extends Model
{
    use HasFactory, HasUuids, SoftDeletes, BelongsToHotel;

    public const FOOD_TYPE_VEG = 'VEG';
    public const FOOD_TYPE_NON_VEG = 'NON_VEG';
    public const FOOD_TYPE_EGG = 'EGG';

    protected $fillable = [
        'hotel_id',
        'category_id',
        'category_name',
        'item_code',
        'name',
        'description',
        'price',
        'gst_percentage',
        'food_type',
        'is_available',
        'preparation_time_minutes',
        'image_url',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'gst_percentage' => 'decimal:2',
        'is_available' => 'boolean',
        'preparation_time_minutes' => 'integer',
    ];

    public function hotel(): BelongsTo
    {
        return $this->belongsTo(Hotel::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(MenuCategory::class, 'category_id');
    }
}

