<?php

namespace App\Http\Controllers\Api\V1\Store;

use App\Domain\Purchase\Models\Supplier;
use App\Domain\Store\Models\Product;
use App\Domain\Tenancy\Models\Hotel;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class StoreInventoryController extends Controller
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

        // Filter by category
        if ($request->filled('category') && $request->query('category') !== 'ALL') {
            $query->where('category', $request->query('category'));
        }

        // Filter by status (Active, Inactive)
        if ($request->filled('status') && $request->query('status') !== 'ALL') {
            $query->where('status', $request->query('status'));
        }

        // Filter by low stock flag
        if ($request->boolean('low_stock')) {
            $query->whereColumn('current_stock', '<=', 'minimum_stock_qty');
        }

        // Search by name or code
        if ($request->filled('search')) {
            $term = '%' . $request->query('search') . '%';
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', $term)
                  ->orWhere('product_code', 'like', $term)
                  ->orWhere('description', 'like', $term);
            });
        }

        // Calculate summary metrics across the hotel inventory
        $totalProducts = $hotel->products()->count();
        $lowStockCount = $hotel->products()->whereColumn('current_stock', '<=', 'minimum_stock_qty')->count();
        $totalStockValue = $hotel->products()->select(DB::raw('SUM(current_stock * rate) as val'))->value('val') ?? 0;
        $activeSuppliersCount = $hotel->suppliers()->where('status', 'Active')->count();

        // Compute expiry status for all products for metrics
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

        // Filter by expiry status if requested
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
     * Create a new inventory product from Book1.xlsx specification.
     */
    public function storeProduct(Request $request): JsonResponse
    {
        $hotel = $this->getHotel($request);

        $validated = $request->validate([
            'category' => 'required|string|max:100',
            'name' => 'required|string|max:150',
            'product_code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('products', 'product_code')->where('hotel_id', $hotel->id),
            ],
            'description' => 'nullable|string',
            'unit' => 'required|string|max:30',
            'expiry_period' => 'nullable|string|max:20', // MM/yyyy
            'rate' => 'required|numeric|min:0',
            'gst_percentage' => 'nullable|numeric|min:0|max:100',
            'opening_stock' => 'required|numeric|min:0',
            'minimum_stock_qty' => 'nullable|numeric|min:0',
            'status' => 'nullable|string|in:Active,Inactive',
            'supplier_id' => [
                'nullable',
                'uuid',
                Rule::exists('suppliers', 'id')->where('hotel_id', $hotel->id),
            ],
        ]);

        $initialBatches = [];
        if ((float) $validated['opening_stock'] > 0) {
            $initialBatches[] = [
                'batch_no' => 'BAT-' . strtoupper(substr(uniqid(), -5)),
                'quantity' => (float) $validated['opening_stock'],
                'unit' => $validated['unit'],
                'expiry_period' => $validated['expiry_period'] ?? null,
                'received_at' => now()->toIso8601String(),
                'notes' => 'Opening Stock',
            ];
        }

        $product = $hotel->products()->create([
            'supplier_id' => $validated['supplier_id'] ?? null,
            'category' => $validated['category'],
            'name' => $validated['name'],
            'product_code' => $validated['product_code'],
            'description' => $validated['description'] ?? null,
            'unit' => $validated['unit'],
            'expiry_period' => $validated['expiry_period'] ?? null,
            'rate' => $validated['rate'],
            'gst_percentage' => $validated['gst_percentage'] ?? 0.00,
            'opening_stock' => $validated['opening_stock'],
            'current_stock' => $validated['opening_stock'],
            'minimum_stock_qty' => $validated['minimum_stock_qty'] ?? 0.00,
            'batches' => $initialBatches,
            'status' => $validated['status'] ?? 'Active',
        ]);

        $product->load('supplier');

        return response()->json([
            'success' => true,
            'message' => "Product '{$product->name}' ({$product->product_code}) created successfully.",
            'product' => $product,
        ], 201);
    }

    /**
     * Update an existing product.
     */
    public function updateProduct(Request $request, string $id): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $product = $hotel->products()->findOrFail($id);

        $validated = $request->validate([
            'category' => 'sometimes|required|string|max:100',
            'name' => 'sometimes|required|string|max:150',
            'product_code' => [
                'sometimes',
                'required',
                'string',
                'max:50',
                Rule::unique('products', 'product_code')->where('hotel_id', $hotel->id)->ignore($product->id),
            ],
            'description' => 'nullable|string',
            'unit' => 'sometimes|required|string|max:30',
            'expiry_period' => 'nullable|string|max:20',
            'rate' => 'sometimes|required|numeric|min:0',
            'gst_percentage' => 'nullable|numeric|min:0|max:100',
            'minimum_stock_qty' => 'nullable|numeric|min:0',
            'status' => 'nullable|string|in:Active,Inactive',
            'supplier_id' => [
                'nullable',
                'uuid',
                Rule::exists('suppliers', 'id')->where('hotel_id', $hotel->id),
            ],
        ]);

        $oldExpiry = $product->expiry_period;
        $product->update($validated);

        // If expiry_period changed, synchronize existing batches that belonged to the initial/existing stock
        if (isset($validated['expiry_period']) && $validated['expiry_period'] !== $oldExpiry) {
            $batches = is_array($product->batches) ? $product->batches : [];
            $newExpiry = $validated['expiry_period'];
            $modified = false;

            foreach ($batches as &$b) {
                if (($b['expiry_period'] ?? '') === $oldExpiry || ($b['notes'] ?? '') === 'Existing Stock' || ($b['notes'] ?? '') === 'Initial Stock' || ($b['notes'] ?? '') === 'Opening Stock') {
                    $b['expiry_period'] = $newExpiry;
                    $modified = true;
                }
            }
            unset($b);

            if ($modified) {
                $product->batches = $batches;
                $product->save();
            }
        }

        $product->load('supplier');

        $expiryDetails = $product->computeExpiryDetails();
        $product->expiry_status = $expiryDetails['status'];
        $product->days_until_expiry = $expiryDetails['days_remaining'];
        $product->has_expired_batch = $expiryDetails['has_expired_batch'];
        $product->has_expiring_soon_batch = $expiryDetails['has_expiring_soon_batch'];
        $product->oldest_expiring_batch = $expiryDetails['oldest_expiring_batch'];
        $product->active_batches = $expiryDetails['batches'];

        return response()->json([
            'success' => true,
            'message' => "Product '{$product->name}' updated successfully.",
            'product' => $product,
        ]);
    }

    /**
     * Update an individual stock batch (e.g. correct expiry date or notes).
     */
    public function updateBatch(Request $request, string $productId, string $batchNo): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $this->authorizeInventoryManagement($request);

        $validated = $request->validate([
            'expiry_period' => 'required|string|max:20',
            'notes' => 'nullable|string|max:255',
        ]);

        $product = $hotel->products()->findOrFail($productId);
        $batches = is_array($product->batches) ? $product->batches : [];
        $found = false;

        foreach ($batches as &$b) {
            if (($b['batch_no'] ?? '') === $batchNo) {
                $b['expiry_period'] = $validated['expiry_period'];
                if ($request->has('notes')) {
                    $b['notes'] = $validated['notes'];
                }
                $found = true;
                break;
            }
        }
        unset($b);

        if (!$found) {
            return response()->json([
                'success' => false,
                'message' => "Batch '{$batchNo}' not found on product '{$product->name}'.",
            ], 404);
        }

        // Keep product expiry_period in sync with earliest active batch
        $earliestExpiry = $validated['expiry_period'];
        $earliestTimestamp = null;
        foreach ($batches as $b) {
            $p = $b['expiry_period'] ?? null;
            $d = Product::parseExpiryDate($p);
            if ($d && ($earliestTimestamp === null || $d->timestamp < $earliestTimestamp)) {
                $earliestTimestamp = $d->timestamp;
                $earliestExpiry = $p;
            }
        }
        if ($earliestExpiry) {
            $product->expiry_period = $earliestExpiry;
        }

        $product->batches = $batches;
        $product->save();

        $expiryDetails = $product->computeExpiryDetails();
        $product->expiry_status = $expiryDetails['status'];
        $product->days_until_expiry = $expiryDetails['days_remaining'];
        $product->has_expired_batch = $expiryDetails['has_expired_batch'];
        $product->has_expiring_soon_batch = $expiryDetails['has_expiring_soon_batch'];
        $product->oldest_expiring_batch = $expiryDetails['oldest_expiring_batch'];
        $product->active_batches = $expiryDetails['batches'];

        return response()->json([
            'success' => true,
            'message' => "Batch '{$batchNo}' expiry updated to '{$validated['expiry_period']}'.",
            'product' => $product,
        ]);
    }

    /**
     * Adjust product stock level (e.g. GRN received, Kitchen consumption, Spoilage, Audit).
     */
    public function adjustStock(Request $request, string $id): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $this->authorizeInventoryManagement($request);

        if (!$request->has('type') && $request->has('operation')) {
            $request->merge(['type' => $request->input('operation')]);
        }

        $validated = $request->validate([
            'type' => 'required|in:ADD,SUBTRACT,SET',
            'quantity' => 'required|numeric|min:0.01',
            'reason' => 'required|string|max:150', // e.g. 'Vendor Delivery GRN', 'Kitchen Requisition', 'Spoilage/Waste', 'Physical Audit'
            'notes' => 'nullable|string|max:255',
            'batch_no' => 'nullable|string|max:50',
            'expiry_period' => 'nullable|string|max:20',
        ]);

        return DB::transaction(function () use ($hotel, $id, $validated) {
            $product = $hotel->products()->where('id', $id)->lockForUpdate()->firstOrFail();

            $oldStock = (float) $product->current_stock;
            $qty = (float) $validated['quantity'];
            $batches = is_array($product->batches) ? $product->batches : [];

            if ($validated['type'] === 'ADD') {
                $newStock = $oldStock + $qty;

                // If batches was empty but we had stock, seed existing stock batch
                if (empty($batches) && $oldStock > 0) {
                    $batches[] = [
                        'batch_no' => 'BAT-PREV-01',
                        'quantity' => $oldStock,
                        'unit' => $product->unit,
                        'expiry_period' => $product->expiry_period,
                        'received_at' => $product->created_at?->toIso8601String(),
                        'notes' => 'Existing Stock',
                    ];
                }

                $batchNo = !empty($validated['batch_no']) ? $validated['batch_no'] : ('BAT-' . strtoupper(substr(uniqid(), -6)));
                $batchExpiry = !empty($validated['expiry_period']) ? $validated['expiry_period'] : $product->expiry_period;

                $batches[] = [
                    'batch_no' => $batchNo,
                    'quantity' => $qty,
                    'unit' => $product->unit,
                    'expiry_period' => $batchExpiry,
                    'received_at' => now()->toIso8601String(),
                    'notes' => $validated['notes'] ?? $validated['reason'],
                ];
            } elseif ($validated['type'] === 'SUBTRACT') {
                if ($oldStock < $qty) {
                    return response()->json([
                        'success' => false,
                        'message' => "Cannot subtract {$qty} {$product->unit}. Current stock is only {$oldStock} {$product->unit}.",
                    ], 422);
                }
                $newStock = $oldStock - $qty;

                // If specific batch requested
                if (!empty($validated['batch_no'])) {
                    foreach ($batches as &$b) {
                        if (($b['batch_no'] ?? '') === $validated['batch_no']) {
                            $bQty = (float) ($b['quantity'] ?? 0);
                            $b['quantity'] = max(0, round($bQty - $qty, 2));
                            break;
                        }
                    }
                    unset($b);
                } else {
                    // FEFO deduction: First Expired, First Out
                    usort($batches, function ($a, $b) {
                        $tA = Product::parseExpiryDate($a['expiry_period'] ?? null)?->timestamp ?? 9999999999;
                        $tB = Product::parseExpiryDate($b['expiry_period'] ?? null)?->timestamp ?? 9999999999;
                        return $tA <=> $tB;
                    });

                    $rem = $qty;
                    foreach ($batches as &$b) {
                        if ($rem <= 0) break;
                        $bQty = (float) ($b['quantity'] ?? 0);
                        if ($bQty <= 0) continue;
                        if ($bQty <= $rem) {
                            $rem -= $bQty;
                            $b['quantity'] = 0;
                        } else {
                            $b['quantity'] = round($bQty - $rem, 2);
                            $rem = 0;
                        }
                    }
                    unset($b);
                }

                // Filter out 0 qty batches
                $batches = array_values(array_filter($batches, fn($b) => (float)($b['quantity'] ?? 0) > 0));
            } else {
                $newStock = $qty;
                $batchNo = !empty($validated['batch_no']) ? $validated['batch_no'] : ('BAT-AUDIT-' . strtoupper(substr(uniqid(), -4)));
                $batches = [
                    [
                        'batch_no' => $batchNo,
                        'quantity' => $newStock,
                        'unit' => $product->unit,
                        'expiry_period' => !empty($validated['expiry_period']) ? $validated['expiry_period'] : $product->expiry_period,
                        'received_at' => now()->toIso8601String(),
                        'notes' => 'Physical Stock Audit / Reset',
                    ]
                ];
            }

            $product->current_stock = $newStock;
            $product->batches = $batches;
            $product->save();

            $expiryDetails = $product->computeExpiryDetails();
            $product->expiry_status = $expiryDetails['status'];
            $product->days_until_expiry = $expiryDetails['days_remaining'];
            $product->has_expired_batch = $expiryDetails['has_expired_batch'];
            $product->has_expiring_soon_batch = $expiryDetails['has_expiring_soon_batch'];
            $product->oldest_expiring_batch = $expiryDetails['oldest_expiring_batch'];
            $product->active_batches = $expiryDetails['batches'];

            return response()->json([
                'success' => true,
                'message' => "Stock adjusted for '{$product->name}'. Previous: {$oldStock} {$product->unit}, Current: {$newStock} {$product->unit}.",
                'product' => $product,
                'adjustment' => [
                    'old_stock' => $oldStock,
                    'new_stock' => $newStock,
                    'type' => $validated['type'],
                    'quantity' => $qty,
                    'reason' => $validated['reason'],
                    'notes' => $validated['notes'] ?? null,
                ],
            ]);
        });
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
     * Create a new supplier from Book1.xlsx specification.
     */
    public function storeSupplier(Request $request): JsonResponse
    {
        $hotel = $this->getHotel($request);

        $validated = $request->validate([
            'firm_name' => 'required|string|max:150',
            'address' => 'nullable|string',
            'contact_person' => 'nullable|string|max:100',
            'mobile' => 'required|string|max:30',
            'email' => 'nullable|email|max:150',
            'gst_no' => 'nullable|string|max:30',
            'pan_no' => 'nullable|string|max:30',
            'aadhar_no' => 'nullable|string|max:30',
            'status' => 'nullable|string|in:Active,Inactive',
        ]);

        $supplier = $hotel->suppliers()->create([
            'firm_name' => $validated['firm_name'],
            'address' => $validated['address'] ?? null,
            'contact_person' => $validated['contact_person'] ?? null,
            'mobile' => $validated['mobile'],
            'email' => $validated['email'] ?? null,
            'gst_no' => $validated['gst_no'] ?? null,
            'pan_no' => $validated['pan_no'] ?? null,
            'aadhar_no' => $validated['aadhar_no'] ?? null,
            'status' => $validated['status'] ?? 'Active',
        ]);

        return response()->json([
            'success' => true,
            'message' => "Supplier '{$supplier->firm_name}' created successfully.",
            'supplier' => $supplier,
        ], 201);
    }
}
