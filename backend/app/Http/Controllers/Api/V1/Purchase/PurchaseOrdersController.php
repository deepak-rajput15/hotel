<?php

namespace App\Http\Controllers\Api\V1\Purchase;

use App\Domain\Purchase\Contracts\PurchaseOrderServiceInterface;
use App\Domain\Purchase\Models\GoodsReceiptNote;
use App\Domain\Purchase\Models\PurchaseOrder;
use App\Domain\Tenancy\Models\Hotel;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Purchase\ReceiveGoodsGrnRequest;
use App\Http\Requests\Api\V1\Purchase\StorePurchaseOrderRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PurchaseOrdersController extends Controller
{
    public function __construct(
        protected PurchaseOrderServiceInterface $purchaseService
    ) {}

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
    public function store(StorePurchaseOrderRequest $request): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $this->authorizeProcurementAction($request);

        $order = $this->purchaseService->createPurchaseOrder($hotel, $request->validated(), $request->user());

        return response()->json([
            'success' => true,
            'message' => "Purchase Order #{$order->po_number} issued to {$order->supplier->firm_name}.",
            'order' => $order,
        ], 201);
    }

    /**
     * Receive Delivery & Generate Goods Receipt Note (GRN)
     */
    public function receiveGoods(ReceiveGoodsGrnRequest $request, string $id): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $order = $hotel->purchaseOrders()->with('items')->findOrFail($id);

        $result = $this->purchaseService->receiveGoods($order, $request->validated(), $request->user());

        return response()->json([
            'success' => true,
            'message' => "GRN #{$result['grn']->grn_number} generated. Store inventory stock updated successfully.",
            'grn' => $result['grn'],
            'order' => $result['order'],
        ], 201);
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
