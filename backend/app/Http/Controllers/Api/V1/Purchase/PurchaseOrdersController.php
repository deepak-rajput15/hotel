<?php

namespace App\Http\Controllers\Api\V1\Purchase;

use App\Domain\Purchase\Models\GoodsReceiptNote;
use App\Domain\Purchase\Models\GoodsReceiptNoteItem;
use App\Domain\Purchase\Models\PurchaseOrder;
use App\Domain\Purchase\Models\PurchaseOrderItem;
use App\Domain\Purchase\Models\Supplier;
use App\Domain\Store\Models\Product;
use App\Domain\Tenancy\Models\Hotel;
use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PurchaseOrdersController extends Controller
{
    /**
     * Resolve hotel context from request attributes.
     */
    protected function getHotel(Request $request): Hotel
    {
        $hotel = $request->attributes->get('current_hotel');
        if (!$hotel) {
            abort(400, 'Hotel context could not be resolved (specify X-Hotel-ID header).');
        }
        return $hotel;
    }

    /**
     * Authorize that the user has permission to create and manage purchase orders.
     */
    protected function authorizeProcurementAction(Request $request): void
    {
        $user = $request->user();
        if (!$user) {
            abort(401, 'Unauthenticated.');
        }

        if ($user->isPlatformAdmin() || $user->isOrgOwner()) {
            return;
        }

        $hotel = $this->getHotel($request);
        $userRole = $user->hotelAccess()
            ->where('hotel_id', $hotel->id)
            ->with('role')
            ->first()?->role?->slug;

        $allowedRoles = ['storekeeper', 'purchase-manager', 'general-manager', 'hotel-owner'];
        if (in_array($userRole, $allowedRoles, true)) {
            return;
        }

        abort(response()->json([
            'success' => false,
            'error_code' => 'FORBIDDEN_PROCUREMENT_ACTION',
            'message' => 'Access Denied: Only Storekeepers, Purchase Managers, or General Managers can issue Purchase Orders.',
        ], 403));
    }

    /**
     * List purchase orders with summary metrics.
     */
    public function index(Request $request): JsonResponse
    {
        $hotel = $this->getHotel($request);

        $query = $hotel->purchaseOrders()
            ->with(['supplier', 'items'])
            ->latest();

        if ($request->filled('status') && $request->query('status') !== 'ALL') {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('supplier_id') && $request->query('supplier_id') !== 'ALL') {
            $query->where('supplier_id', $request->query('supplier_id'));
        }

        $orders = $query->paginate(25);

        // Procurement Metrics
        $totalPos = $hotel->purchaseOrders()->count();
        $totalValue = (float) $hotel->purchaseOrders()->where('status', '!=', 'CANCELLED')->sum('grand_total');
        $issuedCount = $hotel->purchaseOrders()->where('status', 'ISSUED')->count();
        $completedCount = $hotel->purchaseOrders()->where('status', 'COMPLETED')->count();

        return response()->json([
            'success' => true,
            'summary' => [
                'total_pos' => $totalPos,
                'total_procurement_value' => $totalValue,
                'pending_deliveries' => $issuedCount,
                'completed_pos' => $completedCount,
            ],
            'orders' => $orders,
        ]);
    }

    /**
     * View detailed purchase order.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $hotel = $this->getHotel($request);

        $order = $hotel->purchaseOrders()
            ->with(['supplier', 'items.product', 'goodsReceiptNotes.items'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'order' => $order,
        ]);
    }

    /**
     * Create and issue a new purchase order.
     */
    public function store(Request $request): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $this->authorizeProcurementAction($request);

        $validated = $request->validate([
            'supplier_id' => 'required|uuid|exists:suppliers,id',
            'expected_delivery_date' => 'nullable|date',
            'payment_terms' => 'nullable|string|max:100',
            'notes' => 'nullable|string|max:500',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|uuid|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        return DB::transaction(function () use ($hotel, $validated) {
            $supplier = $hotel->suppliers()->findOrFail($validated['supplier_id']);

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
                'expected_delivery_date' => $validated['expected_delivery_date'] ?? Carbon::now()->addDays(3)->toDateString(),
                'payment_terms' => $validated['payment_terms'] ?? 'Net 30 Days',
                'notes' => $validated['notes'] ?? null,
                'issued_at' => Carbon::now(),
            ]);

            $subtotal = 0;
            $taxAmount = 0;

            foreach ($validated['items'] as $itemData) {
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

            return response()->json([
                'success' => true,
                'message' => "Purchase Order #{$order->po_number} issued to {$supplier->firm_name}.",
                'order' => $order->load(['supplier', 'items']),
            ], 201);
        });
    }

    /**
     * Receive Delivery & Generate Goods Receipt Note (GRN)
     * Automatically increments product stock in store inventory!
     */
    public function receiveGoods(Request $request, string $id): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $order = $hotel->purchaseOrders()->with('items')->findOrFail($id);

        if ($order->status === PurchaseOrder::STATUS_COMPLETED || $order->status === PurchaseOrder::STATUS_CANCELLED) {
            return response()->json([
                'success' => false,
                'message' => "Cannot receive delivery on a {$order->status} Purchase Order.",
            ], 422);
        }

        $validated = $request->validate([
            'delivery_challan_no' => 'nullable|string|max:100',
            'invoice_no' => 'nullable|string|max:100',
            'received_date' => 'required|date',
            'remarks' => 'nullable|string|max:500',
            'items' => 'required|array|min:1',
            'items.*.purchase_order_item_id' => 'required|uuid',
            'items.*.quantity_received' => 'required|numeric|min:0.01',
        ]);

        return DB::transaction(function () use ($hotel, $order, $validated) {
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
                'delivery_challan_no' => $validated['delivery_challan_no'] ?? null,
                'invoice_no' => $validated['invoice_no'] ?? null,
                'received_date' => $validated['received_date'],
                'remarks' => $validated['remarks'] ?? null,
            ]);

            $grnTotal = 0;

            foreach ($validated['items'] as $itemData) {
                $poItem = $order->items()->findOrFail($itemData['purchase_order_item_id']);
                $qtyReceived = (float) $itemData['quantity_received'];

                $remainingQty = max(0, (float) $poItem->quantity_ordered - (float) $poItem->quantity_received);
                if ($qtyReceived > $remainingQty) {
                    return response()->json([
                        'success' => false,
                        'message' => "Cannot receive {$qtyReceived} {$poItem->unit} for item '{$poItem->product_name}'. Remaining pending quantity on PO is only {$remainingQty} {$poItem->unit}.",
                    ], 422);
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

                // AUTOMATICALLY INCREMENT PRODUCT CURRENT STOCK IN STORE INVENTORY
                $product = Product::find($poItem->product_id);
                if ($product) {
                    $product->increment('current_stock', $qtyReceived);
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

            return response()->json([
                'success' => true,
                'message' => "GRN #{$grn->grn_number} generated. Store inventory stock updated successfully.",
                'grn' => $grn->load('items'),
                'order' => $order->fresh(['items']),
            ], 201);
        });
    }

    /**
     * List all Goods Receipt Notes (GRN).
     */
    public function grnList(Request $request): JsonResponse
    {
        $hotel = $this->getHotel($request);

        $grns = $hotel->goodsReceiptNotes()
            ->with(['supplier', 'purchaseOrder', 'items'])
            ->latest()
            ->paginate(25);

        return response()->json([
            'success' => true,
            'grns' => $grns,
        ]);
    }
}

