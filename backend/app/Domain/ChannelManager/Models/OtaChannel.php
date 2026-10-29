<?php

namespace App\Domain\ChannelManager\Models;

use App\Domain\Tenancy\Models\Hotel;
use App\Domain\Tenancy\Traits\BelongsToHotel;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OtaChannel extends Model
{
    use HasFactory, HasUuids, BelongsToHotel;

    protected $table = 'ota_channels';

    protected $fillable = [
        'hotel_id',
        'channel_code',
        'channel_name',
        'hotel_channel_id',
        'api_key',
        'webhook_secret',
        'is_connected',
        'two_way_sync_enabled',
        'commission_rate_percent',
        'last_sync_at',
        'sync_status',
        'room_type_mappings',
        'rate_multiplier',
    ];

    protected function casts(): array
    {
        return [
            'is_connected' => 'boolean',
            'two_way_sync_enabled' => 'boolean',
            'commission_rate_percent' => 'decimal:2',
            'last_sync_at' => 'datetime',
            'room_type_mappings' => 'array',
            'rate_multiplier' => 'array',
        ];
    }

    public function hotel(): BelongsTo
    {
        return $this->belongsTo(Hotel::class);
    }

    public function syncLogs(): HasMany
    {
        return $this->hasMany(OtaSyncLog::class, 'ota_channel_id');
    }
}
