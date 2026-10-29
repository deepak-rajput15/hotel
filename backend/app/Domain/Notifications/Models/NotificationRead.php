<?php

namespace App\Domain\Notifications\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationRead extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'notification_id',
        'user_id',
        'read_at',
        'dismissed',
    ];

    protected function casts(): array
    {
        return [
            'read_at' => 'datetime',
            'dismissed' => 'boolean',
        ];
    }

    public function notification(): BelongsTo
    {
        return $this->belongsTo(InternalNotification::class, 'notification_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}

