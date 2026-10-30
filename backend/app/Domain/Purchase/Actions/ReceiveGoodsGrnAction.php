<?php

namespace App\Domain\Purchase\Actions;

use App\Domain\Purchase\Models\GoodsReceiptNote;
use App\Domain\Purchase\Models\GoodsReceiptNoteItem;
use App\Domain\Purchase\Models\PurchaseOrder;
use App\Domain\Store\Models\Product;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReceiveGoodsGrnAction
{
    /**
     * Receive delivery, create GRN and automatically update product stock in store inventory.
     *
     * @throws ValidationException
     */
    public function execute(PurchaseOrder $order, array $data, ?User $actor = null): array
    {
        if ($order->status === PurchaseOrder::STATUS_COMPLETED || $order->status === PurchaseOrder::STATUS_CANCELLED) {
            throw ValidationException::withMessages([
                'status' => "Cannot receive delivery on a {$order->status} Purchase Order.",
            ]);
        }

        return DB::transaction(function () use ($order, $data) {
            $hotel = $order->hotel;

            // Generate GRN Number (e.g. GRN-20261028-001)
            $datePrefix = Carbon::now()->format('Ymd');
            $countToday = GoodsReceiptNote::where('hotel_id', $hotel->id)
                ->whereDate('created_at', Carbon::today())
                ->count();
            $grnNumber = 'GRN-' . $datePrefix . '-' . str_pad($countToday + 1, 3, '0', STR_PAD_LEFT);

            $grn = GoodsReceiptNote::create([
                'hotel_id' => $hotel->id,
                'purchase_order_id' => $order->id,
                'supplier_id' => $order->supplier_id,
                'grn_number' => $grnNumber,
                'delivery_challan_no' => $data['delivery_challan_no'] ?? null,
                'invoice_no' => $data['invoice_no'] ?? null,
                'received_date' => $data['received_date'],
                'remarks' => $data['remarks'] ?? null,
            ]);

            $grnTotal = 0;

            foreach ($data['items'] as $itemData) {
                $poItem = $order->items()->findOrFail($itemData['purchase_order_item_id']);
                $qtyReceived = (float) $itemData['quantity_received'];

                $remainingQty = max(0, (float) $poItem->quantity_ordered - (float) $poItem->quantity_received);
                if ($qtyReceived > $remainingQty) {
                    throw ValidationException::withMessages([
                        'quantity_received' => "Cannot receive {$qtyReceived} {$poItem->unit} for item '{$poItem->product_name}'. Remaining pending quantity on PO is only {$remainingQty} {$poItem->unit}.",
                    ]);
                }

                $itemTotal = round($qtyReceived * (float) $poItem->unit_price, 2);

                GoodsReceiptNoteItem::create([
                    'goods_receipt_note_id' => $grn->id,
                    'purchase_order_item_id' => $poItem->id,
                    'product_id' => $poItem->product_id,
                    'product_name' => $poItem->product_name,
                    'unit' => $poItem->unit,
                    'quantity_received' => $qtyReceived,
                    'unit_price' => $poItem->unit_price,
                    'total_price' => $itemTotal,
                ]);

                // Update PO Item quantity received
                $poItem->increment('quantity_received', $qtyReceived);

                // AUTOMATICALLY INCREMENT PRODUCT CURRENT STOCK AND SYNC BATCHES IN STORE INVENTORY
                $product = Product::where('id', $poItem->product_id)->lockForUpdate()->first();
                if ($product) {
                    $batches = is_array($product->batches) ? $product->batches : [];
                    $batchNo = !empty($itemData['batch_no']) 
                        ? $itemData['batch_no'] 
                        : ('BAT-GRN-' . strtoupper(substr(uniqid(), -6)));
                    $expiryPeriod = !empty($itemData['expiry_period']) 
                        ? $itemData['expiry_period'] 
                        : ($product->expiry_period ?? '6 Months');

                    $batches[] = [
                        'batch_no' => $batchNo,
                        'quantity' => $qtyReceived,
                        'unit' => $poItem->unit,
                        'expiry_period' => $expiryPeriod,
                        'received_at' => $data['received_date'] ?? now()->toIso8601String(),
                        'notes' => "Received via GRN #{$grn->grn_number} (PO: #{$order->po_number})",
                    ];

                    $product->batches = $batches;
                    $product->current_stock = (float) $product->current_stock + $qtyReceived;
                    $product->save();
                }

                $grnTotal += $itemTotal;
            }

            $grn->update(['total_amount' => $grnTotal]);

            // Check if all PO items are completely received
            $order->refresh();
            $allCompleted = true;
            foreach ($order->items as $item) {
                if ((float) $item->quantity_received < (float) $item->quantity_ordered) {
                    $allCompleted = false;
                    break;
                }
            }

            if ($allCompleted) {
                $order->update([
                    'status' => PurchaseOrder::STATUS_COMPLETED,
                    'completed_at' => Carbon::now(),
                ]);
            } else {
                $order->update([
                    'status' => PurchaseOrder::STATUS_PARTIALLY_RECEIVED,
                ]);
            }

            return [
                'grn' => $grn->load('items'),
                'order' => $order->fresh(['items']),
            ];
        });
    }
}

