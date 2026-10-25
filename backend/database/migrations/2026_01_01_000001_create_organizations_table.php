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
        Schema::create('organizations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('org_code', 30)->unique(); // e.g. ORG-1001
            $table->string('name');
            $table->string('billing_email');
            $table->string('phone', 50)->nullable();
            $table->string('tax_number', 100)->nullable();
            $table->string('status', 20)->default('ACTIVE'); // ACTIVE, SUSPENDED, CANCELLED
            $table->jsonb('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('organizations');
    }
};
