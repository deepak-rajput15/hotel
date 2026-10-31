<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\Subscriptions\Models\SubscriptionPackage;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SuperAdminPackageController extends Controller
{
    /**
     * List all SaaS subscription packages created by company.
     */
    public function index(Request $request): JsonResponse
    {
        $query = SubscriptionPackage::query()
            ->withCount(['hotelSubscriptions as active_hotels_count' => function ($q) {
                $q->where('status', 'ACTIVE');
            }]);

        if ($request->has('active_only') && filter_var($request->active_only, FILTER_VALIDATE_BOOLEAN)) {
            $query->where('is_active', true);
        }

        $packages = $query->orderBy('sort_order', 'asc')->orderBy('created_at', 'asc')->get();

        return response()->json([
            'success' => true,
            'data' => $packages,
        ]);
    }

    /**
     * Create a new SaaS package/plan.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'slug' => 'nullable|string|max:150|unique:subscription_packages,slug',
            'description' => 'nullable|string',
            'monthly_price' => 'required|numeric|min:0',
            'yearly_price' => 'required|numeric|min:0',
            'onetime_price' => 'nullable|numeric|min:0',
            'setup_fee' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|max:10',
            'billing_cycle' => 'nullable|string|in:ALL,MONTHLY,YEARLY,ONETIME',
            'max_rooms' => 'nullable|integer|min:1',
            'max_staff_accounts' => 'nullable|integer|min:1',
            'max_pos_terminals' => 'nullable|integer|min:1',
            'included_modules' => 'required|array',
            'features_list' => 'nullable|array',
            'is_featured' => 'nullable|boolean',
            'badge_text' => 'nullable|string|max:50',
            'is_active' => 'nullable|boolean',
            'sort_order' => 'nullable|integer',
        ]);

        if (empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['name']) . '-' . Str::random(4);
        }

        $package = SubscriptionPackage::create($validated);

        return response()->json([
            'success' => true,
            'message' => "Package '{$package->name}' created successfully.",
            'package' => $package,
        ], 201);
    }

    /**
     * View details of a specific package.
     */
    public function show(string $id): JsonResponse
    {
        $package = SubscriptionPackage::with(['hotelSubscriptions.hotel:id,hotel_code,name'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $package,
        ]);
    }

    /**
     * Update an existing package.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $package = SubscriptionPackage::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:150',
            'slug' => 'sometimes|nullable|string|max:150|unique:subscription_packages,slug,' . $package->id,
            'description' => 'nullable|string',
            'monthly_price' => 'sometimes|required|numeric|min:0',
            'yearly_price' => 'sometimes|required|numeric|min:0',
            'onetime_price' => 'nullable|numeric|min:0',
            'setup_fee' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|max:10',
            'billing_cycle' => 'nullable|string|in:ALL,MONTHLY,YEARLY,ONETIME',
            'max_rooms' => 'nullable|integer|min:1',
            'max_staff_accounts' => 'nullable|integer|min:1',
            'max_pos_terminals' => 'nullable|integer|min:1',
            'included_modules' => 'sometimes|required|array',
            'features_list' => 'nullable|array',
            'is_featured' => 'nullable|boolean',
            'badge_text' => 'nullable|string|max:50',
            'is_active' => 'nullable|boolean',
            'sort_order' => 'nullable|integer',
        ]);

        $package->update($validated);

        return response()->json([
            'success' => true,
            'message' => "Package '{$package->name}' updated successfully.",
            'package' => $package,
        ]);
    }

    /**
     * Delete or deactivate a package.
     */
    public function destroy(string $id): JsonResponse
    {
        $package = SubscriptionPackage::findOrFail($id);
        $package->delete();

        return response()->json([
            'success' => true,
            'message' => "Package '{$package->name}' deleted.",
        ]);
    }
}
