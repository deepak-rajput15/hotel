<?php

namespace App\Http\Controllers\Api\V1\Reports;

use App\Domain\FrontOffice\Models\Booking;
use App\Domain\FrontOffice\Models\FolioItem;
use App\Domain\FrontOffice\Models\Payment;
use App\Domain\FrontOffice\Models\Room;
use App\Domain\Store\Models\Product;
use App\Domain\Tenancy\Models\Hotel;
use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportsController extends Controller
{
    /**
     * Resolve hotel IDs in scope (single hotel or consolidated portfolio).
     */
    protected function getHotelIds(Request $request): array
    {
        $hotel = $request->attributes->get('current_hotel');
        if ($hotel) {
            return [$hotel->id];
        }

        $user = $request->user();
        if ($user->isOrgOwner() && $user->organization) {
            return $user->organization->hotels()->pluck('id')->toArray();
        }

        return $user->hotels()->pluck('hotels.id')->toArray();
    }

    /**
     * Authorize that only Hotel Owner, Platform Super Admin, or General Manager can view financial reports.
     */
    protected function authorizeReportsAccess(Request $request): void
    {
        $user = $request->user();
        if ($user->isPlatformAdmin() || $user->isOrgOwner()) {
            return;
        }

        $hotel = $request->attributes->get('current_hotel');
        $hotelId = $hotel?->id ?? $request->header('X-Hotel-ID');

        $userRole = $user->hotelAccess()->where('hotel_id', $hotelId)->with('role')->first()?->role?->slug;
        if (in_array($userRole, ['general-manager', 'hotel-owner'], true)) {
            return;
        }

        abort(response()->json([
            'success' => false,
            'error_code' => 'FORBIDDEN_REPORTS_ACCESS',
            'message' => 'Access Denied: Only Hotel Owner and General Manager are authorized to view financial reports and guest ledgers.',
        ], 403));
    }

    /**
     * Resolve date range filter from query parameters.
     */
    protected function getDateRange(Request $request): array
    {
        $preset = $request->query('range', 'this_month');

        switch ($preset) {
            case 'today':
                $start = Carbon::today()->startOfDay();
                $end = Carbon::today()->endOfDay();
                break;
            case 'yesterday':
                $start = Carbon::yesterday()->startOfDay();
                $end = Carbon::yesterday()->endOfDay();
                break;
            case 'last_7_days':
                $start = Carbon::today()->subDays(6)->startOfDay();
                $end = Carbon::today()->endOfDay();
                break;
            case 'last_30_days':
                $start = Carbon::today()->subDays(29)->startOfDay();
                $end = Carbon::today()->endOfDay();
                break;
            case 'custom':
                $start = $request->filled('start_date')
                    ? Carbon::parse($request->query('start_date'))->startOfDay()
                    : Carbon::today()->subDays(29)->startOfDay();
                $end = $request->filled('end_date')
                    ? Carbon::parse($request->query('end_date'))->endOfDay()
                    : Carbon::today()->endOfDay();
                break;
            case 'this_month':
            default:
                $preset = 'this_month';
                $start = Carbon::now()->startOfMonth()->startOfDay();
                $end = Carbon::today()->endOfDay();
                break;
        }

        return [$start, $end, $preset];
    }

    /**
     * Comprehensive Executive Reporting Overview (KPIs, Charts, Breakdowns).
     */
    public function overview(Request $request): JsonResponse
    {
        $this->authorizeReportsAccess($request);

        $hotelIds = $this->getHotelIds($request);
        [$start, $end, $preset] = $this->getDateRange($request);
        $daysCount = max(1, $start->diffInDays($end) + 1);

        $hotel = $request->attributes->get('current_hotel');

        // 1. Bookings in range
        $bookingsQuery = Booking::whereIn('hotel_id', $hotelIds)
            ->where(function ($q) use ($start, $end) {
                $q->whereBetween('check_in_at', [$start, $end])
                  ->orWhereBetween('created_at', [$start, $end]);
            });

        $bookings = (clone $bookingsQuery)->get();

        $totalRevenue = (float) $bookings->sum('grand_total');
        $totalRoomCharges = (float) $bookings->sum('total_room_charges');
        $totalExtraCharges = (float) $bookings->sum('total_extra_charges');
        $totalTaxAmount = (float) $bookings->sum('tax_amount');
        $totalDiscounts = (float) $bookings->sum('discount_amount');

        // 2. Payments collected in range
        $paymentsQuery = Payment::whereHas('booking', function ($q) use ($hotelIds) {
            $q->whereIn('hotel_id', $hotelIds);
        })->whereBetween('created_at', [$start, $end]);

        $totalCollections = (float) (clone $paymentsQuery)->sum('amount');

        // Outstanding guest balances
        $outstandingBalances = (float) Booking::whereIn('hotel_id', $hotelIds)
            ->whereIn('status', ['CHECKED_IN', 'RESERVED'])
            ->where('balance_amount', '>', 0)
            ->sum('balance_amount');

        // 3. Room Inventory & Occupancy metrics
        $roomsQuery = Room::whereIn('hotel_id', $hotelIds);
        $totalRooms = (int) (clone $roomsQuery)->count();
        $occupiedRooms = (int) (clone $roomsQuery)->where('status', 'OCCUPIED')->count();
        $availableRooms = (int) (clone $roomsQuery)->where('status', 'AVAILABLE')->count();
        $dirtyRooms = (int) (clone $roomsQuery)->where('status', 'DIRTY')->count();
        $maintenanceRooms = (int) (clone $roomsQuery)->where('status', 'MAINTENANCE')->count();

        $currentOccupancyPct = $totalRooms > 0 ? round(($occupiedRooms / $totalRooms) * 100, 1) : 0;

        // Total room nights sold in range
        $totalNightsSold = (int) $bookings->sum('total_nights');
        $adr = $totalNightsSold > 0 ? round($totalRoomCharges / $totalNightsSold, 2) : 0;
        $totalAvailableRoomNights = $totalRooms * $daysCount;
        $revPar = $totalAvailableRoomNights > 0 ? round($totalRoomCharges / $totalAvailableRoomNights, 2) : 0;

        // 4. In-house guests and arrivals/departures in range
        $inHouseCount = (int) Booking::whereIn('hotel_id', $hotelIds)->where('status', 'CHECKED_IN')->count();
        $totalArrivals = (int) Booking::whereIn('hotel_id', $hotelIds)->whereBetween('check_in_at', [$start, $end])->count();
        $totalDepartures = (int) Booking::whereIn('hotel_id', $hotelIds)
            ->where(function ($q) use ($start, $end) {
                $q->whereBetween('check_out_at', [$start, $end])
                  ->orWhere(function ($sub) use ($start, $end) {
                      $sub->where('status', 'CHECKED_IN')
                          ->whereBetween('expected_check_out_at', [$start, $end]);
                  });
            })->count();

        // 5. Payment Tender Breakdown (Cash, UPI_QR, Card, Bank Transfer)
        $paymentMethodsRaw = (clone $paymentsQuery)
            ->select('payment_method', DB::raw('sum(amount) as total_amount'), DB::raw('count(*) as count'))
            ->groupBy('payment_method')
            ->get();

        $paymentLabels = [
            'UPI_QR' => 'UPI / QR Code',
            'CASH' => 'Cash at Desk',
            'CARD' => 'Credit / Debit Card',
            'BANK_TRANSFER' => 'Bank Transfer / NEFT',
        ];

        $paymentMethodBreakdown = $paymentMethodsRaw->map(function ($p) use ($totalCollections, $paymentLabels) {
            $amt = (float) $p->total_amount;
            return [
                'method' => $p->payment_method,
                'label' => $paymentLabels[$p->payment_method] ?? $p->payment_method,
                'amount' => $amt,
                'count' => (int) $p->count,
                'percentage' => $totalCollections > 0 ? round(($amt / $totalCollections) * 100, 1) : 0,
            ];
        });

        // 6. Folio Items Breakdown (Room, F&B, Laundry, Extra Bed, Misc)
        $folioItemsRaw = FolioItem::whereHas('booking', function ($q) use ($hotelIds) {
            $q->whereIn('hotel_id', $hotelIds);
        })->whereBetween('charged_at', [$start, $end])
          ->select('item_type', DB::raw('sum(total_price) as total_price'), DB::raw('count(*) as count'))
          ->groupBy('item_type')
          ->get();

        $folioLabels = [
            'ROOM_CHARGE' => 'Room Tariff Charges',
            'FOOD_BEVERAGE' => 'Food & Beverage / Restaurant',
            'LAUNDRY' => 'Laundry & Dry Cleaning',
            'EXTRA_BED' => 'Extra Bedding',
            'MISC' => 'Miscellaneous Services',
        ];

        $folioBreakdown = $folioItemsRaw->map(function ($f) use ($totalRevenue, $folioLabels) {
            $amt = (float) $f->total_price;
            return [
                'type' => $f->item_type,
                'label' => $folioLabels[$f->item_type] ?? $f->item_type,
                'amount' => $amt,
                'count' => (int) $f->count,
                'percentage' => $totalRevenue > 0 ? round(($amt / $totalRevenue) * 100, 1) : 0,
            ];
        });

        // 7. Daily Trend in date range (capped at 62 days to prevent CPU/memory exhaustion)
        $dailyTrends = [];
        if ($daysCount <= 62) {
            $period = CarbonPeriod::create($start, '1 day', $end);
            foreach ($period as $date) {
                $dateStr = $date->format('Y-m-d');
                $dayStart = $date->copy()->startOfDay();
                $dayEnd = $date->copy()->endOfDay();

                $dayRevenue = (float) Booking::whereIn('hotel_id', $hotelIds)
                    ->whereBetween('created_at', [$dayStart, $dayEnd])
                    ->sum('grand_total');

                $dayCollections = (float) Payment::whereHas('booking', function ($q) use ($hotelIds) {
                    $q->whereIn('hotel_id', $hotelIds);
                })->whereBetween('created_at', [$dayStart, $dayEnd])->sum('amount');

                $dayArrivals = (int) Booking::whereIn('hotel_id', $hotelIds)
                    ->whereBetween('check_in_at', [$dayStart, $dayEnd])
                    ->count();

                $dayDepartures = (int) Booking::whereIn('hotel_id', $hotelIds)
                    ->whereBetween('check_out_at', [$dayStart, $dayEnd])
                    ->count();

                $dailyTrends[] = [
                    'date' => $dateStr,
                    'day' => $date->format('d M'),
                    'revenue' => $dayRevenue,
                    'collections' => $dayCollections,
                    'arrivals' => $dayArrivals,
                    'departures' => $dayDepartures,
                ];
            }
        }

        // 8. Room Type Utilization
        $roomTypeStats = Room::whereIn('hotel_id', $hotelIds)
            ->select(
                'room_type',
                DB::raw('count(*) as total'),
                DB::raw("sum(case when status = 'OCCUPIED' then 1 else 0 end) as occupied"),
                DB::raw("sum(case when status = 'AVAILABLE' then 1 else 0 end) as available"),
                DB::raw('avg(base_price) as avg_price')
            )
            ->groupBy('room_type')
            ->orderBy('room_type')
            ->get()
            ->map(function ($rt) {
                $total = (int) $rt->total;
                $occ = (int) $rt->occupied;
                return [
                    'room_type' => $rt->room_type,
                    'total' => $total,
                    'occupied' => $occ,
                    'available' => (int) $rt->available,
                    'avg_price' => round((float) $rt->avg_price, 2),
                    'occupancy_pct' => $total > 0 ? round(($occ / $total) * 100, 1) : 0,
                ];
            });

        // 9. Store Valuation Summary
        $productsQuery = Product::whereIn('hotel_id', $hotelIds)->where('status', 'Active');
        $totalProductsCount = (int) (clone $productsQuery)->count();
        $totalStockValuation = (float) (clone $productsQuery)->sum(DB::raw('current_stock * rate'));
        $lowStockCount = (int) (clone $productsQuery)->whereColumn('current_stock', '<=', 'minimum_stock_qty')->count();

        return response()->json([
            'success' => true,
            'scope' => [
                'is_consolidated' => count($hotelIds) > 1,
                'hotels_count' => count($hotelIds),
                'hotel_name' => $hotel?->name ?? 'Consolidated Group Portfolio',
                'hotel_code' => $hotel?->hotel_code ?? 'GROUP',
            ],
            'filter' => [
                'preset' => $preset,
                'start_date' => $start->format('Y-m-d'),
                'end_date' => $end->format('Y-m-d'),
                'days_count' => $daysCount,
            ],
            'kpis' => [
                'total_revenue' => $totalRevenue,
                'total_room_charges' => $totalRoomCharges,
                'total_extra_charges' => $totalExtraCharges,
                'total_tax' => $totalTaxAmount,
                'total_discounts' => $totalDiscounts,
                'total_collections' => $totalCollections,
                'outstanding_balances' => $outstandingBalances,
                'occupancy_rate_pct' => $currentOccupancyPct,
                'adr' => $adr,
                'revpar' => $revPar,
                'total_rooms' => $totalRooms,
                'occupied_rooms' => $occupiedRooms,
                'available_rooms' => $availableRooms,
                'dirty_rooms' => $dirtyRooms,
                'maintenance_rooms' => $maintenanceRooms,
                'in_house_guests' => $inHouseCount,
                'total_arrivals' => $totalArrivals,
                'total_departures' => $totalDepartures,
                'total_nights_sold' => $totalNightsSold,
                'total_inventory_valuation' => $totalStockValuation,
                'low_stock_items_count' => $lowStockCount,
            ],
            'daily_trends' => $dailyTrends,
            'payment_methods' => $paymentMethodBreakdown,
            'folio_breakdown' => $folioBreakdown,
            'room_types' => $roomTypeStats,
        ]);
    }

    /**
     * Detailed Guest Ledger & Night Audit Settlement Report.
     */
    public function guestLedger(Request $request): JsonResponse
    {
        $this->authorizeReportsAccess($request);

        $hotelIds = $this->getHotelIds($request);
        [$start, $end, $preset] = $this->getDateRange($request);

        $query = Booking::whereIn('hotel_id', $hotelIds)
            ->with(['guest', 'room', 'hotel:id,name,hotel_code', 'payments'])
            ->where(function ($q) use ($start, $end) {
                $q->whereBetween('check_in_at', [$start, $end])
                  ->orWhereBetween('created_at', [$start, $end]);
            })
            ->latest('check_in_at');

        if ($request->filled('status') && $request->query('status') !== 'ALL') {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('payment_status') && $request->query('payment_status') !== 'ALL') {
            $query->where('payment_status', $request->query('payment_status'));
        }

        $bookings = $query->paginate(50);

        return response()->json([
            'success' => true,
            'filter' => [
                'preset' => $preset,
                'start_date' => $start->format('Y-m-d'),
                'end_date' => $end->format('Y-m-d'),
            ],
            'data' => $bookings,
        ]);
    }

    /**
     * Store & Inventory Valuation and Reorder Report.
     */
    public function inventory(Request $request): JsonResponse
    {
        $hotelIds = $this->getHotelIds($request);

        // Category-wise inventory valuation
        $categoryBreakdown = Product::whereIn('hotel_id', $hotelIds)
            ->where('status', 'Active')
            ->select(
                'category',
                DB::raw('count(*) as item_count'),
                DB::raw('sum(current_stock * rate) as total_value'),
                DB::raw("sum(case when current_stock <= minimum_stock_qty then 1 else 0 end) as low_stock_count")
            )
            ->groupBy('category')
            ->orderBy('category')
            ->get()
            ->map(function ($c) {
                return [
                    'category' => $c->category,
                    'item_count' => (int) $c->item_count,
                    'total_value' => round((float) $c->total_value, 2),
                    'low_stock_count' => (int) $c->low_stock_count,
                ];
            });

        // Low stock reorder alert items
        $lowStockItems = Product::whereIn('hotel_id', $hotelIds)
            ->where('status', 'Active')
            ->whereColumn('current_stock', '<=', 'minimum_stock_qty')
            ->with(['supplier:id,firm_name,contact_person,mobile'])
            ->orderBy('current_stock', 'asc')
            ->get();

        $totalValuation = (float) Product::whereIn('hotel_id', $hotelIds)
            ->where('status', 'Active')
            ->sum(DB::raw('current_stock * rate'));

        return response()->json([
            'success' => true,
            'total_valuation' => $totalValuation,
            'total_low_stock_items' => $lowStockItems->count(),
            'categories' => $categoryBreakdown,
            'low_stock_items' => $lowStockItems,
        ]);
    }

    /**
     * Export Guest Ledger / Daily Audit to CSV format.
     */
    public function exportCsv(Request $request): StreamedResponse
    {
        $this->authorizeReportsAccess($request);

        $hotelIds = $this->getHotelIds($request);
        [$start, $end] = $this->getDateRange($request);

        $bookings = Booking::whereIn('hotel_id', $hotelIds)
            ->with(['guest', 'room', 'hotel:id,name,hotel_code'])
            ->whereBetween('check_in_at', [$start, $end])
            ->latest('check_in_at')
            ->get();

        $filename = 'GrandStay_Report_' . $start->format('Ymd') . '_to_' . $end->format('Ymd') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"$filename\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->stream(function () use ($bookings) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, [
                'Booking Number',
                'Hotel Code',
                'Hotel Name',
                'Guest Name',
                'Guest Mobile',
                'Room Number',
                'Room Type',
                'Check-In Date',
                'Check-Out Date',
                'Status',
                'Total Nights',
                'Room Charges (INR)',
                'Extra Charges (INR)',
                'GST Tax (INR)',
                'Grand Total (INR)',
                'Paid Amount (INR)',
                'Balance Amount (INR)',
                'Payment Status',
            ]);

            foreach ($bookings as $b) {
                fputcsv($handle, [
                    $b->booking_number,
                    $b->hotel?->hotel_code,
                    $b->hotel?->name,
                    $b->guest ? ($b->guest->first_name . ' ' . ($b->guest->last_name ?? '')) : 'N/A',
                    $b->guest?->phone,
                    $b->room?->room_number,
                    $b->room?->room_type,
                    $b->check_in_at,
                    $b->check_out_at ?? $b->expected_check_out_at,
                    $b->status,
                    $b->total_nights,
                    $b->total_room_charges,
                    $b->total_extra_charges,
                    $b->tax_amount,
                    $b->grand_total,
                    $b->paid_amount,
                    $b->balance_amount,
                    $b->payment_status,
                ]);
            }

            fclose($handle);
        }, 200, $headers);
    }
}

