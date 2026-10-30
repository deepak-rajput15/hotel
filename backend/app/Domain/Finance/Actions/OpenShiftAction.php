<?php

namespace App\Domain\Finance\Actions;

use App\Domain\Finance\Models\ShiftHandover;
use App\Domain\Tenancy\Models\Hotel;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OpenShiftAction
{
    /**
     * Open a new shift with opening float with pessimistic locking.
     *
     * @throws ValidationException
     */
    public function execute(Hotel $hotel, array $data, User $user): ShiftHandover
    {
        return DB::transaction(function () use ($hotel, $data, $user) {
            // Pessimistic lock check: prevents concurrent double-opening of shifts in same department
            $existing = ShiftHandover::withoutGlobalScopes()
                ->where('hotel_id', $hotel->id)
                ->where('department', $data['department'])
                ->where('status', 'OPEN')
                ->lockForUpdate()
                ->first();

            if ($existing) {
                throw ValidationException::withMessages([
                    'department' => "A {$data['department']} shift ({$existing->shift_code}) is already OPEN. Please close it before opening a new shift.",
                ]);
            }

            $dateStr = Carbon::now()->format('Ymd');
            $randomSeq = strtoupper(Str::random(4));
            $shiftCode = "SFT-{$dateStr}-{$randomSeq}";

            $shift = ShiftHandover::create([
                'hotel_id' => $hotel->id,
                'shift_code' => $shiftCode,
                'department' => $data['department'],
                'shift_type' => $data['shift_type'],
                'user_id' => $user->id,
                'status' => 'OPEN',
                'opened_at' => now(),
                'opening_float' => $data['opening_float'],
                'opening_notes' => $data['opening_notes'] ?? null,
            ]);

            return $shift->load(['user:id,name,email']);
        });
    }
}
