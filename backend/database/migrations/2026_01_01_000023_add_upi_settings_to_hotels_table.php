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
        Schema::table('hotels', function (Blueprint $table) {
            if (!Schema::hasColumn('hotels', 'upi_id')) {
                $table->string('upi_id', 150)->nullable()->after('currency');
            }
            if (!Schema::hasColumn('hotels', 'upi_payee_name')) {
                $table->string('upi_payee_name', 150)->nullable()->after('upi_id');
            }
            if (!Schema::hasColumn('hotels', 'upi_qr_image')) {
                $table->text('upi_qr_image')->nullable()->after('upi_payee_name');
            }
            if (!Schema::hasColumn('hotels', 'upi_merchant_code')) {
                $table->string('upi_merchant_code', 50)->nullable()->after('upi_qr_image');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('hotels', function (Blueprint $table) {
            $cols = ['upi_id', 'upi_payee_name', 'upi_qr_image', 'upi_merchant_code'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('hotels', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
