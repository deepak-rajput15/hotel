<?php

namespace App\Http\Controllers\Api\V1\FrontOffice;

use App\Domain\FrontOffice\Contracts\FrontOfficeServiceInterface;
use App\Domain\FrontOffice\Models\Booking;
use App\Domain\FrontOffice\Models\Payment;
use App\Domain\FrontOffice\Models\Room;
use App\Domain\Tenancy\Models\Hotel;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\FrontOffice\AddFolioChargeRequest;
use App\Http\Requests\Api\V1\FrontOffice\CheckInRequest;
use App\Http\Requests\Api\V1\FrontOffice\CheckOutRequest;
use App\Http\Requests\Api\V1\FrontOffice\RecordPaymentRequest;
use App\Http\Requests\Api\V1\FrontOffice\StoreRoomRequest;
use App\Http\Requests\Api\V1\FrontOffice\UpdateRoomRequest;
use App\Http\Requests\Api\V1\FrontOffice\UpdateRoomStatusRequest;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FrontOfficeController extends Controller
{
    public function __construct(
        protected FrontOfficeServiceInterface $frontOfficeService
    ) {}
    /**
     * Helper to resolve hotel from request attributes.
     */
    protected function getHotel(Request $request): Hotel
    {
        $hotel = $request->attributes->get('current_hotel');
        if (!$hotel) {
            abort(400, 'Hotel context could not be resolved.');
        }
        return $hotel;
    }

    /**
     * Ensure only Platform Admin, Organization Owner, or Hotel Sub-Admin (General Manager)
     * can add or modify rooms. Front Desk staff is strictly unauthorized.
     */
    protected function authorizeRoomManagement(Request $request, Hotel $hotel): void
    {
        $user = $request->user();

        if ($user->isPlatformAdmin()) {
            return;
        }

        if ($user->isOrgOwner() && $user->organization_id === $hotel->organization_id) {
            return;
        }

        $userAccess = $user->hotelAccess()
            ->where('hotel_id', $hotel->id)
            ->with('role')
            ->first();

        $roleSlug = $userAccess?->role?->slug;
        if (in_array($roleSlug, ['general-manager', 'hotel-owner'], true)) {
            return;
        }

        abort(response()->json([
            'success' => false,
            'error_code' => 'ROOM_MANAGEMENT_FORBIDDEN',
            'message' => 'Only the Hotel Owner and Hotel Sub-Admin (General Manager) are authorized to add or modify rooms. Front Desk staff does not have permission.',
        ], 403));
    }

    /**
     * Front desk dashboard overview metrics.
     */
    public function overview(Request $request): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $today = Carbon::today();
        $startOfDay = $today->copy()->startOfDay();
        $endOfDay = $today->copy()->endOfDay();

        // Optimized grouped count query
        $roomCounts = $hotel->rooms()
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        $totalRooms = array_sum($roomCounts);
        $occupiedRooms = $roomCounts['OCCUPIED'] ?? 0;
        $availableRooms = $roomCounts['AVAILABLE'] ?? 0;
        $dirtyRooms = $roomCounts['DIRTY'] ?? 0;
        $maintenanceRooms = $roomCounts['MAINTENANCE'] ?? 0;

        $inHouseGuests = $hotel->bookings()->where('status', 'CHECKED_IN')->count();

        // Index-friendly range queries (utilizes B-Tree indexes on check_in_at / expected_check_out_at)
        $todayArrivals = $hotel->bookings()
            ->whereBetween('check_in_at', [$startOfDay, $endOfDay])
            ->count();

        $todayDepartures = $hotel->bookings()
            ->where('status', 'CHECKED_IN')
            ->whereBetween('expected_check_out_at', [$startOfDay, $endOfDay])
            ->count();

        $todayCollections = Payment::whereHas('booking', function ($q) use ($hotel) {
            $q->where('hotel_id', $hotel->id);
        })->whereBetween('created_at', [$startOfDay, $endOfDay])->sum('amount');

        $statusBreakdown = [
            'available' => [
                'label' => 'Available Clean',
                'count' => $availableRooms,
                'pct' => $totalRooms > 0 ? round(($availableRooms / $totalRooms) * 100, 1) : 0,
                'color' => '#10b981',
            ],
            'occupied' => [
                'label' => 'Occupied Stay',
                'count' => $occupiedRooms,
                'pct' => $totalRooms > 0 ? round(($occupiedRooms / $totalRooms) * 100, 1) : 0,
                'color' => '#6366f1',
            ],
            'dirty' => [
                'label' => 'Needs Housekeeping',
                'count' => $dirtyRooms,
                'pct' => $totalRooms > 0 ? round(($dirtyRooms / $totalRooms) * 100, 1) : 0,
                'color' => '#f59e0b',
            ],
            'maintenance' => [
                'label' => 'Maintenance',
                'count' => $maintenanceRooms,
                'pct' => $totalRooms > 0 ? round(($maintenanceRooms / $totalRooms) * 100, 1) : 0,
                'color' => '#ef4444',
            ],
        ];

        $roomTypes = $hotel->rooms()
            ->select(
                'room_type',
                DB::raw('count(*) as total'),
                DB::raw("sum(case when status = 'AVAILABLE' then 1 else 0 end) as available"),
                DB::raw("sum(case when status = 'OCCUPIED' then 1 else 0 end) as occupied"),
                DB::raw("sum(case when status = 'DIRTY' then 1 else 0 end) as dirty"),
                DB::raw("sum(case when status = 'MAINTENANCE' then 1 else 0 end) as maintenance")
            )
            ->groupBy('room_type')
            ->orderBy('room_type')
            ->get()
            ->map(function ($rt) {
                $total = (int) $rt->total;
                $avail = (int) $rt->available;
                $occ = (int) $rt->occupied;
                return [
                    'room_type' => $rt->room_type,
                    'total' => $total,
                    'available' => $avail,
                    'occupied' => $occ,
                    'dirty' => (int) $rt->dirty,
                    'maintenance' => (int) $rt->maintenance,
                    'occupancy_pct' => $total > 0 ? round(($occ / $total) * 100) : 0,
                    'availability_pct' => $total > 0 ? round(($avail / $total) * 100) : 0,
                ];
            });

        return response()->json([
            'success' => true,
            'module' => 'front_office',
            'hotel' => [
                'id' => $hotel->id,
                'hotel_code' => $hotel->hotel_code,
                'name' => $hotel->name,
                'city' => $hotel->city,
            ],
            'metrics' => [
                'total_rooms' => $totalRooms,
                'occupied_rooms' => $occupiedRooms,
                'available_rooms' => $availableRooms,
                'dirty_rooms' => $dirtyRooms,
                'maintenance_rooms' => $maintenanceRooms,
                'occupancy_rate' => $totalRooms > 0 ? round(($occupiedRooms / $totalRooms) * 100, 1) . '%' : '0%',
                'in_house_guests' => $inHouseGuests,
                'today_arrivals' => $todayArrivals,
                'today_departures' => $todayDepartures,
                'today_collections' => (float) $todayCollections,
                'status_breakdown' => $statusBreakdown,
                'room_types' => $roomTypes,
            ],
        ]);
    }

    /**
     * 1-Month Room Occupancy Calendar (Tape Chart) & Availability Grid.
     */
    public function calendar(Request $request): JsonResponse
    {
        $hotel = $this->getHotel($request);

        $daysCount = (int) $request->query('days', 30);
        if ($daysCount <= 0 || $daysCount > 90) {
            $daysCount = 30;
        }

        if ($request->filled('start_date')) {
            try {
                $rangeStart = Carbon::parse($request->query('start_date'))->startOfDay();
            } catch (\Exception $e) {
                $rangeStart = Carbon::today()->startOfDay();
            }
        } elseif ($request->filled('month')) {
            try {
                $rangeStart = Carbon::createFromFormat('Y-m', $request->query('month'))->startOfMonth();
                if (!$request->has('days')) {
                    $daysCount = $rangeStart->daysInMonth;
                }
            } catch (\Exception $e) {
                $rangeStart = Carbon::today()->startOfDay();
            }
        } else {
            // Default: Start from TODAY for upcoming 30 days forward horizon
            $rangeStart = Carbon::today()->startOfDay();
        }

        $rangeEnd = $rangeStart->copy()->addDays($daysCount - 1)->endOfDay();

        $roomId = $request->query('room_id');

        $roomsQuery = $hotel->rooms()->orderBy('room_number', 'asc');
        if ($roomId) {
            $roomsQuery->where('id', $roomId);
        }
        $rooms = $roomsQuery->get();

        // Fetch bookings overlapping this period
        $bookings = $hotel->bookings()
            ->with(['guest', 'room'])
            ->whereIn('status', ['CHECKED_IN', 'RESERVED', 'CHECKED_OUT'])
            ->where(function ($q) use ($rangeStart, $rangeEnd) {
                $q->where('check_in_at', '<=', $rangeEnd)
                  ->where('expected_check_out_at', '>=', $rangeStart);
            })
            ->get();

        // Build list of calendar days starting from $rangeStart
        $calendarDays = [];
        for ($i = 0; $i < $daysCount; $i++) {
            $date = $rangeStart->copy()->addDays($i);
            $calendarDays[] = [
                'day' => (int) $date->format('j'),
                'date' => $date->format('Y-m-d'),
                'day_name' => $date->format('D'), // Mon, Tue...
                'month_name' => $date->format('F'),
                'month_short' => $date->format('M'),
                'formatted_date' => $date->format('d M'),
                'is_weekend' => $date->isWeekend(),
                'is_today' => $date->isToday(),
            ];
        }

        // Build per-room calendar rows
        $roomsCalendar = [];
        foreach ($rooms as $room) {
            $roomDays = [];
            $roomBookings = $bookings->where('room_id', $room->id);

            foreach ($calendarDays as $calDay) {
                $dayDate = Carbon::parse($calDay['date']);

                // Find active booking for this room on this date
                // Note: check_out date is usually departure day, so stay is strictly < check_out
                $booking = $roomBookings->first(function ($b) use ($dayDate) {
                    $ci = Carbon::parse($b->check_in_at)->startOfDay();
                    $co = Carbon::parse($b->expected_check_out_at)->startOfDay();
                    // If same-day booking, consider stay on that day
                    if ($ci->equalTo($co)) {
                        return $dayDate->equalTo($ci);
                    }
                    return $dayDate->greaterThanOrEqualTo($ci) && $dayDate->lessThan($co);
                });

                $status = 'AVAILABLE';
                $bookingInfo = null;

                if ($booking) {
                    $status = $booking->status; // CHECKED_IN or RESERVED
                    $bookingInfo = [
                        'id' => $booking->id,
                        'booking_number' => $booking->booking_number,
                        'guest_name' => $booking->guest?->full_name,
                        'guest_phone' => $booking->guest?->phone,
                        'status' => $booking->status,
                        'check_in_at' => $booking->check_in_at?->format('Y-m-d H:i'),
                        'expected_check_out_at' => $booking->expected_check_out_at?->format('Y-m-d H:i'),
                        'is_check_in_day' => Carbon::parse($booking->check_in_at)->isSameDay($dayDate),
                        'is_check_out_day' => Carbon::parse($booking->expected_check_out_at)->isSameDay($dayDate),
                    ];
                } elseif ($room->status === 'MAINTENANCE') {
                    $status = 'MAINTENANCE';
                } elseif ($room->status === 'DIRTY') {
                    $status = 'DIRTY';
                }

                $roomDays[] = [
                    'day' => $calDay['day'],
                    'date' => $calDay['date'],
                    'day_name' => $calDay['day_name'],
                    'month_short' => $calDay['month_short'],
                    'formatted_date' => $calDay['formatted_date'],
                    'is_today' => $calDay['is_today'],
                    'status' => $status,
                    'booking' => $bookingInfo,
                ];
            }

            $roomsCalendar[] = [
                'id' => $room->id,
                'room_number' => $room->room_number,
                'room_type' => $room->room_type,
                'floor' => $room->floor,
                'current_status' => $room->status,
                'base_price' => (float) $room->base_price,
                'days' => $roomDays,
            ];
        }

        // Daily aggregate summary
        $dailyAggregates = [];
        $totalRoomsCount = $rooms->count();
        foreach ($calendarDays as $calDay) {
            $dayDate = Carbon::parse($calDay['date']);

            $bookedOnDay = 0;
            foreach ($roomsCalendar as $r) {
                foreach ($r['days'] as $d) {
                    if ($d['date'] === $calDay['date'] && in_array($d['status'], ['CHECKED_IN', 'RESERVED'])) {
                        $bookedOnDay++;
                        break;
                    }
                }
            }

            $occRate = $totalRoomsCount > 0 ? round(($bookedOnDay / $totalRoomsCount) * 100, 1) : 0;
            $dailyAggregates[] = [
                'date' => $calDay['date'],
                'day' => $calDay['day'],
                'day_name' => $calDay['day_name'],
                'month_short' => $calDay['month_short'],
                'formatted_date' => $calDay['formatted_date'],
                'is_today' => $calDay['is_today'],
                'total_rooms' => $totalRoomsCount,
                'booked_rooms' => $bookedOnDay,
                'available_rooms' => max(0, $totalRoomsCount - $bookedOnDay),
                'occupancy_rate' => $occRate,
            ];
        }

        $rangeLabel = $rangeStart->format('d M Y') . ' — ' . $rangeEnd->format('d M Y');

        return response()->json([
            'success' => true,
            'start_date' => $rangeStart->format('Y-m-d'),
            'end_date' => $rangeEnd->format('Y-m-d'),
            'range_label' => $rangeLabel,
            'days_count' => $daysCount,
            'prev_start_date' => $rangeStart->copy()->subDays($daysCount)->format('Y-m-d'),
            'next_start_date' => $rangeStart->copy()->addDays($daysCount)->format('Y-m-d'),
            'today_start_date' => Carbon::today()->format('Y-m-d'),
            'month' => $rangeStart->format('Y-m'),
            'month_label' => $rangeLabel,
            'prev_month' => $rangeStart->copy()->subMonth()->format('Y-m'),
            'next_month' => $rangeStart->copy()->addMonth()->format('Y-m'),
            'days_in_month' => $daysCount,
            'days' => $calendarDays,
            'rooms' => $roomsCalendar,
            'daily_aggregates' => $dailyAggregates,
        ]);
    }

    /**
     * List all hotel rooms with visual status.
     */
    public function rooms(Request $request): JsonResponse
    {
        $hotel = $this->getHotel($request);

        $rooms = $hotel->rooms()
            ->with(['currentBooking.guest'])
            ->orderBy('room_number', 'asc')
            ->get()
            ->map(function ($r) {
                $activeBooking = $r->currentBooking->first();
                return [
                    'id' => $r->id,
                    'room_number' => $r->room_number,
                    'room_type' => $r->room_type,
                    'floor' => $r->floor,
                    'base_price' => (float) $r->base_price,
                    'status' => $r->status,
                    'max_guests' => $r->max_guests,
                    'amenities' => $r->amenities ?? [],
                    'room_mode' => $r->room_mode ?? 'AC',
                    'extra_bedding_price' => (float) ($r->extra_bedding_price ?? 0),
                    'gst_percentage' => (float) ($r->gst_percentage ?? 12.00),
                    'remarks' => $r->remarks,
                    'current_guest' => $activeBooking ? [
                        'booking_id' => $activeBooking->id,
                        'booking_number' => $activeBooking->booking_number,
                        'guest_name' => $activeBooking->guest?->full_name,
                        'phone' => $activeBooking->guest?->phone,
                        'check_in_at' => $activeBooking->check_in_at->format('d M, h:i A'),
                        'expected_check_out_at' => $activeBooking->expected_check_out_at->format('d M, h:i A'),
                        'balance_amount' => (float) $activeBooking->balance_amount,
                    ] : null,
                ];
            });

        return response()->json([
            'success' => true,
            'rooms' => $rooms,
        ]);
    }

    /**
     * Create a new room (Delegates to FrontOfficeService).
     */
    public function storeRoom(StoreRoomRequest $request): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $this->authorizeRoomManagement($request, $hotel);

        $room = $this->frontOfficeService->createRoom($hotel, $request->validated());

        return response()->json([
            'success' => true,
            'message' => "Room {$room->room_number} ({$room->room_type}) created successfully.",
            'room' => $room,
        ], 201);
    }

    /**
     * Update room details (Delegates to FrontOfficeService).
     */
    public function updateRoom(UpdateRoomRequest $request, string $roomId): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $this->authorizeRoomManagement($request, $hotel);

        $room = $this->frontOfficeService->updateRoom($hotel, $roomId, $request->validated());

        return response()->json([
            'success' => true,
            'message' => "Room {$room->room_number} updated successfully.",
            'room' => $room,
        ]);
    }

    /**
     * Update room housekeeping status (Delegates to FrontOfficeService).
     */
    public function updateRoomStatus(UpdateRoomStatusRequest $request, string $roomId): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $room = $this->frontOfficeService->updateRoomStatus($hotel, $roomId, $request->validated()['status']);

        return response()->json([
            'success' => true,
            'message' => "Room {$room->room_number} status updated to {$room->status}.",
            'room' => $room,
        ]);
    }

    /**
     * List all bookings with status filter.
     */
    public function bookings(Request $request): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $status = $request->query('status');

        $query = $hotel->bookings()->with(['guest', 'room', 'bookingGuests', 'payments', 'folioItems']);

        if ($status && $status !== 'ALL') {
            $query->where('status', $status);
        } else {
            $query->whereIn('status', ['CHECKED_IN', 'RESERVED']);
        }

        $bookings = $query->latest('check_in_at')->get();

        return response()->json([
            'success' => true,
            'bookings' => $bookings,
        ]);
    }

    /**
     * Get single booking details with complete folio & payments.
     */
    public function bookingDetail(Request $request, string $id): JsonResponse
    {
        $hotel = $this->getHotel($request);

        $booking = $hotel->bookings()
            ->with(['guest', 'room', 'bookingGuests', 'folioItems', 'payments'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'booking' => $booking,
        ]);
    }

    /**
     * Complete Walk-in / Guest Check-in (Delegates to FrontOfficeService).
     */
    public function checkIn(CheckInRequest $request): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $result = $this->frontOfficeService->checkInGuest($hotel, $request->validated());

        return response()->json($result, 201);
    }

    /**
     * Confirm check-in for advance reservation (Delegates to FrontOfficeService).
     */
    public function confirmCheckIn(Request $request, string $bookingId): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $booking = $this->frontOfficeService->confirmReservation($hotel, $bookingId);

        return response()->json([
            'success' => true,
            'message' => "Guest {$booking->guest?->full_name} confirmed and checked into Room {$booking->room?->room_number} successfully.",
            'booking' => $booking,
        ]);
    }

    /**
     * Add extra incidental charges to in-house guest bill (Delegates to FrontOfficeService).
     */
    public function addFolioCharge(AddFolioChargeRequest $request, string $bookingId): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $result = $this->frontOfficeService->addFolioCharge($hotel, $bookingId, $request->validated());

        return response()->json([
            'success' => true,
            'message' => "Charge of ₹" . number_format($result['total_price'], 2) . " posted to Room {$result['room_number']} folio.",
            'folio_item' => $result['folio_item'],
            'updated_booking' => $result['updated_booking'],
        ]);
    }

    /**
     * Record partial or mid-stay payment (Delegates to FrontOfficeService).
     */
    public function recordPayment(RecordPaymentRequest $request, string $bookingId): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $result = $this->frontOfficeService->recordFolioPayment($hotel, $bookingId, $request->validated());

        return response()->json([
            'success' => true,
            'message' => "Payment of ₹" . number_format($result['payment']->amount, 2) . " recorded successfully.",
            'payment' => $result['payment'],
            'updated_booking' => $result['updated_booking'],
        ]);
    }

    /**
     * Process Check-out and Settle Bill (Delegates to FrontOfficeService).
     */
    public function checkOut(CheckOutRequest $request, string $bookingId): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $result = $this->frontOfficeService->checkOutGuest($hotel, $bookingId, $request->validated());

        return response()->json([
            'success' => true,
            'message' => "Guest {$result['booking']->guest?->full_name} checked out. Room {$result['booking']->room?->room_number} marked DIRTY for housekeeping.",
            'invoice' => $result['invoice'],
            'booking' => $result['booking'],
        ]);
    }
}
