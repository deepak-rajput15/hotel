<?php

namespace App\Domain\Notifications\Models;

use App\Domain\Tenancy\Models\Hotel;
use App\Domain\Tenancy\Models\Organization;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class InternalNotification extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'sender_id',
        'sender_type',
        'organization_id',
        'hotel_id',
        'target_scope',
        'target_role',
        'title',
        'message',
        'priority',
        'is_banner',
        'starts_at',
        'expires_at',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_banner' => 'boolean',
            'is_active' => 'boolean',
            'starts_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function hotel(): BelongsTo
    {
        return $this->belongsTo(Hotel::class, 'hotel_id');
    }

    public function reads(): HasMany
    {
        return $this->hasMany(NotificationRead::class, 'notification_id');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('expires_at')
                    ->orWhere('expires_at', '>=', now());
            });
    }

    public function scopeBanner(Builder $query): Builder
    {
        return $query->where('is_banner', true);
    }
}

