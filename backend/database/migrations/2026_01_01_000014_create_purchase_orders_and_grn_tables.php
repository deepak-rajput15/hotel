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
        // 1. Purchase Orders
        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('hotel_id')->constrained('hotels')->onDelete('cascade');
            $table->foreignUuid('supplier_id')->constrained('suppliers')->onDelete('restrict');
            $table->string('po_number', 50);
            $table->string('status', 30)->default('ISSUED'); // DRAFT, ISSUED, PARTIALLY_RECEIVED, COMPLETED, CANCELLED
            $table->date('expected_delivery_date')->nullable();
            $table->decimal('subtotal', 12, 2)->default(0.00);
            $table->decimal('tax_amount', 12, 2)->default(0.00);
            $table->decimal('grand_total', 12, 2)->default(0.00);
            $table->string('payment_terms', 100)->default('Net 30 Days');
            $table->text('notes')->nullable();
            $table->dateTime('issued_at')->nullable();
            $table->dateTime('completed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['hotel_id', 'po_number']);
            $table->index(['hotel_id', 'status']);
            $table->index(['hotel_id', 'supplier_id']);
        });

        // 2. Purchase Order Items
        Schema::create('purchase_order_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('purchase_order_id')->constrained('purchase_orders')->onDelete('cascade');
            $table->foreignUuid('product_id')->constrained('products')->onDelete('restrict');
            $table->string('product_name', 150);
            $table->string('unit', 30)->default('Kg');
            $table->decimal('quantity_ordered', 10, 2);
            $table->decimal('quantity_received', 10, 2)->default(0.00);
            $table->decimal('unit_price', 10, 2);
            $table->decimal('tax_percentage', 5, 2)->default(0.00);
            $table->decimal('total_price', 12, 2);
            $table->timestamps();

            $table->index(['purchase_order_id', 'product_id']);
        });

        // 3. Goods Receipt Notes (GRN)
        Schema::create('goods_receipt_notes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('hotel_id')->constrained('hotels')->onDelete('cascade');
            $table->foreignUuid('purchase_order_id')->nullable()->constrained('purchase_orders')->nullOnDelete();
            $table->foreignUuid('supplier_id')->constrained('suppliers')->onDelete('restrict');
            $table->string('grn_number', 50);
            $table->string('delivery_challan_no', 100)->nullable();
            $table->string('invoice_no', 100)->nullable();
            $table->date('received_date');
            $table->decimal('total_amount', 12, 2)->default(0.00);
            $table->text('remarks')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['hotel_id', 'grn_number']);
            $table->index(['hotel_id', 'purchase_order_id']);
        });

        // 4. Goods Receipt Note Items
        Schema::create('goods_receipt_note_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('goods_receipt_note_id')->constrained('goods_receipt_notes')->onDelete('cascade');
            $table->foreignUuid('purchase_order_item_id')->nullable()->constrained('purchase_order_items')->nullOnDelete();
            $table->foreignUuid('product_id')->constrained('products')->onDelete('restrict');
            $table->string('product_name', 150);
            $table->string('unit', 30)->default('Kg');
            $table->decimal('quantity_received', 10, 2);
            $table->decimal('unit_price', 10, 2);
            $table->decimal('total_price', 12, 2);
            $table->timestamps();

            $table->index(['goods_receipt_note_id', 'product_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('goods_receipt_note_items');
        Schema::dropIfExists('goods_receipt_notes');
        Schema::dropIfExists('purchase_order_items');
        Schema::dropIfExists('purchase_orders');
    }
};

