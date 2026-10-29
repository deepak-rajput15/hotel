<?php

namespace App\Domain\Notifications\Models;

use App\Domain\FrontOffice\Models\Booking;
use App\Domain\Tenancy\Models\Hotel;
use App\Domain\Tenancy\Traits\BelongsToHotel;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhatsAppNotification extends Model
{
    use HasFactory, HasUuids, BelongsToHotel;

    protected $table = 'whatsapp_notifications';

    protected $fillable = [
        'hotel_id',
        'booking_id',
        'recipient_phone',
        'recipient_name',
        'message_type',
        'message_body',
        'status',
        'external_message_id',
        'metadata',
        'sent_at',
    ];

    protected function casts(): array
    {
        return [
            'sent_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function hotel(): BelongsTo
    {
        return $this->belongsTo(Hotel::class);
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }
}

