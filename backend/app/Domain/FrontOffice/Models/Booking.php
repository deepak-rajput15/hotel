<?php

namespace App\Domain\FrontOffice\Models;

use App\Domain\Tenancy\Models\Hotel;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Booking extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'hotel_id',
        'booking_number',
        'guest_id',
        'room_id',
        'check_in_at',
        'expected_check_out_at',
        'check_out_at',
        'num_adults',
        'num_children',
        'status',
        'room_rate_per_night',
        'total_nights',
        'total_room_charges',
        'total_extra_charges',
        'tax_amount',
        'discount_amount',
        'grand_total',
        'paid_amount',
        'balance_amount',
        'payment_status',
        'special_requests',
    ];

    protected $casts = [
        'check_in_at' => 'datetime',
        'expected_check_out_at' => 'datetime',
        'check_out_at' => 'datetime',
        'room_rate_per_night' => 'decimal:2',
        'total_room_charges' => 'decimal:2',
        'total_extra_charges' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'grand_total' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'balance_amount' => 'decimal:2',
        'num_adults' => 'integer',
        'num_children' => 'integer',
        'total_nights' => 'integer',
    ];

    public function hotel(): BelongsTo
    {
        return $this->belongsTo(Hotel::class);
    }

    public function guest(): BelongsTo
    {
        return $this->belongsTo(Guest::class);
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function folioItems(): HasMany
    {
        return $this->hasMany(FolioItem::class)->orderBy('charged_at', 'asc');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class)->orderBy('created_at', 'asc');
    }

    /**
     * Recalculate grand total, tax, and balance.
     */
    public function recalculateTotals(): self
    {
        $roomCharges = (float) $this->total_room_charges;
        $roomGstRate = (float) ($this->room?->gst_percentage ?? 12.00) / 100;
        $taxableRoomCharges = max(0, $roomCharges - (float) $this->discount_amount);
        $roomTax = round($taxableRoomCharges * $roomGstRate, 2);

        $extraCharges = (float) $this->folioItems()
            ->where('item_type', '!=', 'ROOM_CHARGE')
            ->sum('total_price');

        $this->total_extra_charges = $extraCharges;
        $this->tax_amount = $roomTax;
        $this->grand_total = $taxableRoomCharges + $roomTax + $extraCharges;

        $paymentsSum = (float) $this->payments()->sum('amount');
        $paid = $this->payments()->exists() ? $paymentsSum : (float) $this->paid_amount;
        $this->paid_amount = $paid;
        $this->balance_amount = max(0, round($this->grand_total - $paid, 2));

        if ($this->balance_amount <= 0 && $this->grand_total > 0) {
            $this->payment_status = 'PAID';
        } elseif ($this->paid_amount > 0) {
            $this->payment_status = 'PARTIAL';
        } else {
            $this->payment_status = 'PENDING';
        }

        $this->save();

        return $this;
    }
}
