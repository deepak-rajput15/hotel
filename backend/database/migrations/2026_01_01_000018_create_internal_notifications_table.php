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
        Schema::create('internal_notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('sender_id')->constrained('users')->onDelete('cascade');
            $table->string('sender_type', 50)->default('HOTEL_OWNER'); // PLATFORM_ADMIN, HOTEL_OWNER
            $table->foreignUuid('organization_id')->nullable()->constrained('organizations')->onDelete('cascade');
            $table->foreignUuid('hotel_id')->nullable()->constrained('hotels')->onDelete('cascade');
            $table->string('target_scope', 50)->default('ALL_STAFF'); // GLOBAL_OWNERS, ORGANIZATION_OWNERS, ALL_STAFF, SPECIFIC_ROLE, SPECIFIC_HOTEL
            $table->string('target_role', 100)->nullable(); // front-desk, head-chef, restaurant-cashier, storekeeper, general-manager
            $table->string('title', 255);
            $table->text('message');
            $table->string('priority', 20)->default('INFO'); // INFO, WARNING, URGENT
            $table->boolean('is_banner')->default(false); // Flash in top reminder bar
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['is_active', 'expires_at']);
            $table->index(['target_scope', 'target_role']);
            $table->index(['organization_id', 'hotel_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('internal_notifications');
    }
};
