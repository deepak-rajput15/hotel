<?php

namespace App\Http\Controllers\Api\V1\FrontOffice;

use App\Domain\FrontOffice\Contracts\LostAndFoundServiceInterface;
use App\Domain\FrontOffice\Models\LostAndFoundItem;
use App\Domain\Tenancy\Models\Hotel;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\FrontOffice\ClaimLostItemRequest;
use App\Http\Requests\Api\V1\FrontOffice\DisposeLostItemRequest;
use App\Http\Requests\Api\V1\FrontOffice\StoreLostItemRequest;
use App\Http\Requests\Api\V1\FrontOffice\UpdateLostItemRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LostAndFoundController extends Controller
{
    public function __construct(
        protected LostAndFoundServiceInterface $lostAndFoundService
    ) {}

    /**
     * Resolve active hotel context from request attributes.
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

        if ($request->filled('status') && $request->query('status') !== 'ALL') {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('category') && $request->query('category') !== 'ALL') {
            $query->where('category', $request->query('category'));
        }

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

        return response()->json([
            'success' => true,
            'summary' => [
                'total_items' => $hotel->lostAndFoundItems()->count(),
                'in_custody' => $hotel->lostAndFoundItems()->where('status', LostAndFoundItem::STATUS_IN_CUSTODY)->count(),
                'claimed' => $hotel->lostAndFoundItems()->where('status', LostAndFoundItem::STATUS_CLAIMED)->count(),
                'disposed' => $hotel->lostAndFoundItems()->where('status', LostAndFoundItem::STATUS_DISPOSED)->count(),
            ],
            'items' => $items,
        ]);
    }

    /**
     * Log a new lost & found item (Delegates to LostAndFoundService).
     */
    public function store(StoreLostItemRequest $request): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $item = $this->lostAndFoundService->logItem($hotel, $request->validated(), $request->user());

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
    public function update(UpdateLostItemRequest $request, string $id): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $item = $hotel->lostAndFoundItems()->findOrFail($id);
        $item->update($request->validated());

        return response()->json([
            'success' => true,
            'message' => "Item #{$item->reference_no} updated successfully.",
            'item' => $item->load(['room', 'booking.guest', 'foundByStaff']),
        ]);
    }

    /**
     * Claim and handover item to guest / representative (Delegates to LostAndFoundService).
     */
    public function claim(ClaimLostItemRequest $request, string $id): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $item = $this->lostAndFoundService->claimItem($hotel, $id, $request->validated());

        return response()->json([
            'success' => true,
            'message' => "Item #{$item->reference_no} marked as CLAIMED and handed over to {$item->claimed_by_name}.",
            'item' => $item,
        ]);
    }

    /**
     * Dispose or donate unclaimed item (Delegates to LostAndFoundService).
     */
    public function dispose(DisposeLostItemRequest $request, string $id): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $item = $this->lostAndFoundService->disposeItem($hotel, $id, $request->validated(), $request->user());

        return response()->json([
            'success' => true,
            'message' => "Item #{$item->reference_no} marked as DISPOSED.",
            'item' => $item,
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
