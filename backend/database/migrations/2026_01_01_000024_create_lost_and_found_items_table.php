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
        Schema::create('lost_and_found_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('hotel_id')->constrained('hotels')->cascadeOnDelete();
            $table->string('reference_no')->index();
            $table->string('item_name');
            $table->string('category')->default('OTHERS'); // ELECTRONICS, VALUABLES, DOCUMENTS, CLOTHING, BAGGAGE, OTHERS
            $table->string('found_location_type')->default('ROOM'); // ROOM, RESTAURANT, LOBBY, POOL_GARDEN, BANQUET, OTHER
            $table->foreignUuid('room_id')->nullable()->constrained('rooms')->nullOnDelete();
            $table->string('specific_location')->nullable();
            $table->dateTime('found_at');
            $table->string('found_by_name');
            $table->foreignUuid('found_by_staff_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('storage_location')->default('Front Desk Safe / Locker');
            $table->text('description')->nullable();
            $table->decimal('estimated_value', 10, 2)->nullable();
            $table->string('status')->default('IN_CUSTODY'); // IN_CUSTODY, CLAIMED, DISPOSED

            // Suspected Guest Details (auto-linked or manually specified)
            $table->string('guest_name')->nullable();
            $table->string('guest_phone')->nullable();
            $table->string('guest_email')->nullable();
            $table->foreignUuid('booking_id')->nullable()->constrained('bookings')->nullOnDelete();

            // Claim & Handover Details
            $table->dateTime('claimed_at')->nullable();
            $table->string('claimed_by_name')->nullable();
            $table->string('claimed_by_phone')->nullable();
            $table->string('claimed_by_id_proof')->nullable(); // Aadhaar / Passport / DL No.
            $table->string('handover_by_staff_name')->nullable();
            $table->text('handover_notes')->nullable();

            // Disposal Details (unclaimed / perishable / policy expiration)
            $table->dateTime('disposed_at')->nullable();
            $table->string('disposal_reason')->nullable();

            $table->timestamps();

            $table->index(['hotel_id', 'status']);
            $table->index(['hotel_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lost_and_found_items');
    }
};
