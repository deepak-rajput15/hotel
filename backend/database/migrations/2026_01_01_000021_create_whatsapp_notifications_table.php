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
        Schema::create('whatsapp_notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('hotel_id')->constrained('hotels')->cascadeOnDelete();
            $table->foreignUuid('booking_id')->nullable()->constrained('bookings')->nullOnDelete();
            $table->string('recipient_phone', 30);
            $table->string('recipient_name', 100);
            $table->string('message_type', 40); // BOOKING_CONFIRMATION, PRE_CHECKIN_KYC, CHECKOUT_INVOICE, DAILY_OWNER_SUMMARY, CUSTOM
            $table->text('message_body');
            $table->string('status', 20)->default('SENT'); // SENT, DELIVERED, FAILED
            $table->string('external_message_id', 100)->nullable();
            $table->json('metadata')->nullable();
            $table->dateTime('sent_at');
            $table->timestamps();

            $table->index(['hotel_id', 'message_type']);
            $table->index(['hotel_id', 'booking_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('whatsapp_notifications');
    }
};
