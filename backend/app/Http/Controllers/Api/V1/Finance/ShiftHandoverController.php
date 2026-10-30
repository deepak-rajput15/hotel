<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Domain\Finance\Contracts\ShiftHandoverServiceInterface;
use App\Domain\Finance\Models\ShiftHandover;
use App\Domain\Tenancy\Models\Hotel;
use App\Domain\Tenancy\Models\UserHotelAccess;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Finance\CloseShiftRequest;
use App\Http\Requests\Api\V1\Finance\OpenShiftRequest;
use App\Http\Requests\Api\V1\Finance\RecordCashTransactionRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ShiftHandoverController extends Controller
{
    public function __construct(
        protected ShiftHandoverServiceInterface $shiftService
    ) {}

    /**
     * Resolve hotel model from request header or hotel_id query/param.
     */
    protected function resolveHotel(Request $request): ?Hotel
    {
        $hotel = $request->attributes->get('current_hotel');
        if ($hotel) {
            return $hotel;
        }

        $hotelId = $request->header('X-Hotel-Context') ?? $request->header('X-Hotel-ID') ?? $request->get('hotel_id');

        $user = $request->user();
        if (!$user) {
            return null;
        }

        if (!$hotelId) {
            return $user->hotels()->first();
        }

        $target = Str::isUuid($hotelId)
            ? Hotel::where('id', $hotelId)->first()
            : Hotel::where('hotel_code', $hotelId)->first();

        if ($target && ($user->isPlatformAdmin() || $user->hasAccessToHotel($target->id))) {
            return $target;
        }

        return null;
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

        try {
            $eligibleStaff = UserHotelAccess::where('hotel_id', $hotel->id)
                ->with(['user:id,name,email', 'role:id,name,display_name'])
                ->get()
                ->filter(fn ($access) => $access->user !== null)
                ->map(function ($access) {
                    return [
                        'id' => $access->user->id,
                        'name' => $access->user->name,
                        'email' => $access->user->email,
                        'role' => $access->role?->display_name ?? $access->role?->name ?? 'Staff',
                    ];
                })
                ->values();
        } catch (\Throwable $e) {
            $eligibleStaff = collect([]);
        }

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

        try {
            $liveFinancials = $activeShift->computeLiveFinancials();
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning("computeLiveFinancials failed for shift {$activeShift->id}: " . $e->getMessage());
            $liveFinancials = [
                'opening_float' => (float) $activeShift->opening_float,
                'front_office_cash' => 0.0,
                'pos_cash' => 0.0,
                'total_cash_sales' => 0.0,
                'total_upi_sales' => 0.0,
                'total_card_sales' => 0.0,
                'pos_room_folio_transfers' => 0.0,
                'cash_payouts' => (float) ($activeShift->cash_paid_out ?? 0),
                'float_additions' => 0.0,
                'expected_cash' => (float) ($activeShift->opening_float ?? 0),
            ];
        }

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
    public function openShift(OpenShiftRequest $request): JsonResponse
    {
        $hotel = $this->resolveHotel($request);
        if (!$hotel) {
            return response()->json(['success' => false, 'message' => 'Hotel context required'], 400);
        }

        $shift = $this->shiftService->openShift($hotel, $request->validated(), $request->user());

        return response()->json([
            'success' => true,
            'message' => "Shift {$shift->shift_code} opened successfully with float ₹{$shift->opening_float}.",
            'shift' => $shift,
        ], 201);
    }

    /**
     * Add a mid-shift cash transaction (Petty Cash payout, float addition, cash drop).
     */
    public function recordCashTransaction(RecordCashTransactionRequest $request, string $shiftId): JsonResponse
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

        $result = $this->shiftService->recordCashTransaction($shift, $request->validated(), $request->user());
        $tx = $result['transaction'];

        return response()->json([
            'success' => true,
            'message' => "Cash transaction of ₹{$tx->amount} ({$tx->transaction_type}) recorded.",
            'transaction' => $tx,
            'live_financials' => $result['live_financials'],
        ], 201);
    }

    /**
     * Close shift, verify physical count, compute variance, and handover.
     */
    public function closeShift(CloseShiftRequest $request, string $shiftId): JsonResponse
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

        $result = $this->shiftService->closeShift($shift, $request->validated(), $request->user());

        return response()->json([
            'success' => true,
            'message' => "Shift {$result['shift']->shift_code} closed successfully. Status: {$result['status_text']}.",
            'shift' => $result['shift'],
            'variance_summary' => $result['variance_summary'],
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
