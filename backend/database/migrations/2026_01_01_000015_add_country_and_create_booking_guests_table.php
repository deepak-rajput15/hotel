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
        // 1. Add country column to guests table
        Schema::table('guests', function (Blueprint $table) {
            if (!Schema::hasColumn('guests', 'country')) {
                $table->string('country', 100)->default('India')->nullable()->after('state');
            }
        });

        // 2. Add co_guests json column to bookings table
        Schema::table('bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('bookings', 'co_guests')) {
                $table->json('co_guests')->nullable()->after('num_children');
            }
        });

        // 3. Create booking_guests table for relational multi-occupant KYC tracking
        if (!Schema::hasTable('booking_guests')) {
            Schema::create('booking_guests', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('booking_id')->constrained('bookings')->onDelete('cascade');
                $table->foreignUuid('hotel_id')->constrained('hotels')->onDelete('cascade');
                $table->string('first_name', 100);
                $table->string('last_name', 100);
                $table->string('gender', 20)->default('MALE'); // MALE, FEMALE, OTHER
                $table->integer('age');
                $table->string('phone', 30)->nullable();
                $table->string('id_type', 50)->default('AADHAAR'); // AADHAAR, PASSPORT, DRIVING_LICENSE, VOTER_ID
                $table->string('id_number', 100);
                $table->string('relationship', 50)->default('Family'); // Spouse, Family, Friend, Colleague, Other
                $table->string('nationality', 100)->default('Indian');
                $table->timestamps();

                $table->index(['booking_id', 'id_number']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('booking_guests');

        Schema::table('bookings', function (Blueprint $table) {
            if (Schema::hasColumn('bookings', 'co_guests')) {
                $table->dropColumn('co_guests');
            }
        });

        Schema::table('guests', function (Blueprint $table) {
            if (Schema::hasColumn('guests', 'country')) {
                $table->dropColumn('country');
            }
        });
    }
};

