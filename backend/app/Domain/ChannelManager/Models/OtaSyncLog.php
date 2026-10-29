<?php

namespace App\Domain\ChannelManager\Models;

use App\Domain\FrontOffice\Models\Booking;
use App\Domain\Tenancy\Models\Hotel;
use App\Domain\Tenancy\Traits\BelongsToHotel;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OtaSyncLog extends Model
{
    use HasFactory, HasUuids, BelongsToHotel;

    protected $table = 'ota_sync_logs';

    protected $fillable = [
        'hotel_id',
        'ota_channel_id',
        'booking_id',
        'channel_code',
        'direction', // INBOUND, OUTBOUND
        'event_type', // BOOKING_CREATED, BOOKING_CANCELLED, ARI_PUSH, RATE_UPDATE
        'ota_reservation_id',
        'guest_name',
        'guest_phone',
        'gross_amount',
        'commission_amount',
        'net_payable_to_hotel',
        'status', // SUCCESS, WARNING, FAILED
        'message',
        'payload',
        'processed_at',
    ];

    protected function casts(): array
    {
        return [
            'gross_amount' => 'decimal:2',
            'commission_amount' => 'decimal:2',
            'net_payable_to_hotel' => 'decimal:2',
            'processed_at' => 'datetime',
            'payload' => 'array',
        ];
    }

    public function hotel(): BelongsTo
    {
        return $this->belongsTo(Hotel::class);
    }

    public function channel(): BelongsTo
    {
        return $this->belongsTo(OtaChannel::class, 'ota_channel_id');
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class, 'booking_id');
    }
}
