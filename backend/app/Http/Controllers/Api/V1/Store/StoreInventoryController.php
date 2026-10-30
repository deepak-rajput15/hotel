<?php

namespace App\Http\Controllers\Api\V1\Store;

use App\Domain\Store\Contracts\StoreInventoryServiceInterface;
use App\Domain\Store\Models\Product;
use App\Domain\Tenancy\Models\Hotel;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Store\AdjustStockRequest;
use App\Http\Requests\Api\V1\Store\StoreProductRequest;
use App\Http\Requests\Api\V1\Store\StoreSupplierRequest;
use App\Http\Requests\Api\V1\Store\UpdateProductRequest;
use App\Http\Requests\Api\V1\Store\UpdateStockBatchRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StoreInventoryController extends Controller
{
    public function __construct(
        protected StoreInventoryServiceInterface $storeService
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
     * Authorize that the user has permission to manage inventory and adjust stock.
     */
    protected function authorizeInventoryManagement(Request $request): void
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

        $allowedRoles = ['storekeeper', 'store-manager', 'purchase-manager', 'general-manager', 'hotel-owner'];
        if (in_array($userRole, $allowedRoles, true)) {
            return;
        }

        abort(response()->json([
            'success' => false,
            'error_code' => 'FORBIDDEN_INVENTORY_ACTION',
            'message' => 'Access Denied: Only Storekeepers, Purchase Managers, or General Managers can adjust stock or modify products.',
        ], 403));
    }

    /**
     * List products with inventory metrics, filtering by category, search, and low-stock alerts.
     */
    public function products(Request $request): JsonResponse
    {
        $hotel = $this->getHotel($request);

        $query = $hotel->products()->with('supplier')->latest();

        if ($request->filled('category') && $request->query('category') !== 'ALL') {
            $query->where('category', $request->query('category'));
        }

        if ($request->filled('status') && $request->query('status') !== 'ALL') {
            $query->where('status', $request->query('status'));
        }

        if ($request->boolean('low_stock')) {
            $query->whereColumn('current_stock', '<=', 'minimum_stock_qty');
        }

        if ($request->filled('search')) {
            $term = '%' . $request->query('search') . '%';
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', $term)
                  ->orWhere('product_code', 'like', $term)
                  ->orWhere('description', 'like', $term);
            });
        }

        $totalProducts = $hotel->products()->count();
        $lowStockCount = $hotel->products()->whereColumn('current_stock', '<=', 'minimum_stock_qty')->count();
        $totalStockValue = $hotel->products()->select(DB::raw('SUM(current_stock * rate) as val'))->value('val') ?? 0;
        $activeSuppliersCount = $hotel->suppliers()->where('status', 'Active')->count();

        $allProducts = $hotel->products()->get();
        $expiredCount = 0;
        $expiringSoonCount = 0;

        foreach ($allProducts as $p) {
            $details = $p->computeExpiryDetails();
            if ($details['status'] === 'EXPIRED') {
                $expiredCount++;
            } elseif ($details['status'] === 'EXPIRING_SOON') {
                $expiringSoonCount++;
            }
        }

        $products = $query->get()->map(function ($product) {
            $details = $product->computeExpiryDetails();
            $product->expiry_status = $details['status'];
            $product->days_until_expiry = $details['days_remaining'];
            $product->has_expired_batch = $details['has_expired_batch'];
            $product->has_expiring_soon_batch = $details['has_expiring_soon_batch'];
            $product->oldest_expiring_batch = $details['oldest_expiring_batch'];
            $product->active_batches = $details['batches'];
            return $product;
        });

        if ($request->filled('expiry_status') && $request->query('expiry_status') !== 'ALL') {
            $target = $request->query('expiry_status');
            $products = $products->filter(function ($p) use ($target) {
                return $p->expiry_status === $target;
            })->values();
        }

        return response()->json([
            'success' => true,
            'hotel' => [
                'id' => $hotel->id,
                'hotel_code' => $hotel->hotel_code,
                'name' => $hotel->name,
            ],
            'metrics' => [
                'total_products' => $totalProducts,
                'low_stock_count' => $lowStockCount,
                'expired_count' => $expiredCount,
                'expiring_soon_count' => $expiringSoonCount,
                'total_stock_value' => round((float) $totalStockValue, 2),
                'active_suppliers' => $activeSuppliersCount,
                'categories' => Product::CATEGORIES,
            ],
            'categories' => Product::CATEGORIES,
            'products' => $products,
        ]);
    }

    /**
     * Create a new inventory product.
     */
    public function storeProduct(StoreProductRequest $request): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $product = $this->storeService->createProduct($hotel, $request->validated());

        return response()->json([
            'success' => true,
            'message' => "Product '{$product->name}' ({$product->product_code}) created successfully.",
            'product' => $product,
        ], 201);
    }

    /**
     * Update an existing product.
     */
    public function updateProduct(UpdateProductRequest $request, string $id): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $product = $hotel->products()->findOrFail($id);
        $product = $this->storeService->updateProduct($product, $request->validated());

        return response()->json([
            'success' => true,
            'message' => "Product '{$product->name}' updated successfully.",
            'product' => $product,
        ]);
    }

    /**
     * Update an individual stock batch.
     */
    public function updateBatch(UpdateStockBatchRequest $request, string $productId, string $batchNo): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $this->authorizeInventoryManagement($request);

        $product = $hotel->products()->findOrFail($productId);
        $product = $this->storeService->updateBatch($product, $batchNo, $request->validated());

        return response()->json([
            'success' => true,
            'message' => "Batch '{$batchNo}' expiry updated to '{$request->validated('expiry_period')}'.",
            'product' => $product,
        ]);
    }

    /**
     * Adjust product stock level.
     */
    public function adjustStock(AdjustStockRequest $request, string $id): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $this->authorizeInventoryManagement($request);

        $result = $this->storeService->adjustStock($hotel, $id, $request->validated(), $request->user());
        $product = $result['product'];
        $adjustment = $result['adjustment'];

        return response()->json([
            'success' => true,
            'message' => "Stock adjusted for '{$product->name}'. Previous: {$adjustment['old_stock']} {$product->unit}, Current: {$adjustment['new_stock']} {$product->unit}.",
            'product' => $product,
            'adjustment' => $adjustment,
        ]);
    }

    /**
     * List suppliers for the hotel property.
     */
    public function suppliers(Request $request): JsonResponse
    {
        $hotel = $this->getHotel($request);

        $suppliers = $hotel->suppliers()
            ->withCount('products')
            ->orderBy('firm_name', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'suppliers' => $suppliers,
        ]);
    }

    /**
     * Create a new supplier.
     */
    public function storeSupplier(StoreSupplierRequest $request): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $supplier = $this->storeService->createSupplier($hotel, $request->validated());

        return response()->json([
            'success' => true,
            'message' => "Supplier '{$supplier->firm_name}' created successfully.",
            'supplier' => $supplier,
        ], 201);
    }
}
