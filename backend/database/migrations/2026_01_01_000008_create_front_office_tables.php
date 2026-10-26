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
        // 1. Rooms inventory
        Schema::create('rooms', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('hotel_id')->constrained('hotels')->onDelete('cascade');
            $table->string('room_number', 20);
            $table->string('room_type', 100)->default('Deluxe Room');
            $table->string('floor', 50)->default('1st Floor');
            $table->decimal('base_price', 10, 2)->default(2500.00);
            $table->string('status', 30)->default('AVAILABLE'); // AVAILABLE, OCCUPIED, DIRTY, MAINTENANCE
            $table->integer('max_guests')->default(2);
            $table->json('amenities')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['hotel_id', 'room_number']);
            $table->index(['hotel_id', 'status']);
        });

        // 2. Guests KYC & Identity Verification
        Schema::create('guests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('hotel_id')->constrained('hotels')->onDelete('cascade');
            $table->string('first_name', 100);
            $table->string('last_name', 100)->nullable();
            $table->string('email', 150)->nullable();
            $table->string('phone', 30);
            $table->string('nationality', 100)->default('Indian');
            $table->string('id_type', 50)->default('AADHAAR'); // AADHAAR, PASSPORT, DRIVING_LICENSE, VOTER_ID
            $table->string('id_number', 100);
            $table->string('id_document_path', 255)->nullable();
            $table->text('address')->nullable();
            $table->string('city', 100)->nullable();
            $table->string('state', 100)->nullable();
            $table->string('purpose_of_visit', 150)->default('Business / Leisure');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['hotel_id', 'phone']);
            $table->index(['hotel_id', 'id_number']);
        });

        // 3. Bookings & Guest Stays
        Schema::create('bookings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('hotel_id')->constrained('hotels')->onDelete('cascade');
            $table->string('booking_number', 50);
            $table->foreignUuid('guest_id')->constrained('guests')->onDelete('restrict');
            $table->foreignUuid('room_id')->constrained('rooms')->onDelete('restrict');
            $table->dateTime('check_in_at');
            $table->dateTime('expected_check_out_at');
            $table->dateTime('check_out_at')->nullable();
            $table->integer('num_adults')->default(1);
            $table->integer('num_children')->default(0);
            $table->string('status', 30)->default('CHECKED_IN'); // RESERVED, CHECKED_IN, CHECKED_OUT, CANCELLED
            $table->decimal('room_rate_per_night', 10, 2);
            $table->integer('total_nights')->default(1);
            $table->decimal('total_room_charges', 10, 2)->default(0);
            $table->decimal('total_extra_charges', 10, 2)->default(0);
            $table->decimal('tax_amount', 10, 2)->default(0); // 12% GST standard
            $table->decimal('discount_amount', 10, 2)->default(0);
            $table->decimal('grand_total', 10, 2)->default(0);
            $table->decimal('paid_amount', 10, 2)->default(0);
            $table->decimal('balance_amount', 10, 2)->default(0);
            $table->string('payment_status', 30)->default('PENDING'); // PENDING, PARTIAL, PAID
            $table->text('special_requests')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['hotel_id', 'booking_number']);
            $table->index(['hotel_id', 'status']);
        });

        // 4. Folio Itemized Charges (Room service, Laundry, Extra services)
        Schema::create('folio_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('booking_id')->constrained('bookings')->onDelete('cascade');
            $table->string('item_type', 50)->default('ROOM_CHARGE'); // ROOM_CHARGE, FOOD_BEVERAGE, LAUNDRY, EXTRA_BED, MISC
            $table->string('description', 255);
            $table->integer('quantity')->default(1);
            $table->decimal('unit_price', 10, 2)->default(0);
            $table->decimal('total_price', 10, 2)->default(0);
            $table->dateTime('charged_at');
            $table->timestamps();

            $table->index(['booking_id', 'item_type']);
        });

        // 5. Payment Receipts & Ledger
        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('booking_id')->constrained('bookings')->onDelete('cascade');
            $table->string('receipt_number', 50);
            $table->decimal('amount', 10, 2);
            $table->string('payment_method', 50)->default('UPI_QR'); // CASH, UPI_QR, CARD, BANK_TRANSFER
            $table->string('transaction_reference', 100)->nullable();
            $table->string('payment_type', 50)->default('ADVANCE_DEPOSIT'); // ADVANCE_DEPOSIT, SETTLEMENT, PARTIAL
            $table->string('notes', 255)->nullable();
            $table->timestamps();

            $table->index(['booking_id', 'receipt_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
        Schema::dropIfExists('folio_items');
        Schema::dropIfExists('bookings');
        Schema::dropIfExists('guests');
        Schema::dropIfExists('rooms');
    }
};
