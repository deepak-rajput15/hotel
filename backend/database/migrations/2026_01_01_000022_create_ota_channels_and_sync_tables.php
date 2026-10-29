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
        Schema::create('ota_channels', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('hotel_id')->constrained('hotels')->cascadeOnDelete();
            $table->string('channel_code', 40); // MAKEMYTRIP, BOOKING_COM, AGODA, EXPEDIA, AIRBNB
            $table->string('channel_name', 100);
            $table->string('hotel_channel_id', 100)->nullable(); // e.g. MMT-10023, BKG-88371
            $table->string('api_key', 255)->nullable();
            $table->string('webhook_secret', 255)->nullable();
            $table->boolean('is_connected')->default(false);
            $table->boolean('two_way_sync_enabled')->default(true);
            $table->decimal('commission_rate_percent', 5, 2)->default(15.00); // e.g. 18.00%
            $table->dateTime('last_sync_at')->nullable();
            $table->string('sync_status', 30)->default('IDLE'); // IDLE, HEALTHY, SYNCING, ERROR
            $table->json('room_type_mappings')->nullable();
            $table->json('rate_multiplier')->nullable();
            $table->timestamps();

            $table->unique(['hotel_id', 'channel_code']);
        });

        Schema::create('ota_sync_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('hotel_id')->constrained('hotels')->cascadeOnDelete();
            $table->foreignUuid('ota_channel_id')->nullable()->constrained('ota_channels')->nullOnDelete();
            $table->foreignUuid('booking_id')->nullable()->constrained('bookings')->nullOnDelete();
            $table->string('channel_code', 40);
            $table->string('direction', 20)->default('INBOUND'); // INBOUND, OUTBOUND
            $table->string('event_type', 50); // BOOKING_CREATED, BOOKING_CANCELLED, ARI_PUSH, RATE_UPDATE
            $table->string('ota_reservation_id', 100)->nullable();
            $table->string('guest_name', 100)->nullable();
            $table->string('guest_phone', 30)->nullable();
            $table->decimal('gross_amount', 12, 2)->default(0.00);
            $table->decimal('commission_amount', 12, 2)->default(0.00);
            $table->decimal('net_payable_to_hotel', 12, 2)->default(0.00);
            $table->string('status', 20)->default('SUCCESS'); // SUCCESS, WARNING, FAILED
            $table->text('message')->nullable();
            $table->json('payload')->nullable();
            $table->dateTime('processed_at');
            $table->timestamps();

            $table->index(['hotel_id', 'channel_code']);
            $table->index(['hotel_id', 'direction']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ota_sync_logs');
        Schema::dropIfExists('ota_channels');
    }
};

