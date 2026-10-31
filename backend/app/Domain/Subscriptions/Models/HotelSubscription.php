<?php

namespace App\Domain\Subscriptions\Models;

use App\Domain\Tenancy\Models\Hotel;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HotelSubscription extends Model
{
    use HasUuids;

    protected $table = 'hotel_subscriptions';

    protected $fillable = [
        'hotel_id',
        'package_id',
        'plan_name',
        'billing_cycle',
        'agreed_price',
        'currency',
        'status',
        'starts_at',
        'expires_at',
        'payment_status',
        'payment_method',
        'payment_reference',
        'sales_notes',
        'assigned_by_user_id',
    ];

    protected $casts = [
        'agreed_price' => 'decimal:2',
        'starts_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    public function hotel(): BelongsTo
    {
        return $this->belongsTo(Hotel::class, 'hotel_id');
    }

    public function package(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPackage::class, 'package_id');
    }

    public function assignedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by_user_id');
    }

    public function isActive(): bool
    {
        if ($this->status !== 'ACTIVE' && $this->status !== 'TRIAL') {
            return false;
        }

        // null expires_at means perpetual/lifetime
        if ($this->expires_at === null) {
            return true;
        }

        return $this->expires_at->isFuture();
    }

    public function isExpiringSoon(int $daysThreshold = 15): bool
    {
        if ($this->expires_at === null || !$this->isActive()) {
            return false;
        }

        return $this->expires_at->diffInDays(now()) <= $daysThreshold;
    }

    public function daysRemaining(): ?int
    {
        if ($this->expires_at === null) {
            return null; // Unlimited/lifetime
        }

        return (int) max(0, now()->diffInDays($this->expires_at, false));
    }
}
