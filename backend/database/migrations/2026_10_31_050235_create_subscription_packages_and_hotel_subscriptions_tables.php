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
        // 1. Subscription Packages defined by SaaS Company / Sales Team
        Schema::create('subscription_packages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 150);
            $table->string('slug', 150)->unique();
            $table->text('description')->nullable();
            $table->decimal('monthly_price', 10, 2)->default(0);
            $table->decimal('yearly_price', 10, 2)->default(0);
            $table->decimal('onetime_price', 10, 2)->nullable();
            $table->decimal('setup_fee', 10, 2)->default(0);
            $table->string('currency', 10)->default('INR');
            $table->string('billing_cycle', 30)->default('ALL'); // ALL, MONTHLY, YEARLY, ONETIME
            $table->integer('max_rooms')->nullable(); // null = unlimited
            $table->integer('max_staff_accounts')->nullable(); // null = unlimited
            $table->integer('max_pos_terminals')->nullable(); // null = unlimited
            $table->jsonb('included_modules')->nullable(); // Array of module codes e.g. ["front_office", "rooms", "restaurant"]
            $table->jsonb('features_list')->nullable(); // Marketing bullet points
            $table->boolean('is_featured')->default(false);
            $table->string('badge_text', 50)->nullable(); // e.g. "Most Popular", "Best Value", "Boutique Choice"
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();
        });

        // 2. Hotel Subscriptions (Contracts assigned to hotels by Company Sales Team)
        Schema::create('hotel_subscriptions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('hotel_id')->constrained('hotels')->onDelete('cascade');
            $table->foreignUuid('package_id')->nullable()->constrained('subscription_packages')->nullOnDelete();
            $table->string('plan_name', 150);
            $table->string('billing_cycle', 30)->default('MONTHLY'); // MONTHLY, YEARLY, ONETIME, TRIAL
            $table->decimal('agreed_price', 10, 2)->default(0);
            $table->string('currency', 10)->default('INR');
            $table->string('status', 30)->default('ACTIVE'); // ACTIVE, TRIAL, PENDING, EXPIRED, CANCELLED
            $table->timestamp('starts_at')->useCurrent();
            $table->timestamp('expires_at')->nullable(); // null = lifetime / perpetual for ONETIME
            $table->string('payment_status', 30)->default('PAID'); // PAID, PENDING, PARTIAL, WAIVED
            $table->string('payment_method', 50)->default('BANK_TRANSFER'); // UPI_QR, BANK_TRANSFER, CHEQUE, CASH, CREDIT_CARD, COMPLIMENTARY
            $table->string('payment_reference', 150)->nullable(); // Transaction ID / Invoice / Cheque No
            $table->text('sales_notes')->nullable(); // Internal sales deal notes
            $table->foreignUuid('assigned_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['hotel_id', 'status']);
            $table->index(['expires_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hotel_subscriptions');
        Schema::dropIfExists('subscription_packages');
    }
};
