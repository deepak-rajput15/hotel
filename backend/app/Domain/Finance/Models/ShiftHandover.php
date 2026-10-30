<?php

namespace App\Domain\Finance\Models;

use App\Domain\FrontOffice\Models\Payment;
use App\Domain\Restaurant\Models\RestaurantOrder;
use App\Domain\Tenancy\Models\Hotel;
use App\Domain\Tenancy\Traits\BelongsToHotel;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ShiftHandover extends Model
{
    use HasFactory, HasUuids, SoftDeletes, BelongsToHotel;

    protected $table = 'shift_handovers';

    protected $fillable = [
        'hotel_id',
        'shift_code',
        'department',
        'shift_type',
        'user_id',
        'handover_to_user_id',
        'status',
        'opened_at',
        'closed_at',
        'opening_float',
        'system_cash_sales',
        'system_upi_sales',
        'system_card_sales',
        'cash_paid_out',
        'expected_cash',
        'actual_cash_counted',
        'variance',
        'denominations',
        'opening_notes',
        'handover_notes',
    ];

    protected function casts(): array
    {
        return [
            'opened_at' => 'datetime',
            'closed_at' => 'datetime',
            'opening_float' => 'decimal:2',
            'system_cash_sales' => 'decimal:2',
            'system_upi_sales' => 'decimal:2',
            'system_card_sales' => 'decimal:2',
            'cash_paid_out' => 'decimal:2',
            'expected_cash' => 'decimal:2',
            'actual_cash_counted' => 'decimal:2',
            'variance' => 'decimal:2',
            'denominations' => 'array',
        ];
    }

    public function hotel(): BelongsTo
    {
        return $this->belongsTo(Hotel::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function handoverToUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'handover_to_user_id');
    }

    public function cashTransactions(): HasMany
    {
        return $this->hasMany(CashDrawerTransaction::class, 'shift_handover_id');
    }

    /**
     * Compute real-time live financials for the current shift.
     */
    public function computeLiveFinancials(): array
    {
        $endTime = $this->closed_at ?? now();

        // 1. Front Desk Collections
        $frontOfficePayments = Payment::whereHas('booking', function ($q) {
            $q->where('hotel_id', $this->hotel_id);
        })
            ->whereBetween('created_at', [$this->opened_at, $endTime])
            ->get();

        $foCash = (float) $frontOfficePayments->where('payment_method', 'CASH')->sum('amount');
        $foUpi = (float) $frontOfficePayments->where('payment_method', 'UPI_QR')->sum('amount');
        $foCard = (float) $frontOfficePayments->where('payment_method', 'CARD')->sum('amount');

        // 2. Restaurant POS Collections
        $posOrders = RestaurantOrder::where('hotel_id', $this->hotel_id)
            ->whereIn('status', ['BILLED', 'SETTLED'])
            ->whereBetween('settled_at', [$this->opened_at, $endTime])
            ->get();

        $posCash = (float) $posOrders->where('settlement_method', 'CASH')->sum('grand_total');
        $posUpi = (float) $posOrders->where('settlement_method', 'UPI_QR')->sum('grand_total');
        $posCard = (float) $posOrders->where('settlement_method', 'CARD')->sum('grand_total');
        $posFolio = (float) $posOrders->where('settlement_method', 'ROOM_FOLIO')->sum('grand_total');

        // Total sales by payment type
        $totalCashSales = round($foCash + $posCash, 2);
        $totalUpiSales = round($foUpi + $posUpi, 2);
        $totalCardSales = round($foCard + $posCard, 2);

        // 3. Cash Drawer Transactions (payouts vs float additions)
        $payouts = (float) $this->cashTransactions()
            ->whereIn('transaction_type', ['PAYOUT', 'CASH_DROP'])
            ->sum('amount');

        $floatAdditions = (float) $this->cashTransactions()
            ->whereIn('transaction_type', ['FLOAT_ADDITION', 'PAYIN'])
            ->sum('amount');

        // Expected cash in drawer right now
        $openingFloat = (float) $this->opening_float;
        $expectedCash = round($openingFloat + $totalCashSales + $floatAdditions - $payouts, 2);

        return [
            'opening_float' => $openingFloat,
            'front_office_cash' => $foCash,
            'pos_cash' => $posCash,
            'total_cash_sales' => $totalCashSales,
            'total_upi_sales' => $totalUpiSales,
            'total_card_sales' => $totalCardSales,
            'pos_room_folio_transfers' => $posFolio,
            'cash_payouts' => $payouts,
            'float_additions' => $floatAdditions,
            'expected_cash' => $expectedCash,
        ];
    }
}

