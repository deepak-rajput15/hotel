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
        // 1. Menu Categories
        Schema::create('menu_categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('hotel_id')->constrained('hotels')->onDelete('cascade');
            $table->string('name', 100);
            $table->string('slug', 100)->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['hotel_id', 'is_active']);
        });

        // 2. Menu Items
        Schema::create('menu_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('hotel_id')->constrained('hotels')->onDelete('cascade');
            $table->foreignUuid('category_id')->nullable()->constrained('menu_categories')->nullOnDelete();
            $table->string('category_name', 100);
            $table->string('item_code', 50);
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2);
            $table->decimal('gst_percentage', 5, 2)->default(5.00); // 5% GST on Restaurant Dining
            $table->string('food_type', 20)->default('VEG'); // VEG, NON_VEG, EGG
            $table->boolean('is_available')->default(true);
            $table->integer('preparation_time_minutes')->default(15);
            $table->string('image_url', 255)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['hotel_id', 'item_code']);
            $table->index(['hotel_id', 'category_name']);
            $table->index(['hotel_id', 'food_type']);
            $table->index(['hotel_id', 'is_available']);
        });

        // 3. Restaurant Orders
        Schema::create('restaurant_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('hotel_id')->constrained('hotels')->onDelete('cascade');
            $table->string('order_number', 50);
            $table->string('order_type', 30)->default('DINE_IN'); // DINE_IN, ROOM_SERVICE, TAKEAWAY
            $table->foreignUuid('table_id')->nullable()->constrained('restaurant_tables')->nullOnDelete();
            $table->foreignUuid('room_id')->nullable()->constrained('rooms')->nullOnDelete();
            $table->foreignUuid('booking_id')->nullable()->constrained('bookings')->nullOnDelete();
            $table->string('customer_name', 100)->nullable();
            $table->string('customer_phone', 30)->nullable();
            $table->integer('covers')->default(1);
            $table->string('status', 30)->default('OPEN'); // OPEN, BILLED, SETTLED, CANCELLED
            $table->decimal('subtotal', 10, 2)->default(0.00);
            $table->decimal('tax_amount', 10, 2)->default(0.00); // 5% GST
            $table->decimal('discount_amount', 10, 2)->default(0.00);
            $table->decimal('grand_total', 10, 2)->default(0.00);
            $table->string('settlement_method', 30)->nullable(); // ROOM_FOLIO, CASH, UPI_QR, CARD
            $table->string('settlement_reference', 100)->nullable();
            $table->dateTime('billed_at')->nullable();
            $table->dateTime('settled_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['hotel_id', 'order_number']);
            $table->index(['hotel_id', 'status']);
            $table->index(['hotel_id', 'table_id']);
        });

        // 4. Restaurant Order Items (Itemized KOTs)
        Schema::create('restaurant_order_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('order_id')->constrained('restaurant_orders')->onDelete('cascade');
            $table->foreignUuid('menu_item_id')->nullable()->constrained('menu_items')->nullOnDelete();
            $table->string('kot_number', 30)->default('KOT-001');
            $table->string('item_name', 150);
            $table->string('food_type', 20)->default('VEG');
            $table->integer('quantity')->default(1);
            $table->decimal('unit_price', 10, 2)->default(0.00);
            $table->decimal('total_price', 10, 2)->default(0.00);
            $table->string('special_notes', 255)->nullable();
            $table->string('status', 30)->default('PENDING'); // PENDING, PREPARING, READY, SERVED, CANCELLED
            $table->dateTime('kot_printed_at')->nullable();
            $table->timestamps();

            $table->index(['order_id', 'status']);
            $table->index(['order_id', 'kot_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('restaurant_order_items');
        Schema::dropIfExists('restaurant_orders');
        Schema::dropIfExists('menu_items');
        Schema::dropIfExists('menu_categories');
    }
};

