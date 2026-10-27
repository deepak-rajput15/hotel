<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Creates products table based on Book1.xlsx specification:
     * - Category (Grocery & Grains, Vegetables & Fruits, Dairy Products, Meat & Seafood, Beverages, Spices & Masalas, Crockery, Other / Restaurant Supplies)
     * - Product Name
     * - Product Code
     * - Product Description
     * - Unit
     * - Expiry (MM/yyyy)
     * - Rate
     * - Gst%
     * - Opening Stock
     * - Minimum Stock Qty
     * - Product Status (Active, Inactive)
     */
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('hotel_id')->constrained('hotels')->onDelete('cascade');
            $table->foreignUuid('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
            $table->string('category', 100);
            $table->string('name', 150);
            $table->string('product_code', 50);
            $table->text('description')->nullable();
            $table->string('unit', 30)->default('Kg');
            $table->string('expiry_period', 20)->nullable(); // MM/yyyy
            $table->date('expiry_date')->nullable();
            $table->decimal('rate', 10, 2)->default(0.00);
            $table->decimal('gst_percentage', 5, 2)->default(0.00);
            $table->decimal('opening_stock', 10, 2)->default(0.00);
            $table->decimal('current_stock', 10, 2)->default(0.00);
            $table->decimal('minimum_stock_qty', 10, 2)->default(0.00);
            $table->string('status', 20)->default('Active'); // Active, Inactive
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['hotel_id', 'product_code']);
            $table->index(['hotel_id', 'category']);
            $table->index(['hotel_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
