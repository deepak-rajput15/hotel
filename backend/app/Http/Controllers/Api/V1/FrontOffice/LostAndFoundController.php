<?php

namespace App\Http\Controllers\Api\V1\FrontOffice;

use App\Domain\FrontOffice\Models\Booking;
use App\Domain\FrontOffice\Models\LostAndFoundItem;
use App\Domain\FrontOffice\Models\Room;
use App\Domain\Tenancy\Models\Hotel;
use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class LostAndFoundController extends Controller
{
    /**
     * Resolve hotel context from request attributes.
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
     * List all lost & found items with metrics, search and filtering.
     */
    public function index(Request $request): JsonResponse
    {
        $hotel = $this->getHotel($request);

        $query = $hotel->lostAndFoundItems()
            ->with(['room', 'booking.guest', 'foundByStaff'])
            ->latest('found_at');

        // Status Filter
        if ($request->filled('status') && $request->query('status') !== 'ALL') {
            $query->where('status', $request->query('status'));
        }

        // Category Filter
        if ($request->filled('category') && $request->query('category') !== 'ALL') {
            $query->where('category', $request->query('category'));
        }

        // Search Term (Item name, Reference No, Guest name, Room number, Founder name)
        if ($request->filled('search')) {
            $search = '%' . trim($request->query('search')) . '%';
            $query->where(function ($q) use ($search) {
                $q->where('reference_no', 'like', $search)
                    ->orWhere('item_name', 'like', $search)
                    ->orWhere('description', 'like', $search)
                    ->orWhere('specific_location', 'like', $search)
                    ->orWhere('guest_name', 'like', $search)
                    ->orWhere('guest_phone', 'like', $search)
                    ->orWhere('found_by_name', 'like', $search)
                    ->orWhere('claimed_by_name', 'like', $search)
                    ->orWhereHas('room', function ($rq) use ($search) {
                        $rq->where('room_number', 'like', $search);
                    });
            });
        }

        $items = $query->paginate($request->query('per_page', 25));

        // Summary Metric Counts
        $totalCount = $hotel->lostAndFoundItems()->count();
        $inCustodyCount = $hotel->lostAndFoundItems()->where('status', LostAndFoundItem::STATUS_IN_CUSTODY)->count();
        $claimedCount = $hotel->lostAndFoundItems()->where('status', LostAndFoundItem::STATUS_CLAIMED)->count();
        $disposedCount = $hotel->lostAndFoundItems()->where('status', LostAndFoundItem::STATUS_DISPOSED)->count();

        return response()->json([
            'success' => true,
            'summary' => [
                'total_items' => $totalCount,
                'in_custody' => $inCustodyCount,
                'claimed' => $claimedCount,
                'disposed' => $disposedCount,
            ],
            'items' => $items,
        ]);
    }

    /**
     * Log a new lost & found item.
     */
    public function store(Request $request): JsonResponse
    {
        $hotel = $this->getHotel($request);

        $validated = $request->validate([
            'item_name' => 'required|string|max:255',
            'category' => 'required|string|in:ELECTRONICS,VALUABLES,DOCUMENTS,CLOTHING,BAGGAGE,OTHERS',
            'found_location_type' => 'required|string|in:ROOM,RESTAURANT,LOBBY,POOL_GARDEN,BANQUET,OTHER',
            'room_id' => 'nullable|uuid|exists:rooms,id',
            'specific_location' => 'nullable|string|max:255',
            'found_at' => 'nullable|date',
            'found_by_name' => 'required|string|max:255',
            'storage_location' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'estimated_value' => 'nullable|numeric|min:0',
            'guest_name' => 'nullable|string|max:255',
            'guest_phone' => 'nullable|string|max:50',
            'guest_email' => 'nullable|email|max:255',
        ]);

        // Auto-generate reference number: LF-YYYYMMDD-XXX
        $datePrefix = Carbon::now()->format('Ymd');
        $todayCount = $hotel->lostAndFoundItems()
            ->whereDate('created_at', Carbon::today())
            ->count() + 1;
        $referenceNo = sprintf('LF-%s-%03d', $datePrefix, $todayCount);

        // If found in a guest room and guest details are empty, auto-detect last booking
        $bookingId = null;
        if (!empty($validated['room_id'])) {
            $room = Room::where('hotel_id', $hotel->id)->find($validated['room_id']);
            if ($room) {
                // Find current in-house or most recent checked-out booking for this room
                $recentBooking = Booking::where('hotel_id', $hotel->id)
                    ->where('room_id', $room->id)
                    ->with('guest')
                    ->latest('check_in_at')
                    ->first();

                if ($recentBooking) {
                    $bookingId = $recentBooking->id;
                    if (empty($validated['guest_name'])) {
                        $validated['guest_name'] = $recentBooking->guest?->name;
                    }
                    if (empty($validated['guest_phone'])) {
                        $validated['guest_phone'] = $recentBooking->guest?->phone;
                    }
                    if (empty($validated['guest_email'])) {
                        $validated['guest_email'] = $recentBooking->guest?->email;
                    }
                }
            }
        }

        $item = $hotel->lostAndFoundItems()->create([
            'reference_no' => $referenceNo,
            'item_name' => $validated['item_name'],
            'category' => $validated['category'],
            'found_location_type' => $validated['found_location_type'],
            'room_id' => $validated['room_id'] ?? null,
            'specific_location' => $validated['specific_location'] ?? null,
            'found_at' => !empty($validated['found_at']) ? Carbon::parse($validated['found_at']) : Carbon::now(),
            'found_by_name' => $validated['found_by_name'],
            'found_by_staff_id' => $request->user()?->id,
            'storage_location' => $validated['storage_location'] ?? 'Front Desk Safe Locker',
            'description' => $validated['description'] ?? null,
            'estimated_value' => $validated['estimated_value'] ?? null,
            'status' => LostAndFoundItem::STATUS_IN_CUSTODY,
            'guest_name' => $validated['guest_name'] ?? null,
            'guest_phone' => $validated['guest_phone'] ?? null,
            'guest_email' => $validated['guest_email'] ?? null,
            'booking_id' => $bookingId,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Lost item logged successfully with Reference #{$item->reference_no}",
            'item' => $item->load(['room', 'booking.guest', 'foundByStaff']),
        ], 201);
    }

    /**
     * Show detailed item record.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $hotel = $this->getHotel($request);

        $item = $hotel->lostAndFoundItems()
            ->with(['room', 'booking.guest', 'foundByStaff'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'item' => $item,
        ]);
    }

    /**
     * Update lost & found item details.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $hotel = $this->getHotel($request);

        $item = $hotel->lostAndFoundItems()->findOrFail($id);

        $validated = $request->validate([
            'item_name' => 'sometimes|required|string|max:255',
            'category' => 'sometimes|required|string|in:ELECTRONICS,VALUABLES,DOCUMENTS,CLOTHING,BAGGAGE,OTHERS',
            'found_location_type' => 'sometimes|required|string|in:ROOM,RESTAURANT,LOBBY,POOL_GARDEN,BANQUET,OTHER',
            'room_id' => 'nullable|uuid|exists:rooms,id',
            'specific_location' => 'nullable|string|max:255',
            'storage_location' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'estimated_value' => 'nullable|numeric|min:0',
            'guest_name' => 'nullable|string|max:255',
            'guest_phone' => 'nullable|string|max:50',
            'guest_email' => 'nullable|email|max:255',
        ]);

        $item->update($validated);

        return response()->json([
            'success' => true,
            'message' => "Item #{$item->reference_no} updated successfully.",
            'item' => $item->load(['room', 'booking.guest', 'foundByStaff']),
        ]);
    }

    /**
     * Claim and handover item to guest / representative.
     */
    public function claim(Request $request, string $id): JsonResponse
    {
        $hotel = $this->getHotel($request);

        $item = $hotel->lostAndFoundItems()->findOrFail($id);

        if ($item->status === LostAndFoundItem::STATUS_CLAIMED) {
            return response()->json([
                'success' => false,
                'message' => "This item has already been claimed on {$item->claimed_at?->format('d M Y')}.",
            ], 422);
        }

        $validated = $request->validate([
            'claimed_by_name' => 'required|string|max:255',
            'claimed_by_phone' => 'required|string|max:50',
            'claimed_by_id_proof' => 'nullable|string|max:255',
            'handover_by_staff_name' => 'required|string|max:255',
            'handover_notes' => 'nullable|string',
        ]);

        $item->update([
            'status' => LostAndFoundItem::STATUS_CLAIMED,
            'claimed_at' => Carbon::now(),
            'claimed_by_name' => $validated['claimed_by_name'],
            'claimed_by_phone' => $validated['claimed_by_phone'],
            'claimed_by_id_proof' => $validated['claimed_by_id_proof'] ?? null,
            'handover_by_staff_name' => $validated['handover_by_staff_name'],
            'handover_notes' => $validated['handover_notes'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Item #{$item->reference_no} marked as CLAIMED and handed over to {$item->claimed_by_name}.",
            'item' => $item->load(['room', 'booking.guest', 'foundByStaff']),
        ]);
    }

    /**
     * Dispose or donate unclaimed item after retention period or perishable expiration.
     */
    public function dispose(Request $request, string $id): JsonResponse
    {
        $hotel = $this->getHotel($request);

        $item = $hotel->lostAndFoundItems()->findOrFail($id);

        $validated = $request->validate([
            'disposal_reason' => 'required|string|max:500',
            'handover_by_staff_name' => 'nullable|string|max:255',
            'handover_notes' => 'nullable|string',
        ]);

        $item->update([
            'status' => LostAndFoundItem::STATUS_DISPOSED,
            'disposed_at' => Carbon::now(),
            'disposal_reason' => $validated['disposal_reason'],
            'handover_by_staff_name' => $validated['handover_by_staff_name'] ?? ($request->user()?->name ?? 'Front Office Manager'),
            'handover_notes' => $validated['handover_notes'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Item #{$item->reference_no} marked as DISPOSED.",
            'item' => $item->load(['room', 'booking.guest', 'foundByStaff']),
        ]);
    }

    /**
     * Delete lost & found entry.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $hotel = $this->getHotel($request);

        $item = $hotel->lostAndFoundItems()->findOrFail($id);
        $ref = $item->reference_no;
        $item->delete();

        return response()->json([
            'success' => true,
            'message' => "Item #{$ref} deleted from register.",
        ]);
    }
}
