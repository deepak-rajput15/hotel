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
        Schema::create('hotel_module_subscriptions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('hotel_id')->constrained('hotels')->onDelete('cascade');
            $table->foreignUuid('module_id')->constrained('modules')->onDelete('cascade');
            $table->string('status', 20)->default('ACTIVE'); // ACTIVE, EXPIRED, SUSPENDED, TRIAL
            $table->timestamp('starts_at')->useCurrent();
            $table->timestamp('expires_at')->nullable(); // NULL = perpetual/lifetime until turned off
            $table->jsonb('settings')->nullable();
            $table->timestamps();

            $table->unique(['hotel_id', 'module_id']);
            $table->index(['hotel_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hotel_module_subscriptions');
    }
};
