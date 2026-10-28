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
        'batches',
        'status',
    ];

    protected $casts = [
        'rate' => 'decimal:2',
        'gst_percentage' => 'decimal:2',
        'opening_stock' => 'decimal:2',
        'current_stock' => 'decimal:2',
        'minimum_stock_qty' => 'decimal:2',
        'expiry_date' => 'date',
        'batches' => 'array',
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

    /**
     * Parse expiry string (MM/yyyy or YYYY-MM-DD or YYYY-MM) into a Carbon date at the end of expiration day.
     */
    public static function parseExpiryDate(?string $period): ?\Carbon\Carbon
    {
        if (empty($period)) {
            return null;
        }

        $trimmed = trim($period);

        if (preg_match('/^(\d{1,2})\/(\d{4})$/', $trimmed, $m)) {
            $month = (int) $m[1];
            $year = (int) $m[2];
            return \Carbon\Carbon::create($year, $month, 1)->endOfMonth()->endOfDay();
        }

        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $trimmed)) {
            return \Carbon\Carbon::parse($trimmed)->endOfDay();
        }

        if (preg_match('/^(\d{4})-(\d{1,2})$/', $trimmed, $m)) {
            return \Carbon\Carbon::create((int) $m[1], (int) $m[2], 1)->endOfMonth()->endOfDay();
        }

        try {
            return \Carbon\Carbon::parse($trimmed)->endOfDay();
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Compute comprehensive expiry metrics for the product and all individual stock batches.
     */
    public function computeExpiryDetails(): array
    {
        $now = now();
        $mainExpiry = self::parseExpiryDate($this->expiry_period);

        $mainStatus = 'NO_EXPIRY';
        $mainDays = null;
        if ($mainExpiry) {
            $diffDays = (int) ceil($now->diffInDays($mainExpiry, false));
            if ($mainExpiry->isPast()) {
                $mainStatus = 'EXPIRED';
                $mainDays = $diffDays;
            } elseif ($diffDays <= 30) {
                $mainStatus = 'EXPIRING_SOON';
                $mainDays = $diffDays;
            } else {
                $mainStatus = 'GOOD';
                $mainDays = $diffDays;
            }
        }

        $rawBatches = is_array($this->batches) ? $this->batches : [];
        $processedBatches = [];
        $hasExpiredBatch = false;
        $hasExpiringSoonBatch = false;
        $oldestExpiringBatch = null;
        $minDays = $mainDays;

        if (empty($rawBatches) && (float) $this->current_stock > 0 && !empty($this->expiry_period)) {
            $rawBatches = [
                [
                    'batch_no' => 'BATCH-INIT',
                    'quantity' => (float) $this->current_stock,
                    'expiry_period' => $this->expiry_period,
                    'unit' => $this->unit,
                    'received_at' => $this->created_at?->toIso8601String(),
                ]
            ];
        }

        foreach ($rawBatches as $b) {
            $bQty = (float) ($b['quantity'] ?? 0);
            if ($bQty <= 0) {
                continue;
            }

            $bPeriod = $b['expiry_period'] ?? $this->expiry_period;
            $bExpiry = self::parseExpiryDate($bPeriod);
            $bStatus = 'NO_EXPIRY';
            $bDays = null;

            if ($bExpiry) {
                $bDiff = (int) ceil($now->diffInDays($bExpiry, false));
                if ($bExpiry->isPast()) {
                    $bStatus = 'EXPIRED';
                    $bDays = $bDiff;
                    $hasExpiredBatch = true;
                } elseif ($bDiff <= 30) {
                    $bStatus = 'EXPIRING_SOON';
                    $bDays = $bDiff;
                    $hasExpiringSoonBatch = true;
                } else {
                    $bStatus = 'GOOD';
                    $bDays = $bDiff;
                }

                if ($minDays === null || $bDiff < $minDays) {
                    $minDays = $bDiff;
                }
            }

            $batchItem = [
                'batch_no' => $b['batch_no'] ?? 'BATCH-1',
                'quantity' => $bQty,
                'unit' => $b['unit'] ?? $this->unit,
                'expiry_period' => $bPeriod,
                'expiry_status' => $bStatus,
                'days_remaining' => $bDays,
                'received_at' => $b['received_at'] ?? null,
                'notes' => $b['notes'] ?? null,
            ];

            if ($bStatus === 'EXPIRED') {
                if (!$oldestExpiringBatch || $oldestExpiringBatch['expiry_status'] !== 'EXPIRED' || ($bDays !== null && $bDays < ($oldestExpiringBatch['days_remaining'] ?? 0))) {
                    $oldestExpiringBatch = $batchItem;
                }
            } elseif ($bStatus === 'EXPIRING_SOON') {
                if (!$oldestExpiringBatch || ($oldestExpiringBatch['expiry_status'] !== 'EXPIRED' && ($bDays !== null && $bDays < ($oldestExpiringBatch['days_remaining'] ?? 9999)))) {
                    $oldestExpiringBatch = $batchItem;
                }
            }

            $processedBatches[] = $batchItem;
        }

        $overallStatus = $mainStatus;
        if ($mainStatus === 'EXPIRED' || $hasExpiredBatch) {
            $overallStatus = 'EXPIRED';
        } elseif ($mainStatus === 'EXPIRING_SOON' || $hasExpiringSoonBatch) {
            $overallStatus = 'EXPIRING_SOON';
        }

        return [
            'status' => $overallStatus,
            'days_remaining' => $minDays,
            'has_expired_batch' => $hasExpiredBatch,
            'has_expiring_soon_batch' => $hasExpiringSoonBatch,
            'oldest_expiring_batch' => $oldestExpiringBatch,
            'batches' => $processedBatches,
        ];
    }
}
