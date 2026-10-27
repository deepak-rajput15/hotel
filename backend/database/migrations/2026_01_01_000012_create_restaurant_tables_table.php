<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Creates restaurant_tables table based on Book1.xlsx specification:
     * - Tableno
     * - QrCode
     */
    public function up(): void
    {
        Schema::create('restaurant_tables', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('hotel_id')->constrained('hotels')->onDelete('cascade');
            $table->string('table_no', 50);
            $table->text('qr_code')->nullable();
            $table->integer('capacity')->default(4);
            $table->string('seating_area', 50)->default('Main Dining');
            $table->string('status', 30)->default('AVAILABLE'); // AVAILABLE, OCCUPIED, RESERVED, CLEANING
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['hotel_id', 'table_no']);
            $table->index(['hotel_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('restaurant_tables');
    }
};
