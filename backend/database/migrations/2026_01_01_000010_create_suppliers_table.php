<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Creates suppliers table based on Book1.xlsx specification:
     * - Firm Name
     * - Address
     * - Contact Person
     * - Mobile
     * - GST No.
     * - Pan No.
     * - Aadhar No
     */
    public function up(): void
    {
        Schema::create('suppliers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('hotel_id')->constrained('hotels')->onDelete('cascade');
            $table->string('firm_name', 150);
            $table->text('address')->nullable();
            $table->string('contact_person', 100)->nullable();
            $table->string('mobile', 30);
            $table->string('email', 150)->nullable();
            $table->string('gst_no', 30)->nullable();
            $table->string('pan_no', 30)->nullable();
            $table->string('aadhar_no', 30)->nullable();
            $table->string('status', 20)->default('Active'); // Active, Inactive
            $table->timestamps();
            $table->softDeletes();

            $table->index(['hotel_id', 'firm_name']);
            $table->index(['hotel_id', 'mobile']);
            $table->index(['hotel_id', 'gst_no']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('suppliers');
    }
};
