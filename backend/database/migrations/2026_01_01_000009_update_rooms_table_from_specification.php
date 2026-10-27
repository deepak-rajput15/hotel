<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Updates rooms table with fields specified in Book1.xlsx:
     * - Room Mode (AC / Non AC)
     * - Extra Bedding price
     * - GST %
     * - Remarks
     */
    public function up(): void
    {
        Schema::table('rooms', function (Blueprint $table) {
            $table->string('room_mode', 20)->default('AC')->after('room_type'); // AC, Non AC
            $table->decimal('extra_bedding_price', 10, 2)->default(0.00)->after('base_price');
            $table->decimal('gst_percentage', 5, 2)->default(12.00)->after('extra_bedding_price');
            $table->text('remarks')->nullable()->after('amenities');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rooms', function (Blueprint $table) {
            $table->dropColumn(['room_mode', 'extra_bedding_price', 'gst_percentage', 'remarks']);
        });
    }
};
