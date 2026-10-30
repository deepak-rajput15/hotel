<?php

namespace Tests\Unit\Domain\Finance;

use App\Domain\Access\Models\Role;
use App\Domain\Finance\Contracts\ShiftHandoverServiceInterface;
use App\Domain\Finance\Models\ShiftHandover;
use App\Domain\Tenancy\Models\Hotel;
use App\Domain\Tenancy\Models\Organization;
use App\Domain\Tenancy\Models\UserHotelAccess;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ShiftHandoverServiceUnitTest extends TestCase
{
    use RefreshDatabase;

    protected Hotel $hotel;
    protected User $user;
    protected ShiftHandoverServiceInterface $shiftService;

    protected function setUp(): void
    {
        parent::setUp();

        $org = Organization::create([
            'name' => 'Finance Unit Org',
            'org_code' => 'ORG-FIN',
            'billing_email' => 'finance@test.com',
            'slug' => 'org-fin',
        ]);

        $this->hotel = Hotel::create([
            'organization_id' => $org->id,
            'hotel_code' => 'HTL-FIN',
            'name' => 'Finance Grand Hotel',
            'slug' => 'finance-grand-hotel',
            'city' => 'Jaipur',
        ]);

        $this->user = User::create([
            'name' => 'Duty Cashier',
            'email' => 'cashier.unit@test.com',
            'password' => bcrypt('Secret@123'),
            'organization_id' => $org->id,
            'role_tier' => 'HOTEL_STAFF',
        ]);

        $role = Role::firstOrCreate(['slug' => 'front-desk'], ['name' => 'Front Desk']);
        UserHotelAccess::create([
            'user_id' => $this->user->id,
            'hotel_id' => $this->hotel->id,
            'role_id' => $role->id,
        ]);

        $this->shiftService = app(ShiftHandoverServiceInterface::class);
    }

    public function test_can_open_and_close_shift_via_service(): void
    {
        $shift = $this->shiftService->openShift($this->hotel, [
            'department' => 'FRONT_DESK',
            'shift_type' => 'MORNING',
            'opening_float' => 1500.00,
            'opening_notes' => 'Unit test morning opening',
        ], $this->user);

        $this->assertInstanceOf(ShiftHandover::class, $shift);
        $this->assertEquals('OPEN', $shift->status);
        $this->assertEquals(1500.00, (float) $shift->opening_float);

        // Record a valid cash drop within available funds
        $txResult = $this->shiftService->recordCashTransaction($shift, [
            'transaction_type' => 'CASH_DROP',
            'amount' => 500.00,
            'reason' => 'Midday safe transfer',
        ], $this->user);

        $this->assertArrayHasKey('transaction', $txResult);
        $this->assertEquals(1000.00, $txResult['live_financials']['expected_cash']);

        // Close shift
        $closeResult = $this->shiftService->closeShift($shift, [
            'actual_cash_counted' => 1000.00,
            'handover_notes' => 'Shift closed with zero variance',
        ], $this->user);

        $this->assertEquals('CLOSED', $closeResult['shift']->status);
        $this->assertEquals(0.00, $closeResult['variance_summary']['variance']);
    }

    public function test_service_blocks_cash_drawer_underflow_payout(): void
    {
        $shift = $this->shiftService->openShift($this->hotel, [
            'department' => 'FRONT_DESK',
            'shift_type' => 'EVENING',
            'opening_float' => 300.00,
        ], $this->user);

        $this->expectException(ValidationException::class);

        // Attempting to payout ₹2,000 with only ₹300 in drawer must throw ValidationException
        $this->shiftService->recordCashTransaction($shift, [
            'transaction_type' => 'PAYOUT',
            'amount' => 2000.00,
            'reason' => 'Excess payout',
        ], $this->user);
    }
}

