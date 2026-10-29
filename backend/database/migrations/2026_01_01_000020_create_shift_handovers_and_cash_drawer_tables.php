<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('shift_handovers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('hotel_id')->constrained('hotels')->cascadeOnDelete();
            $table->string('shift_code', 50);
            $table->string('department', 30)->default('FRONT_DESK'); // FRONT_DESK, RESTAURANT_POS, COMBINED
            $table->string('shift_type', 30)->default('MORNING'); // MORNING, EVENING, NIGHT, GENERAL
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('handover_to_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 20)->default('OPEN'); // OPEN, CLOSED
            $table->dateTime('opened_at');
            $table->dateTime('closed_at')->nullable();
            $table->decimal('opening_float', 12, 2)->default(0.00);
            $table->decimal('system_cash_sales', 12, 2)->default(0.00);
            $table->decimal('system_upi_sales', 12, 2)->default(0.00);
            $table->decimal('system_card_sales', 12, 2)->default(0.00);
            $table->decimal('cash_paid_out', 12, 2)->default(0.00);
            $table->decimal('expected_cash', 12, 2)->default(0.00);
            $table->decimal('actual_cash_counted', 12, 2)->default(0.00);
            $table->decimal('variance', 12, 2)->default(0.00);
            $table->json('denominations')->nullable();
            $table->text('opening_notes')->nullable();
            $table->text('handover_notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['hotel_id', 'shift_code']);
            $table->index(['hotel_id', 'department', 'status']);
            $table->index(['hotel_id', 'user_id', 'status']);
        });

        Schema::create('cash_drawer_transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('shift_handover_id')->constrained('shift_handovers')->cascadeOnDelete();
            $table->foreignUuid('hotel_id')->constrained('hotels')->cascadeOnDelete();
            $table->string('transaction_type', 30); // PAYOUT, FLOAT_ADDITION, CASH_DROP
            $table->decimal('amount', 12, 2);
            $table->string('reason', 255);
            $table->string('recipient_name', 100)->nullable();
            $table->string('receipt_voucher_no', 50)->nullable();
            $table->foreignUuid('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->index(['shift_handover_id', 'transaction_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cash_drawer_transactions');
        Schema::dropIfExists('shift_handovers');
    }
};
