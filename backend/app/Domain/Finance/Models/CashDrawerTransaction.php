<?php

namespace App\Domain\Finance\Models;

use App\Domain\Tenancy\Models\Hotel;
use App\Domain\Tenancy\Traits\BelongsToHotel;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CashDrawerTransaction extends Model
{
    use HasFactory, HasUuids, BelongsToHotel;

    protected $table = 'cash_drawer_transactions';

    protected $fillable = [
        'shift_handover_id',
        'hotel_id',
        'transaction_type', // PAYOUT, FLOAT_ADDITION, CASH_DROP
        'amount',
        'reason',
        'recipient_name',
        'receipt_voucher_no',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
        ];
    }

    public function shift(): BelongsTo
    {
        return $this->belongsTo(ShiftHandover::class, 'shift_handover_id');
    }

    public function hotel(): BelongsTo
    {
        return $this->belongsTo(Hotel::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
