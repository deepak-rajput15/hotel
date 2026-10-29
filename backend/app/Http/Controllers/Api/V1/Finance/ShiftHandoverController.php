<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Domain\Finance\Models\CashDrawerTransaction;
use App\Domain\Finance\Models\ShiftHandover;
use App\Domain\Tenancy\Models\Hotel;
use App\Domain\Tenancy\Models\UserHotelAccess;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class ShiftHandoverController extends Controller
{
    /**
     * Resolve hotel model from request header or hotel_id query/param.
     */
    protected function resolveHotel(Request $request): ?Hotel
    {
        $hotelId = $request->header('X-Hotel-Context') ?? $request->get('hotel_id');

        if (!$hotelId) {
            $user = $request->user();
            $assignedHotel = $user->hotels()->first();
            return $assignedHotel;
        }

        if (Str::isUuid($hotelId)) {
            return Hotel::where('id', $hotelId)->first();
        }

        return Hotel::where('hotel_code', $hotelId)->first();
    }

    /**
     * Get current active shift or available staff list if no shift is open.
     */
    public function getCurrentShift(Request $request): JsonResponse
    {
        $hotel = $this->resolveHotel($request);
        if (!$hotel) {
            return response()->json(['success' => false, 'message' => 'Hotel context required'], 400);
        }

        $department = $request->get('department', 'FRONT_DESK');

        $activeShift = ShiftHandover::withoutGlobalScopes()
            ->where('hotel_id', $hotel->id)
            ->where('department', $department)
            ->where('status', 'OPEN')
            ->with(['user:id,name,email', 'cashTransactions.creator:id,name'])
            ->latest('opened_at')
            ->first();

        // Eligible staff list for handover options
        $eligibleStaff = UserHotelAccess::where('hotel_id', $hotel->id)
            ->with(['user:id,name,email', 'role:id,name,display_name'])
            ->get()
            ->map(function ($access) {
                return [
                    'id' => $access->user->id,
                    'name' => $access->user->name,
                    'email' => $access->user->email,
                    'role' => $access->role->display_name ?? $access->role->name,
                ];
            });

        if (!$activeShift) {
            return response()->json([
                'success' => true,
                'has_active_shift' => false,
                'department' => $department,
                'hotel' => [
                    'id' => $hotel->id,
                    'hotel_code' => $hotel->hotel_code,
                    'name' => $hotel->name,
                ],
                'staff_options' => $eligibleStaff,
            ]);
        }

        $liveFinancials = $activeShift->computeLiveFinancials();

        return response()->json([
            'success' => true,
            'has_active_shift' => true,
            'shift' => array_merge($activeShift->toArray(), [
                'live_financials' => $liveFinancials,
            ]),
            'staff_options' => $eligibleStaff,
        ]);
    }

    /**
     * Open a new shift with opening float.
     */
    public function openShift(Request $request): JsonResponse
    {
        $hotel = $this->resolveHotel($request);
        if (!$hotel) {
            return response()->json(['success' => false, 'message' => 'Hotel context required'], 400);
        }

        $validated = $request->validate([
            'department' => 'required|in:FRONT_DESK,RESTAURANT_POS,COMBINED',
            'shift_type' => 'required|in:MORNING,EVENING,NIGHT,GENERAL',
            'opening_float' => 'required|numeric|min:0',
            'opening_notes' => 'nullable|string|max:500',
        ]);

        // Check if there is already an open shift in this department
        $existing = ShiftHandover::withoutGlobalScopes()
            ->where('hotel_id', $hotel->id)
            ->where('department', $validated['department'])
            ->where('status', 'OPEN')
            ->first();

        if ($existing) {
            return response()->json([
                'success' => false,
                'message' => "A {$validated['department']} shift ({$existing->shift_code}) is already OPEN. Please close it before opening a new shift.",
            ], 422);
        }

        $user = $request->user();
        $dateStr = Carbon::now()->format('Ymd');
        $randomSeq = strtoupper(Str::random(4));
        $shiftCode = "SFT-{$dateStr}-{$randomSeq}";

        $shift = ShiftHandover::create([
            'hotel_id' => $hotel->id,
            'shift_code' => $shiftCode,
            'department' => $validated['department'],
            'shift_type' => $validated['shift_type'],
            'user_id' => $user->id,
            'status' => 'OPEN',
            'opened_at' => now(),
            'opening_float' => $validated['opening_float'],
            'opening_notes' => $validated['opening_notes'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Shift {$shift->shift_code} opened successfully with float ₹{$shift->opening_float}.",
            'shift' => $shift->load(['user:id,name,email']),
        ], 201);
    }

    /**
     * Add a mid-shift cash transaction (Petty Cash payout, float addition, cash drop).
     */
    public function recordCashTransaction(Request $request, string $shiftId): JsonResponse
    {
        $hotel = $this->resolveHotel($request);
        if (!$hotel) {
            return response()->json(['success' => false, 'message' => 'Hotel context required'], 400);
        }

        $shift = ShiftHandover::withoutGlobalScopes()
            ->where('hotel_id', $hotel->id)
            ->where('id', $shiftId)
            ->first();

        if (!$shift) {
            return response()->json(['success' => false, 'message' => 'Shift not found'], 404);
        }

        if ($shift->status !== 'OPEN') {
            return response()->json(['success' => false, 'message' => 'Cannot add transactions to a CLOSED shift'], 422);
        }

        $validated = $request->validate([
            'transaction_type' => 'required|in:PAYOUT,FLOAT_ADDITION,CASH_DROP',
            'amount' => 'required|numeric|min:1',
            'reason' => 'required|string|max:255',
            'recipient_name' => 'nullable|string|max:100',
            'receipt_voucher_no' => 'nullable|string|max:50',
        ]);

        $user = $request->user();

        $transaction = CashDrawerTransaction::create([
            'shift_handover_id' => $shift->id,
            'hotel_id' => $hotel->id,
            'transaction_type' => $validated['transaction_type'],
            'amount' => $validated['amount'],
            'reason' => $validated['reason'],
            'recipient_name' => $validated['recipient_name'] ?? null,
            'receipt_voucher_no' => $validated['receipt_voucher_no'] ?? null,
            'created_by' => $user->id,
        ]);

        $liveFinancials = $shift->computeLiveFinancials();

        return response()->json([
            'success' => true,
            'message' => "Cash transaction of ₹{$transaction->amount} ({$transaction->transaction_type}) recorded.",
            'transaction' => $transaction->load('creator:id,name'),
            'live_financials' => $liveFinancials,
        ], 201);
    }

    /**
     * Close shift, verify physical count, compute variance, and handover.
     */
    public function closeShift(Request $request, string $shiftId): JsonResponse
    {
        $hotel = $this->resolveHotel($request);
        if (!$hotel) {
            return response()->json(['success' => false, 'message' => 'Hotel context required'], 400);
        }

        $shift = ShiftHandover::withoutGlobalScopes()
            ->where('hotel_id', $hotel->id)
            ->where('id', $shiftId)
            ->first();

        if (!$shift) {
            return response()->json(['success' => false, 'message' => 'Shift not found'], 404);
        }

        if ($shift->status !== 'OPEN') {
            return response()->json(['success' => false, 'message' => 'Shift is already CLOSED'], 422);
        }

        $validated = $request->validate([
            'actual_cash_counted' => 'required|numeric|min:0',
            'denominations' => 'nullable|array',
            'handover_to_user_id' => 'nullable|exists:users,id',
            'handover_notes' => 'nullable|string|max:1000',
        ]);

        $financials = $shift->computeLiveFinancials();
        $expectedCash = $financials['expected_cash'];
        $actualCounted = (float) $validated['actual_cash_counted'];
        $variance = round($actualCounted - $expectedCash, 2);

        $shift->update([
            'closed_at' => now(),
            'status' => 'CLOSED',
            'system_cash_sales' => $financials['total_cash_sales'],
            'system_upi_sales' => $financials['total_upi_sales'],
            'system_card_sales' => $financials['total_card_sales'],
            'cash_paid_out' => $financials['cash_payouts'],
            'expected_cash' => $expectedCash,
            'actual_cash_counted' => $actualCounted,
            'variance' => $variance,
            'denominations' => $validated['denominations'] ?? null,
            'handover_to_user_id' => $validated['handover_to_user_id'] ?? null,
            'handover_notes' => $validated['handover_notes'] ?? null,
        ]);

        $statusText = $variance === 0.0
            ? 'PERFECT MATCH'
            : ($variance > 0 ? "OVERAGE (+₹{$variance})" : "SHORTAGE (-₹" . abs($variance) . ")");

        return response()->json([
            'success' => true,
            'message' => "Shift {$shift->shift_code} closed successfully. Status: {$statusText}.",
            'shift' => $shift->fresh(['user:id,name,email', 'handoverToUser:id,name,email', 'cashTransactions']),
            'variance_summary' => [
                'expected_cash' => $expectedCash,
                'actual_cash_counted' => $actualCounted,
                'variance' => $variance,
                'status' => $variance === 0.0 ? 'BALANCED' : ($variance > 0 ? 'OVERAGE' : 'SHORTAGE'),
            ],
        ]);
    }

    /**
     * List historical shifts with filters and audit summaries.
     */
    public function listShifts(Request $request): JsonResponse
    {
        $hotel = $this->resolveHotel($request);
        if (!$hotel) {
            return response()->json(['success' => false, 'message' => 'Hotel context required'], 400);
        }

        $query = ShiftHandover::withoutGlobalScopes()
            ->where('hotel_id', $hotel->id)
            ->with(['user:id,name,email', 'handoverToUser:id,name,email', 'cashTransactions']);

        if ($request->filled('department')) {
            $query->where('department', $request->department);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('shift_type')) {
            $query->where('shift_type', $request->shift_type);
        }

        $shifts = $query->latest('opened_at')->paginate(20);

        return response()->json([
            'success' => true,
            'shifts' => $shifts,
        ]);
    }

    /**
     * Get printable slip data for shift handover.
     */
    public function getShiftSlip(Request $request, string $shiftId): JsonResponse
    {
        $hotel = $this->resolveHotel($request);
        if (!$hotel) {
            return response()->json(['success' => false, 'message' => 'Hotel context required'], 400);
        }

        $shift = ShiftHandover::withoutGlobalScopes()
            ->where('hotel_id', $hotel->id)
            ->where('id', $shiftId)
            ->with(['user:id,name,email', 'handoverToUser:id,name,email', 'cashTransactions.creator:id,name'])
            ->first();

        if (!$shift) {
            return response()->json(['success' => false, 'message' => 'Shift not found'], 404);
        }

        $slip = [
            'hotel_name' => $hotel->name,
            'hotel_code' => $hotel->hotel_code,
            'hotel_address' => $hotel->address ?? 'Main Road, City',
            'hotel_phone' => $hotel->phone ?? '+91 9876543210',
            'shift_code' => $shift->shift_code,
            'department' => $shift->department,
            'shift_type' => $shift->shift_type,
            'opened_by' => $shift->user->name ?? 'Staff',
            'handed_over_to' => $shift->handoverToUser->name ?? 'Pending / Unassigned',
            'opened_at' => $shift->opened_at->toIso8601String(),
            'closed_at' => $shift->closed_at ? $shift->closed_at->toIso8601String() : null,
            'status' => $shift->status,
            'financials' => [
                'opening_float' => (float) $shift->opening_float,
                'system_cash_sales' => (float) $shift->system_cash_sales,
                'system_upi_sales' => (float) $shift->system_upi_sales,
                'system_card_sales' => (float) $shift->system_card_sales,
                'cash_paid_out' => (float) $shift->cash_paid_out,
                'expected_cash' => (float) $shift->expected_cash,
                'actual_cash_counted' => (float) $shift->actual_cash_counted,
                'variance' => (float) $shift->variance,
            ],
            'denominations' => $shift->denominations,
            'handover_notes' => $shift->handover_notes,
            'opening_notes' => $shift->opening_notes,
            'cash_transactions' => $shift->cashTransactions,
            'generated_at' => now()->toIso8601String(),
        ];

        return response()->json([
            'success' => true,
            'slip' => $slip,
        ]);
    }
}
