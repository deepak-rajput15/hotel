<?php

namespace App\Domain\Purchase\Actions;

use App\Domain\Purchase\Models\PurchaseOrder;
use App\Domain\Purchase\Models\PurchaseOrderItem;
use App\Domain\Tenancy\Models\Hotel;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class CreatePurchaseOrderAction
{
    /**
     * Create and issue a new purchase order with itemized products and taxes.
     */
    public function execute(Hotel $hotel, array $data, ?User $actor = null): PurchaseOrder
    {
        return DB::transaction(function () use ($hotel, $data) {
            $supplier = $hotel->suppliers()->findOrFail($data['supplier_id']);

            // Generate unique PO Number (e.g. PO-20261028-001)
            $datePrefix = Carbon::now()->format('Ymd');
            $countToday = PurchaseOrder::where('hotel_id', $hotel->id)
                ->whereDate('created_at', Carbon::today())
                ->count();
            $poNumber = 'PO-' . $datePrefix . '-' . str_pad($countToday + 1, 3, '0', STR_PAD_LEFT);

            $order = PurchaseOrder::create([
                'hotel_id' => $hotel->id,
                'supplier_id' => $supplier->id,
                'po_number' => $poNumber,
                'status' => PurchaseOrder::STATUS_ISSUED,
                'expected_delivery_date' => $data['expected_delivery_date'] ?? Carbon::now()->addDays(3)->toDateString(),
                'payment_terms' => $data['payment_terms'] ?? 'Net 30 Days',
                'notes' => $data['notes'] ?? null,
                'issued_at' => Carbon::now(),
            ]);

            $subtotal = 0;
            $taxAmount = 0;

            foreach ($data['items'] as $itemData) {
                $product = $hotel->products()->findOrFail($itemData['product_id']);
                $qty = (float) $itemData['quantity'];
                $price = (float) $itemData['unit_price'];
                $lineTotal = round($qty * $price, 2);
                $tax = round(($lineTotal * (float) $product->gst_percentage) / 100, 2);

                PurchaseOrderItem::create([
                    'purchase_order_id' => $order->id,
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'unit' => $product->unit,
                    'quantity_ordered' => $qty,
                    'quantity_received' => 0.00,
                    'unit_price' => $price,
                    'tax_percentage' => (float) $product->gst_percentage,
                    'total_price' => $lineTotal + $tax,
                ]);

                $subtotal += $lineTotal;
                $taxAmount += $tax;
            }

            $order->update([
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'grand_total' => $subtotal + $taxAmount,
            ]);

            return $order->load(['supplier', 'items']);
        });
    }
}

