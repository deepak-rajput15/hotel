<?php

namespace App\Domain\FrontOffice\Models;

use App\Domain\Tenancy\Models\Hotel;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookingGuest extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'booking_guests';

    protected $fillable = [
        'booking_id',
        'hotel_id',
        'first_name',
        'last_name',
        'gender',
        'age',
        'phone',
        'id_type',
        'id_number',
        'relationship',
        'nationality',
    ];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function hotel(): BelongsTo
    {
        return $this->belongsTo(Hotel::class);
    }

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }
}
