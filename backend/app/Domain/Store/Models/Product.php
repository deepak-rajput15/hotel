<?php

namespace App\Domain\Store\Models;

use App\Domain\Purchase\Models\Supplier;
use App\Domain\Tenancy\Models\Hotel;
use App\Domain\Tenancy\Traits\BelongsToHotel;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, HasUuids, SoftDeletes, BelongsToHotel;

    /**
     * Categories specified in Book1.xlsx
     */
    public const CATEGORIES = [
        'Grocery & Grains',
        'Vegetables & Fruits',
        'Dairy Products',
        'Meat & Seafood',
        'Beverages',
        'Spices & Masalas',
        'Crockery',
        'Other / Restaurant Supplies',
    ];

    public const STATUS_ACTIVE = 'Active';
    public const STATUS_INACTIVE = 'Inactive';

    protected $fillable = [
        'hotel_id',
        'supplier_id',
        'category',
        'name',
        'product_code',
        'description',
        'unit',
        'expiry_period',
        'expiry_date',
        'rate',
        'gst_percentage',
        'opening_stock',
        'current_stock',
        'minimum_stock_qty',
        'status',
    ];

    protected $casts = [
        'rate' => 'decimal:2',
        'gst_percentage' => 'decimal:2',
        'opening_stock' => 'decimal:2',
        'current_stock' => 'decimal:2',
        'minimum_stock_qty' => 'decimal:2',
        'expiry_date' => 'date',
    ];

    public function hotel(): BelongsTo
    {
        return $this->belongsTo(Hotel::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    /**
     * Scope query to active products.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    /**
     * Scope query to products with low stock (at or below minimum stock threshold).
     */
    public function scopeLowStock(Builder $query): Builder
    {
        return $query->whereColumn('current_stock', '<=', 'minimum_stock_qty');
    }
}
