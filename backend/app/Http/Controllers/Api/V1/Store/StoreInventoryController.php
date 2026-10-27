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

        $products = $query->get();

        // Calculate summary metrics across the hotel inventory
        $totalProducts = $hotel->products()->count();
        $lowStockCount = $hotel->products()->whereColumn('current_stock', '<=', 'minimum_stock_qty')->count();
        $totalStockValue = $hotel->products()->select(DB::raw('SUM(current_stock * rate) as val'))->value('val') ?? 0;
        $activeSuppliersCount = $hotel->suppliers()->where('status', 'Active')->count();

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

        $product->update($validated);
        $product->load('supplier');

        return response()->json([
            'success' => true,
            'message' => "Product '{$product->name}' updated successfully.",
            'product' => $product,
        ]);
    }

    /**
     * Adjust product stock level (e.g. GRN received, Kitchen consumption, Spoilage, Audit).
     */
    public function adjustStock(Request $request, string $id): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $product = $hotel->products()->findOrFail($id);

        if (!$request->has('type') && $request->has('operation')) {
            $request->merge(['type' => $request->input('operation')]);
        }

        $validated = $request->validate([
            'type' => 'required|in:ADD,SUBTRACT,SET',
            'quantity' => 'required|numeric|min:0.01',
            'reason' => 'required|string|max:150', // e.g. 'Vendor Delivery GRN', 'Kitchen Requisition', 'Spoilage/Waste', 'Physical Audit'
            'notes' => 'nullable|string|max:255',
        ]);

        $oldStock = (float) $product->current_stock;
        $qty = (float) $validated['quantity'];

        if ($validated['type'] === 'ADD') {
            $newStock = $oldStock + $qty;
        } elseif ($validated['type'] === 'SUBTRACT') {
            if ($oldStock < $qty) {
                return response()->json([
                    'success' => false,
                    'message' => "Cannot subtract {$qty} {$product->unit}. Current stock is only {$oldStock} {$product->unit}.",
                ], 422);
            }
            $newStock = $oldStock - $qty;
        } else {
            $newStock = $qty;
        }

        $product->current_stock = $newStock;
        $product->save();

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
