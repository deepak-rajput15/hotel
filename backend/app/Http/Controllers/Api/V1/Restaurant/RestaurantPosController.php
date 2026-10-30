<?php

namespace App\Http\Controllers\Api\V1\Restaurant;

use App\Domain\Restaurant\Contracts\RestaurantPosServiceInterface;
use App\Domain\Restaurant\Models\RestaurantOrder;
use App\Domain\Restaurant\Models\RestaurantTable;
use App\Domain\Tenancy\Models\Hotel;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Restaurant\AddRestaurantOrderItemsRequest;
use App\Http\Requests\Api\V1\Restaurant\CreateRestaurantOrderRequest;
use App\Http\Requests\Api\V1\Restaurant\SettleRestaurantOrderRequest;
use App\Http\Requests\Api\V1\Restaurant\StoreMenuItemRequest;
use App\Http\Requests\Api\V1\Restaurant\StoreRestaurantTableRequest;
use App\Http\Requests\Api\V1\Restaurant\UpdateMenuItemRequest;
use App\Http\Requests\Api\V1\Restaurant\UpdateRestaurantTableStatusRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RestaurantPosController extends Controller
{
    public function __construct(
        protected RestaurantPosServiceInterface $restaurantService
    ) {}

    /**
     * Resolve current hotel from request attributes.
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
     * List all dining tables with active orders, covers and seating areas.
     */
    public function tables(Request $request): JsonResponse
    {
        $hotel = $this->getHotel($request);

        $tables = $hotel->restaurantTables()
            ->orderBy('table_no')
            ->get();

        // Attach active order (if any)
        $activeOrders = RestaurantOrder::where('hotel_id', $hotel->id)
            ->whereIn('status', [RestaurantOrder::STATUS_OPEN, RestaurantOrder::STATUS_BILLED])
            ->whereNotNull('table_id')
            ->with(['items'])
            ->get()
            ->keyBy('table_id');

        $tablesData = $tables->map(function ($tbl) use ($activeOrders) {
            $order = $activeOrders->get($tbl->id);
            return [
                'id' => $tbl->id,
                'table_no' => $tbl->table_no,
                'capacity' => $tbl->capacity,
                'seating_area' => $tbl->seating_area,
                'status' => $tbl->status,
                'qr_code' => $tbl->qr_code,
                'notes' => $tbl->notes,
                'active_order' => $order ? [
                    'id' => $order->id,
                    'order_number' => $order->order_number,
                    'covers' => $order->covers,
                    'customer_name' => $order->customer_name,
                    'status' => $order->status,
                    'subtotal' => (float) $order->subtotal,
                    'tax_amount' => (float) $order->tax_amount,
                    'grand_total' => (float) $order->grand_total,
                    'items_count' => $order->items->sum('quantity'),
                    'opened_at' => $order->created_at?->diffForHumans(),
                ] : null,
            ];
        });

        $summary = [
            'total' => $tables->count(),
            'available' => $tables->where('status', RestaurantTable::STATUS_AVAILABLE)->count(),
            'occupied' => $tables->where('status', RestaurantTable::STATUS_OCCUPIED)->count(),
            'reserved' => $tables->where('status', RestaurantTable::STATUS_RESERVED)->count(),
            'cleaning' => $tables->where('status', RestaurantTable::STATUS_CLEANING)->count(),
        ];

        return response()->json([
            'success' => true,
            'tables' => $tablesData,
            'summary' => $summary,
        ]);
    }

    /**
     * Create a new dining table.
     */
    public function storeTable(StoreRestaurantTableRequest $request): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $table = $this->restaurantService->createTable($hotel, $request->validated());

        return response()->json([
            'success' => true,
            'message' => "Table {$table->table_no} created successfully.",
            'table' => $table,
        ], 201);
    }

    /**
     * Update table status (e.g. CLEANING -> AVAILABLE).
     */
    public function updateTableStatus(UpdateRestaurantTableStatusRequest $request, string $id): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $table = $hotel->restaurantTables()->findOrFail($id);
        $table = $this->restaurantService->updateTableStatus($table, $request->validated('status'));

        return response()->json([
            'success' => true,
            'message' => "Table {$table->table_no} status updated to {$table->status}.",
            'table' => $table,
        ]);
    }

    /**
     * Get menu categories and items.
     */
    public function menu(Request $request): JsonResponse
    {
        $hotel = $this->getHotel($request);

        $query = $hotel->menuItems()->latest();

        if ($request->filled('category') && $request->query('category') !== 'ALL') {
            $query->where('category_name', $request->query('category'));
        }

        if ($request->filled('food_type') && $request->query('food_type') !== 'ALL') {
            $query->where('food_type', $request->query('food_type'));
        }

        if ($request->filled('available_only') && $request->boolean('available_only')) {
            $query->where('is_available', true);
        }

        if ($request->filled('search')) {
            $term = '%' . $request->query('search') . '%';
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', $term)
                  ->orWhere('item_code', 'like', $term)
                  ->orWhere('description', 'like', $term);
            });
        }

        $items = $query->get();

        $categories = $hotel->menuCategories()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'success' => true,
            'categories' => $categories,
            'items' => $items,
        ]);
    }

    /**
     * Create a new menu item.
     */
    public function storeMenuItem(StoreMenuItemRequest $request): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $item = $this->restaurantService->createMenuItem($hotel, $request->validated());

        return response()->json([
            'success' => true,
            'message' => "Menu item '{$item->name}' added successfully.",
            'item' => $item,
        ], 201);
    }

    /**
     * Update menu item or toggle availability.
     */
    public function updateMenuItem(UpdateMenuItemRequest $request, string $id): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $item = $hotel->menuItems()->findOrFail($id);
        $item = $this->restaurantService->updateMenuItem($item, $request->validated());

        return response()->json([
            'success' => true,
            'message' => "Menu item '{$item->name}' updated successfully.",
            'item' => $item,
        ]);
    }

    /**
     * List restaurant orders.
     */
    public function orders(Request $request): JsonResponse
    {
        $hotel = $this->getHotel($request);

        $query = $hotel->restaurantOrders()
            ->with(['table', 'room', 'booking.guest', 'items'])
            ->latest();

        if ($request->filled('status') && $request->query('status') !== 'ALL') {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('order_type') && $request->query('order_type') !== 'ALL') {
            $query->where('order_type', $request->query('order_type'));
        }

        $orders = $query->paginate(30);

        return response()->json([
            'success' => true,
            'module' => 'restaurant',
            'orders' => $orders,
        ]);
    }

    /**
     * View detailed restaurant order with itemized KOTs.
     */
    public function orderDetail(Request $request, string $id): JsonResponse
    {
        $hotel = $this->getHotel($request);

        $order = $hotel->restaurantOrders()
            ->with(['table', 'room', 'booking.guest', 'items.menuItem'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'order' => $order,
        ]);
    }

    /**
     * Create a new order and punch initial KOT.
     */
    public function createOrder(CreateRestaurantOrderRequest $request): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $order = $this->restaurantService->createOrder($hotel, $request->validated(), $request->user());

        return response()->json([
            'success' => true,
            'message' => "Order #{$order->order_number} created with KOT-001.",
            'order' => $order,
        ], 201);
    }

    /**
     * Add extra items to an open order (generates incremental KOT e.g. KOT-002).
     */
    public function addOrderItems(AddRestaurantOrderItemsRequest $request, string $id): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $order = $hotel->restaurantOrders()->findOrFail($id);
        $order = $this->restaurantService->addOrderItems($order, $request->validated(), $request->user());

        $kotNumber = $order->latest_kot_number ?? 'KOT';

        return response()->json([
            'success' => true,
            'message' => "Items punched under {$kotNumber}.",
            'order' => $order,
        ]);
    }

    /**
     * Settle the order (Direct Cash/UPI/Card or Charge to Front Office Room Folio).
     */
    public function settleOrder(SettleRestaurantOrderRequest $request, string $id): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $order = $hotel->restaurantOrders()->findOrFail($id);
        $order = $this->restaurantService->settleOrder($order, $request->validated(), $request->user());

        return response()->json([
            'success' => true,
            'message' => "Order #{$order->order_number} settled successfully via {$order->settlement_method}.",
            'order' => $order,
        ]);
    }

    /**
     * List in-house checked-in rooms for 1-click room service and folio posting.
     */
    public function inHouseRooms(Request $request): JsonResponse
    {
        $hotel = $this->getHotel($request);

        $bookings = $hotel->bookings()
            ->where('status', 'CHECKED_IN')
            ->with(['guest', 'room'])
            ->get();

        $rooms = $bookings->map(function ($b) {
            return [
                'booking_id' => $b->id,
                'booking_number' => $b->booking_number,
                'room_id' => $b->room_id,
                'room_number' => $b->room?->room_number,
                'room_type' => $b->room?->room_type,
                'guest_name' => $b->guest ? ($b->guest->first_name . ' ' . ($b->guest->last_name ?? '')) : 'Guest',
                'guest_phone' => $b->guest?->phone,
            ];
        });

        return response()->json([
            'success' => true,
            'rooms' => $rooms,
        ]);
    }
}
