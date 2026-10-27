<?php

namespace App\Http\Controllers\Api\V1\FrontOffice;

use App\Domain\FrontOffice\Models\Booking;
use App\Domain\FrontOffice\Models\FolioItem;
use App\Domain\FrontOffice\Models\Guest;
use App\Domain\FrontOffice\Models\Payment;
use App\Domain\FrontOffice\Models\Room;
use App\Domain\Tenancy\Models\Hotel;
use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class FrontOfficeController extends Controller
{
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
     * Front desk dashboard overview metrics.
     */
    public function overview(Request $request): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $today = Carbon::today();

        $totalRooms = $hotel->rooms()->count();
        $occupiedRooms = $hotel->rooms()->where('status', 'OCCUPIED')->count();
        $availableRooms = $hotel->rooms()->where('status', 'AVAILABLE')->count();
        $dirtyRooms = $hotel->rooms()->where('status', 'DIRTY')->count();
        $maintenanceRooms = $hotel->rooms()->where('status', 'MAINTENANCE')->count();

        $inHouseGuests = $hotel->bookings()->where('status', 'CHECKED_IN')->count();

        $todayArrivals = $hotel->bookings()
            ->whereDate('check_in_at', $today)
            ->count();

        $todayDepartures = $hotel->bookings()
            ->where('status', 'CHECKED_IN')
            ->whereDate('expected_check_out_at', $today)
            ->count();

        $todayCollections = Payment::whereHas('booking', function ($q) use ($hotel) {
            $q->where('hotel_id', $hotel->id);
        })->whereDate('created_at', $today)->sum('amount');

        // Status breakdown for available rooms chart
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

        // Room types inventory distribution (Deluxe, Suite, etc.)
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

        // Map rooms with their daily booking status
        $roomsCalendar = $rooms->map(function ($room) use ($calendarDays, $bookings) {
            $roomBookings = $bookings->where('room_id', $room->id);

            $daysStatus = [];
            foreach ($calendarDays as $calDay) {
                $dayDate = Carbon::parse($calDay['date'])->startOfDay();

                // Find booking covering this date
                $activeBooking = $roomBookings->first(function ($b) use ($dayDate) {
                    $in = Carbon::parse($b->check_in_at)->startOfDay();
                    $out = Carbon::parse($b->expected_check_out_at)->startOfDay();
                    return $dayDate->greaterThanOrEqualTo($in) && $dayDate->lessThanOrEqualTo($out);
                });

                $status = 'AVAILABLE';
                $bookingInfo = null;

                if ($activeBooking) {
                    $status = 'BOOKED';
                    $bookingInfo = [
                        'id' => $activeBooking->id,
                        'booking_number' => $activeBooking->booking_number,
                        'guest_name' => $activeBooking->guest?->full_name,
                        'guest_phone' => $activeBooking->guest?->phone,
                        'guest_id_type' => $activeBooking->guest?->id_type,
                        'status' => $activeBooking->status,
                        'check_in_at' => Carbon::parse($activeBooking->check_in_at)->format('d M'),
                        'expected_check_out_at' => Carbon::parse($activeBooking->expected_check_out_at)->format('d M'),
                        'grand_total' => (float) $activeBooking->grand_total,
                        'balance_amount' => (float) $activeBooking->balance_amount,
                        'is_check_in_day' => $dayDate->isSameDay(Carbon::parse($activeBooking->check_in_at)),
                        'is_check_out_day' => $dayDate->isSameDay(Carbon::parse($activeBooking->expected_check_out_at)),
                    ];
                } elseif ($calDay['is_today'] && $room->status === 'DIRTY') {
                    $status = 'DIRTY';
                } elseif ($room->status === 'MAINTENANCE') {
                    $status = 'MAINTENANCE';
                }

                $daysStatus[] = [
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

            $bookedCount = collect($daysStatus)->where('status', 'BOOKED')->count();

            return [
                'id' => $room->id,
                'room_number' => $room->room_number,
                'room_type' => $room->room_type,
                'floor' => $room->floor,
                'base_price' => (float) $room->base_price,
                'current_status' => $room->status,
                'booked_days_count' => $bookedCount,
                'available_days_count' => count($daysStatus) - $bookedCount,
                'occupancy_pct' => count($daysStatus) > 0 ? round(($bookedCount / count($daysStatus)) * 100, 1) . '%' : '0%',
                'days' => $daysStatus,
                'bookings_list' => $roomBookings->map(function ($b) {
                    return [
                        'id' => $b->id,
                        'booking_number' => $b->booking_number,
                        'guest_name' => $b->guest?->full_name,
                        'check_in_at' => Carbon::parse($b->check_in_at)->format('d M Y'),
                        'expected_check_out_at' => Carbon::parse($b->expected_check_out_at)->format('d M Y'),
                        'status' => $b->status,
                    ];
                })->values(),
            ];
        });

        // Calculate daily occupancy aggregates across all rooms
        $dailyAggregates = [];
        foreach ($calendarDays as $calDay) {
            $totalRoomsCount = $rooms->count();
            $bookedOnDay = 0;
            foreach ($roomsCalendar as $rCal) {
                $dayEntry = collect($rCal['days'])->firstWhere('date', $calDay['date']);
                if ($dayEntry && $dayEntry['status'] === 'BOOKED') {
                    $bookedOnDay++;
                }
            }
            $availableOnDay = $totalRoomsCount - $bookedOnDay;
            $dailyAggregates[] = [
                'date' => $calDay['date'],
                'day' => $calDay['day'],
                'day_name' => $calDay['day_name'],
                'month_short' => $calDay['month_short'],
                'formatted_date' => $calDay['formatted_date'],
                'is_today' => $calDay['is_today'],
                'total_rooms' => $totalRoomsCount,
                'booked_rooms' => $bookedOnDay,
                'available_rooms' => $availableOnDay,
                'occupancy_rate' => $totalRoomsCount > 0 ? round(($bookedOnDay / $totalRoomsCount) * 100) : 0,
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
     * Create a new room for the hotel property (from Book1.xlsx specification).
     */
    public function storeRoom(Request $request): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $this->authorizeRoomManagement($request, $hotel);

        $validated = $request->validate([
            'room_number' => [
                'required',
                'string',
                'max:20',
                \Illuminate\Validation\Rule::unique('rooms', 'room_number')->where('hotel_id', $hotel->id),
            ],
            'room_type' => 'required|string|max:100',
            'room_mode' => 'nullable|string|in:AC,Non AC',
            'floor' => 'nullable|string|max:50',
            'base_price' => 'required|numeric|min:0',
            'extra_bedding_price' => 'nullable|numeric|min:0',
            'gst_percentage' => 'nullable|numeric|min:0|max:100',
            'status' => 'nullable|string',
            'max_guests' => 'nullable|integer|min:1',
            'amenities' => 'nullable|array',
            'remarks' => 'nullable|string|max:500',
        ]);

        $statusMap = [
            'Available' => 'AVAILABLE',
            'Occupied' => 'OCCUPIED',
            'Cleaning' => 'DIRTY',
            'Under Maintenance' => 'MAINTENANCE',
        ];
        $status = $validated['status'] ?? 'AVAILABLE';
        if (isset($statusMap[$status])) {
            $status = $statusMap[$status];
        }

        $room = $hotel->rooms()->create([
            'room_number' => $validated['room_number'],
            'room_type' => $validated['room_type'],
            'room_mode' => $validated['room_mode'] ?? 'AC',
            'floor' => $validated['floor'] ?? '1st Floor',
            'base_price' => $validated['base_price'],
            'extra_bedding_price' => $validated['extra_bedding_price'] ?? 0.00,
            'gst_percentage' => $validated['gst_percentage'] ?? 12.00,
            'status' => $status,
            'max_guests' => $validated['max_guests'] ?? 2,
            'amenities' => $validated['amenities'] ?? ['High-Speed WiFi', 'Smart TV', 'AC', 'Mini Fridge'],
            'remarks' => $validated['remarks'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Room {$room->room_number} ({$room->room_type}) created successfully.",
            'room' => $room,
        ], 201);
    }

    /**
     * Update room details.
     */
    public function updateRoom(Request $request, string $roomId): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $this->authorizeRoomManagement($request, $hotel);
        $room = $hotel->rooms()->findOrFail($roomId);

        $validated = $request->validate([
            'room_number' => [
                'sometimes',
                'required',
                'string',
                'max:20',
                \Illuminate\Validation\Rule::unique('rooms', 'room_number')->where('hotel_id', $hotel->id)->ignore($room->id),
            ],
            'room_type' => 'sometimes|required|string|max:100',
            'room_mode' => 'nullable|string|in:AC,Non AC',
            'floor' => 'nullable|string|max:50',
            'base_price' => 'sometimes|required|numeric|min:0',
            'extra_bedding_price' => 'nullable|numeric|min:0',
            'gst_percentage' => 'nullable|numeric|min:0|max:100',
            'status' => 'nullable|string',
            'max_guests' => 'nullable|integer|min:1',
            'amenities' => 'nullable|array',
            'remarks' => 'nullable|string|max:500',
        ]);

        if (isset($validated['status'])) {
            $statusMap = [
                'Available' => 'AVAILABLE',
                'Occupied' => 'OCCUPIED',
                'Cleaning' => 'DIRTY',
                'Under Maintenance' => 'MAINTENANCE',
            ];
            if (isset($statusMap[$validated['status']])) {
                $validated['status'] = $statusMap[$validated['status']];
            }
        }

        $room->update($validated);

        return response()->json([
            'success' => true,
            'message' => "Room {$room->room_number} updated successfully.",
            'room' => $room,
        ]);
    }

    /**
     * Update room housekeeping status (e.g. DIRTY -> AVAILABLE).
     */
    public function updateRoomStatus(Request $request, string $roomId): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $room = $hotel->rooms()->findOrFail($roomId);

        $validated = $request->validate([
            'status' => 'required|in:AVAILABLE,OCCUPIED,DIRTY,MAINTENANCE',
        ]);

        $room->status = $validated['status'];
        $room->save();

        return response()->json([
            'success' => true,
            'message' => "Room {$room->room_number} status updated to {$room->status}.",
            'room' => $room,
        ]);
    }

    /**
     * List bookings with optional status filter.
     */
    public function bookings(Request $request): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $status = $request->query('status'); // CHECKED_IN, RESERVED, CHECKED_OUT, ALL

        $query = $hotel->bookings()->with(['guest', 'room', 'payments', 'folioItems']);

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
            ->with(['guest', 'room', 'folioItems', 'payments'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'booking' => $booking,
        ]);
    }

    /**
     * Complete Walk-in / Guest Check-in with KYC Verification & Deposit.
     */
    public function checkIn(Request $request): JsonResponse
    {
        $hotel = $this->getHotel($request);

        $validated = $request->validate([
            // Guest KYC details
            'first_name' => 'required|string|max:100',
            'last_name' => 'nullable|string|max:100',
            'phone' => 'required|string|max:30',
            'email' => 'nullable|email|max:150',
            'nationality' => 'required|string|max:100',
            'id_type' => 'required|in:AADHAAR,PASSPORT,DRIVING_LICENSE,VOTER_ID',
            'id_number' => 'required|string|max:100',
            'id_document_path' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'purpose_of_visit' => 'nullable|string|max:150',

            // Stay parameters
            'room_id' => 'required|uuid|exists:rooms,id',
            'check_in_at' => 'nullable|date',
            'expected_check_out_at' => 'required|date',
            'num_adults' => 'nullable|integer|min:1',
            'num_children' => 'nullable|integer|min:0',
            'special_requests' => 'nullable|string',

            // Tariff & Billing
            'room_rate_per_night' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'advance_deposit_amount' => 'nullable|numeric|min:0',
            'payment_method' => 'nullable|in:CASH,UPI_QR,CARD,BANK_TRANSFER',
            'transaction_reference' => 'nullable|string|max:100',
        ]);

        return DB::transaction(function () use ($hotel, $validated) {
            $room = $hotel->rooms()->where('id', $validated['room_id'])->lockForUpdate()->firstOrFail();

            $checkInTime = !empty($validated['check_in_at'])
                ? Carbon::parse($validated['check_in_at'])
                : Carbon::now();
            $checkOutTime = Carbon::parse($validated['expected_check_out_at']);

            if ($checkOutTime->lte($checkInTime)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Check-out date and time must be after the check-in date and time.',
                ], 422);
            }

            // Check if there is an overlapping active or reserved booking for this room
            $overlapping = Booking::where('room_id', $room->id)
                ->whereIn('status', ['CHECKED_IN', 'RESERVED'])
                ->where(function ($q) use ($checkInTime, $checkOutTime) {
                    $q->where('check_in_at', '<', $checkOutTime)
                      ->where('expected_check_out_at', '>', $checkInTime);
                })
                ->with('guest')
                ->first();

            if ($overlapping) {
                $guestName = $overlapping->guest ? ($overlapping->guest->first_name . ' ' . $overlapping->guest->last_name) : 'another guest';
                $start = $overlapping->check_in_at->format('d M Y, h:i A');
                $end = $overlapping->expected_check_out_at->format('d M Y, h:i A');
                return response()->json([
                    'success' => false,
                    'message' => "Room {$room->room_number} is not available for the selected dates. It is already booked by {$guestName} from {$start} to {$end}.",
                ], 422);
            }

            // If check-in is in the future (> 6 hours ahead), treat as advance reservation
            $isFutureReservation = $checkInTime->isAfter(Carbon::now()->addHours(6));

            if (!$isFutureReservation && $room->status === 'OCCUPIED') {
                return response()->json([
                    'success' => false,
                    'message' => "Room {$room->room_number} is currently occupied by an in-house guest today.",
                ], 422);
            }

            $bookingStatus = $isFutureReservation ? 'RESERVED' : 'CHECKED_IN';

            // 1. Create or update guest profile with KYC identity
            $guest = Guest::create([
                'hotel_id' => $hotel->id,
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'] ?? null,
                'email' => $validated['email'] ?? null,
                'phone' => $validated['phone'],
                'nationality' => $validated['nationality'],
                'id_type' => $validated['id_type'],
                'id_number' => $validated['id_number'],
                'id_document_path' => $validated['id_document_path'] ?? 'verified_id_scan_' . time() . '.pdf',
                'address' => $validated['address'] ?? null,
                'city' => $validated['city'] ?? null,
                'state' => $validated['state'] ?? null,
                'purpose_of_visit' => $validated['purpose_of_visit'] ?? 'Business / Leisure',
            ]);

            // 2. Calculate duration
            $nights = max(1, (int) $checkInTime->copy()->startOfDay()->diffInDays($checkOutTime->copy()->startOfDay()));

            $ratePerNight = isset($validated['room_rate_per_night']) && $validated['room_rate_per_night'] > 0
                ? (float) $validated['room_rate_per_night']
                : (float) $room->base_price;

            $totalRoomCharges = $ratePerNight * $nights;
            $discount = (float) ($validated['discount_amount'] ?? 0);

            // 3. Create Booking
            $booking = Booking::create([
                'hotel_id' => $hotel->id,
                'booking_number' => 'BK-' . rand(10000, 99999),
                'guest_id' => $guest->id,
                'room_id' => $room->id,
                'check_in_at' => $checkInTime,
                'expected_check_out_at' => $checkOutTime,
                'num_adults' => $validated['num_adults'] ?? 1,
                'num_children' => $validated['num_children'] ?? 0,
                'status' => $bookingStatus,
                'room_rate_per_night' => $ratePerNight,
                'total_nights' => $nights,
                'total_room_charges' => $totalRoomCharges,
                'total_extra_charges' => 0,
                'discount_amount' => $discount,
                'special_requests' => $validated['special_requests'] ?? null,
            ]);

            // 4. Mark room as OCCUPIED only if immediate check-in today
            if (!$isFutureReservation) {
                $room->status = 'OCCUPIED';
                $room->save();
            }

            // 5. Post Room Tariff to Folio
            FolioItem::create([
                'booking_id' => $booking->id,
                'item_type' => 'ROOM_CHARGE',
                'description' => $isFutureReservation
                    ? "Advance Reservation Tariff ({$nights} Nights x ₹" . number_format($ratePerNight, 2) . ")"
                    : "Room Tariff ({$nights} Nights x ₹" . number_format($ratePerNight, 2) . ")",
                'quantity' => $nights,
                'unit_price' => $ratePerNight,
                'total_price' => $totalRoomCharges,
                'charged_at' => $checkInTime,
            ]);

            // 6. Record Advance Deposit if provided
            $advanceAmount = (float) ($validated['advance_deposit_amount'] ?? 0);
            if ($advanceAmount > 0) {
                Payment::create([
                    'booking_id' => $booking->id,
                    'receipt_number' => 'REC-' . rand(5000, 9999),
                    'amount' => $advanceAmount,
                    'payment_method' => $validated['payment_method'] ?? 'UPI_QR',
                    'transaction_reference' => $validated['transaction_reference'] ?? ('DEP/' . time()),
                    'payment_type' => 'ADVANCE_DEPOSIT',
                    'notes' => $isFutureReservation
                        ? 'Advance deposit collected for future room reservation.'
                        : 'Advance deposit collected at front desk check-in counter.',
                ]);
            }

            // 7. Calculate final totals, taxes, and balance
            $booking->recalculateTotals();

            $message = $isFutureReservation
                ? "Advance Reservation confirmed for Room {$room->room_number} ({$booking->booking_number}) from " . $checkInTime->format('d M Y, h:i A') . " to " . $checkOutTime->format('d M Y, h:i A') . " ({$nights} Nights)."
                : "Guest {$guest->full_name} checked in to Room {$room->room_number} successfully ({$nights} Nights). Folio #{$booking->booking_number} generated.";

            return response()->json([
                'success' => true,
                'message' => $message,
                'is_future_reservation' => $isFutureReservation,
                'booking' => $booking->fresh(['guest', 'room', 'folioItems', 'payments']),
            ], 201);
        });
    }

    /**
     * Add extra incidental charges to in-house guest bill (Room Service, Laundry, Extra Bed).
     */
    public function addFolioCharge(Request $request, string $bookingId): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $booking = $hotel->bookings()->where('status', 'CHECKED_IN')->findOrFail($bookingId);

        $validated = $request->validate([
            'item_type' => 'required|in:FOOD_BEVERAGE,LAUNDRY,EXTRA_BED,MISC',
            'description' => 'required|string|max:255',
            'quantity' => 'required|integer|min:1',
            'unit_price' => 'required|numeric|min:0',
        ]);

        $qty = (int) $validated['quantity'];
        $unitPrice = (float) $validated['unit_price'];
        $totalPrice = $qty * $unitPrice;

        $folioItem = FolioItem::create([
            'booking_id' => $booking->id,
            'item_type' => $validated['item_type'],
            'description' => $validated['description'],
            'quantity' => $qty,
            'unit_price' => $unitPrice,
            'total_price' => $totalPrice,
            'charged_at' => Carbon::now(),
        ]);

        $booking->recalculateTotals();

        return response()->json([
            'success' => true,
            'message' => "Charge of ₹" . number_format($totalPrice, 2) . " posted to Room {$booking->room?->room_number} folio.",
            'folio_item' => $folioItem,
            'updated_booking' => $booking->fresh(['folioItems', 'payments']),
        ]);
    }

    /**
     * Record partial or mid-stay payment.
     */
    public function recordPayment(Request $request, string $bookingId): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $booking = $hotel->bookings()->findOrFail($bookingId);

        $validated = $request->validate([
            'amount' => 'required|numeric|min:1',
            'payment_method' => 'required|in:CASH,UPI_QR,CARD,BANK_TRANSFER',
            'transaction_reference' => 'nullable|string|max:100',
            'notes' => 'nullable|string|max:255',
        ]);

        $payment = Payment::create([
            'booking_id' => $booking->id,
            'receipt_number' => 'REC-' . rand(5000, 9999),
            'amount' => $validated['amount'],
            'payment_method' => $validated['payment_method'],
            'transaction_reference' => $validated['transaction_reference'] ?? ('TXN/' . time()),
            'payment_type' => 'PARTIAL',
            'notes' => $validated['notes'] ?? 'Mid-stay payment collected.',
        ]);

        $booking->recalculateTotals();

        return response()->json([
            'success' => true,
            'message' => "Payment of ₹" . number_format($payment->amount, 2) . " recorded successfully.",
            'payment' => $payment,
            'updated_booking' => $booking->fresh(['folioItems', 'payments']),
        ]);
    }

    /**
     * Process Check-out, Settle Bill, Mark Room Dirty for Housekeeping, and Generate GST Tax Invoice.
     */
    public function checkOut(Request $request, string $bookingId): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $booking = $hotel->bookings()->where('status', 'CHECKED_IN')->findOrFail($bookingId);

        $validated = $request->validate([
            'settlement_amount' => 'nullable|numeric|min:0',
            'payment_method' => 'nullable|in:CASH,UPI_QR,CARD,BANK_TRANSFER',
            'transaction_reference' => 'nullable|string|max:100',
            'notes' => 'nullable|string|max:255',
        ]);

        return DB::transaction(function () use ($hotel, $booking, $validated) {
            $settlementAmount = (float) ($validated['settlement_amount'] ?? $booking->balance_amount);

            if ($settlementAmount > 0) {
                Payment::create([
                    'booking_id' => $booking->id,
                    'receipt_number' => 'INV-REC-' . rand(1000, 9999),
                    'amount' => $settlementAmount,
                    'payment_method' => $validated['payment_method'] ?? 'UPI_QR',
                    'transaction_reference' => $validated['transaction_reference'] ?? ('SETTLE/' . time()),
                    'payment_type' => 'SETTLEMENT',
                    'notes' => $validated['notes'] ?? 'Final bill settlement at departure.',
                ]);
            }

            // Recalculate
            $booking->recalculateTotals();

            // Mark booking as CHECKED_OUT
            $booking->status = 'CHECKED_OUT';
            $booking->check_out_at = Carbon::now();
            $booking->save();

            // Mark room as DIRTY (awaiting Housekeeping cleaning)
            if ($booking->room) {
                $booking->room->status = 'DIRTY';
                $booking->room->save();
            }

            // Structure GST Tax Invoice Receipt
            $invoiceData = [
                'invoice_number' => 'GST-INV-' . date('Ym') . '-' . substr($booking->booking_number, 3),
                'date' => Carbon::now()->format('d M Y, h:i A'),
                'hotel' => [
                    'name' => $hotel->name,
                    'hotel_code' => $hotel->hotel_code,
                    'city' => $hotel->city,
                    'phone' => $hotel->phone,
                    'tax_number' => $hotel->organization?->tax_number ?? '27AAACA1234A1Z5',
                ],
                'guest' => [
                    'name' => $booking->guest?->full_name,
                    'phone' => $booking->guest?->phone,
                    'email' => $booking->guest?->email,
                    'nationality' => $booking->guest?->nationality,
                    'id_type' => $booking->guest?->id_type,
                    'id_number' => $booking->guest?->id_number,
                    'address' => $booking->guest?->address,
                ],
                'stay' => [
                    'room_number' => $booking->room?->room_number,
                    'room_type' => $booking->room?->room_type,
                    'check_in' => $booking->check_in_at->format('d M Y, h:i A'),
                    'check_out' => $booking->check_out_at->format('d M Y, h:i A'),
                    'nights' => $booking->total_nights,
                ],
                'charges' => [
                    'room_charges' => (float) $booking->total_room_charges,
                    'extra_charges' => (float) $booking->total_extra_charges,
                    'discount' => (float) $booking->discount_amount,
                    'taxable_amount' => (float) ($booking->total_room_charges + $booking->total_extra_charges - $booking->discount_amount),
                    'gst_12_percent' => (float) $booking->tax_amount,
                    'grand_total' => (float) $booking->grand_total,
                    'total_paid' => (float) $booking->paid_amount,
                    'balance_due' => (float) $booking->balance_amount,
                ],
                'folio_items' => $booking->folioItems,
                'payments' => $booking->payments,
            ];

            return response()->json([
                'success' => true,
                'message' => "Guest {$booking->guest?->full_name} checked out. Room {$booking->room?->room_number} marked DIRTY for housekeeping.",
                'invoice' => $invoiceData,
                'booking' => $booking->fresh(['guest', 'room', 'folioItems', 'payments']),
            ]);
        });
    }
}
