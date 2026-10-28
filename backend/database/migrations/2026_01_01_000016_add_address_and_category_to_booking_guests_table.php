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
        Schema::table('booking_guests', function (Blueprint $table) {
            if (!Schema::hasColumn('booking_guests', 'guest_category')) {
                $table->string('guest_category', 20)->default('ADULT')->after('hotel_id'); // ADULT, CHILD
            }
            if (!Schema::hasColumn('booking_guests', 'address')) {
                $table->string('address', 255)->nullable()->after('nationality');
            }
            if (!Schema::hasColumn('booking_guests', 'city')) {
                $table->string('city', 100)->nullable()->after('address');
            }
            if (!Schema::hasColumn('booking_guests', 'state')) {
                $table->string('state', 100)->nullable()->after('city');
            }
            if (!Schema::hasColumn('booking_guests', 'country')) {
                $table->string('country', 100)->default('India')->nullable()->after('state');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('booking_guests', function (Blueprint $table) {
            $cols = ['guest_category', 'address', 'city', 'state', 'country'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('booking_guests', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
