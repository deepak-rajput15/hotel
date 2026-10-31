<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\Subscriptions\Actions\AssignHotelPackageAction;
use App\Domain\Subscriptions\Models\HotelModuleSubscription;
use App\Domain\Subscriptions\Models\HotelSubscription;
use App\Domain\Subscriptions\Models\SubscriptionPackage;
use App\Domain\Tenancy\Models\Hotel;
use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class SuperAdminHotelSubscriptionController extends Controller
{
    public function __construct(
        protected AssignHotelPackageAction $assignPackageAction
    ) {}

    /**
     * List all hotel subscriptions & contracts across the platform with executive sales KPI metrics.
     */
    public function index(Request $request): JsonResponse
    {
        $query = HotelSubscription::with([
            'hotel:id,hotel_code,name,city,organization_id',
            'hotel.organization:id,org_code,name',
            'package:id,name,slug,included_modules,monthly_price,yearly_price,onetime_price',
            'assignedByUser:id,name,email',
        ]);

        if ($request->has('hotel_id')) {
            $query->where('hotel_id', $request->query('hotel_id'));
        }

        if ($request->has('status') && $request->query('status') !== 'ALL') {
            $query->where('status', $request->query('status'));
        }

        if ($request->has('billing_cycle') && $request->query('billing_cycle') !== 'ALL') {
            $query->where('billing_cycle', $request->query('billing_cycle'));
        }

        $allSubscriptions = (clone $query)->get();

        // 1. Calculate SaaS Sales Executive KPIs
        $activeContracts = $allSubscriptions->where('status', 'ACTIVE');
        $mrr = 0.0;
        $arr = 0.0;
        $expiringSoon = 0;

        foreach ($activeContracts as $sub) {
            $price = (float) $sub->agreed_price;
            if ($sub->billing_cycle === 'MONTHLY') {
                $mrr += $price;
                $arr += ($price * 12);
            } elseif ($sub->billing_cycle === 'YEARLY') {
                $mrr += ($price / 12);
                $arr += $price;
            }

            if ($sub->isExpiringSoon(15)) {
                $expiringSoon++;
            }
        }

        $subscriptions = $query->orderBy('created_at', 'desc')->paginate($request->input('per_page', 25));

        return response()->json([
            'success' => true,
            'kpis' => [
                'total_contracts' => $allSubscriptions->count(),
                'active_subscriptions' => $activeContracts->count(),
                'mrr' => round($mrr, 2),
                'arr' => round($arr, 2),
                'expiring_soon_count' => $expiringSoon,
            ],
            'data' => $subscriptions,
        ]);
    }

    /**
     * Assign / Subscribe a Hotel Property to a SaaS Package (Sales Deal Agreement).
     */
    public function assignPackage(Request $request, string $hotelId): JsonResponse
    {
        $hotel = Hotel::findOrFail($hotelId);

        $validated = $request->validate([
            'package_id' => 'required|uuid|exists:subscription_packages,id',
            'billing_cycle' => 'required|string|in:MONTHLY,YEARLY,ONETIME,TRIAL',
            'agreed_price' => 'nullable|numeric|min:0',
            'payment_status' => 'nullable|string|in:PAID,PENDING,PARTIAL,WAIVED',
            'payment_method' => 'nullable|string|in:UPI_QR,BANK_TRANSFER,CHEQUE,CASH,CREDIT_CARD,COMPLIMENTARY',
            'payment_reference' => 'nullable|string|max:150',
            'sales_notes' => 'nullable|string',
            'expires_at' => 'nullable|date',
        ]);

        $package = SubscriptionPackage::findOrFail($validated['package_id']);

        $subscription = $this->assignPackageAction->execute(
            $hotel,
            $package,
            $validated,
            $request->user()
        );

        return response()->json([
            'success' => true,
            'message' => "Package '{$package->name}' ({$subscription->billing_cycle}) successfully assigned to hotel '{$hotel->name}' ({$hotel->hotel_code}).",
            'subscription' => $subscription,
        ], 201);
    }

    /**
     * Extend validity of an existing hotel subscription contract.
     */
    public function extendValidity(Request $request, string $subscriptionId): JsonResponse
    {
        $subscription = HotelSubscription::with(['hotel', 'package'])->findOrFail($subscriptionId);

        $validated = $request->validate([
            'months_to_add' => 'nullable|integer|min:1|max:60',
            'new_expires_at' => 'nullable|date',
            'payment_status' => 'nullable|string|in:PAID,PENDING,PARTIAL,WAIVED',
            'payment_reference' => 'nullable|string|max:150',
            'sales_notes' => 'nullable|string',
        ]);

        $currentExpiry = $subscription->expires_at ?? now();
        $baseDate = $currentExpiry->isFuture() ? $currentExpiry : now();

        if (!empty($validated['new_expires_at'])) {
            $newExpiry = Carbon::parse($validated['new_expires_at']);
        } elseif (!empty($validated['months_to_add'])) {
            $newExpiry = (clone $baseDate)->addMonths((int) $validated['months_to_add']);
        } else {
            $newExpiry = (clone $baseDate)->addMonth();
        }

        $subscription->update([
            'expires_at' => $newExpiry,
            'status' => 'ACTIVE',
            'payment_status' => $validated['payment_status'] ?? $subscription->payment_status,
            'payment_reference' => $validated['payment_reference'] ?? $subscription->payment_reference,
            'sales_notes' => $validated['sales_notes']
                ? $subscription->sales_notes . "\n[" . now()->toDateString() . "] Extension: " . $validated['sales_notes']
                : $subscription->sales_notes,
        ]);

        // Sync module expiry
        HotelModuleSubscription::where('hotel_id', $subscription->hotel_id)
            ->where('status', 'ACTIVE')
            ->update(['expires_at' => $newExpiry]);

        Cache::forget("hotel_{$subscription->hotel_id}_active_modules");

        return response()->json([
            'success' => true,
            'message' => "Subscription for hotel '{$subscription->hotel->name}' extended successfully until {$newExpiry->toDateString()}.",
            'subscription' => $subscription->fresh(['hotel', 'package']),
        ]);
    }

    /**
     * Cancel / Suspend an active hotel subscription.
     */
    public function cancel(Request $request, string $subscriptionId): JsonResponse
    {
        $subscription = HotelSubscription::with('hotel')->findOrFail($subscriptionId);

        $subscription->update([
            'status' => 'CANCELLED',
        ]);

        // Deactivate all module subscriptions for this hotel
        HotelModuleSubscription::where('hotel_id', $subscription->hotel_id)
            ->update([
                'status' => 'INACTIVE',
                'expires_at' => now(),
            ]);

        Cache::forget("hotel_{$subscription->hotel_id}_active_modules");

        return response()->json([
            'success' => true,
            'message' => "Subscription for hotel '{$subscription->hotel->name}' has been cancelled and modules deactivated.",
        ]);
    }
}
