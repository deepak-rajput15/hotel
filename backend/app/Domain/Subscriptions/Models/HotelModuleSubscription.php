<?php

namespace App\Domain\Subscriptions\Models;

use App\Domain\Tenancy\Models\Hotel;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HotelModuleSubscription extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'hotel_id',
        'module_id',
        'status',
        'starts_at',
        'expires_at',
        'settings',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'expires_at' => 'datetime',
        'settings' => 'array',
    ];

    public function hotel(): BelongsTo
    {
        return $this->belongsTo(Hotel::class);
    }

    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class);
    }

    public function isActive(): bool
    {
        if ($this->status !== 'ACTIVE') {
            return false;
        }

        if ($this->expires_at && $this->expires_at->isPast()) {
            return false;
        }

        return true;
    }
}
