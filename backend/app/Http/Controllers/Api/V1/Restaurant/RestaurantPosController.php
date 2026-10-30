<?php

namespace App\Http\Controllers\Api\V1\Restaurant;

use App\Domain\FrontOffice\Models\Booking;
use App\Domain\FrontOffice\Models\FolioItem;
use App\Domain\FrontOffice\Models\Room;
use App\Domain\Restaurant\Models\MenuCategory;
use App\Domain\Restaurant\Models\MenuItem;
use App\Domain\Restaurant\Models\RestaurantOrder;
use App\Domain\Restaurant\Models\RestaurantOrderItem;
use App\Domain\Restaurant\Models\RestaurantTable;
use App\Domain\Tenancy\Models\Hotel;
use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class RestaurantPosController extends Controller
{
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
    public function storeTable(Request $request): JsonResponse
    {
        $hotel = $this->getHotel($request);

        $validated = $request->validate([
            'table_no' => [
                'required',
                'string',
                'max:50',
                Rule::unique('restaurant_tables')->where(function ($q) use ($hotel) {
                    return $q->where('hotel_id', $hotel->id);
                }),
            ],
            'capacity' => 'required|integer|min:1|max:50',
            'seating_area' => 'required|string|max:100',
            'notes' => 'nullable|string|max:255',
        ]);

        $qrUrl = "https://menu.hotelsaask.com/qr/{$hotel->hotel_code}/" . urlencode($validated['table_no']);

        $table = RestaurantTable::create([
            'hotel_id' => $hotel->id,
            'table_no' => $validated['table_no'],
            'capacity' => $validated['capacity'],
            'seating_area' => $validated['seating_area'],
            'status' => RestaurantTable::STATUS_AVAILABLE,
            'qr_code' => $qrUrl,
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Table {$table->table_no} created successfully.",
            'table' => $table,
        ], 201);
    }

    /**
     * Update table status (e.g. CLEANING -> AVAILABLE).
     */
    public function updateTableStatus(Request $request, string $id): JsonResponse
    {
        $hotel = $this->getHotel($request);

        $table = $hotel->restaurantTables()->findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|string|in:AVAILABLE,OCCUPIED,RESERVED,CLEANING',
        ]);

        $table->update(['status' => $validated['status']]);

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
    public function storeMenuItem(Request $request): JsonResponse
    {
        $hotel = $this->getHotel($request);

        $validated = $request->validate([
            'category_name' => 'required|string|max:100',
            'item_code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('menu_items')->where(function ($q) use ($hotel) {
                    return $q->where('hotel_id', $hotel->id);
                }),
            ],
            'name' => 'required|string|max:150',
            'description' => 'nullable|string|max:500',
            'price' => 'required|numeric|min:0',
            'gst_percentage' => 'nullable|numeric|min:0|max:28',
            'food_type' => 'required|string|in:VEG,NON_VEG,EGG',
            'is_available' => 'nullable|boolean',
            'preparation_time_minutes' => 'nullable|integer|min:1',
        ]);

        // Auto-find or create category
        $category = MenuCategory::firstOrCreate(
            ['hotel_id' => $hotel->id, 'name' => $validated['category_name']],
            ['slug' => Str::slug($validated['category_name']), 'sort_order' => 1, 'is_active' => true]
        );

        $item = MenuItem::create([
            'hotel_id' => $hotel->id,
            'category_id' => $category->id,
            'category_name' => $category->name,
            'item_code' => strtoupper($validated['item_code']),
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'price' => $validated['price'],
            'gst_percentage' => $validated['gst_percentage'] ?? 5.00,
            'food_type' => $validated['food_type'],
            'is_available' => $validated['is_available'] ?? true,
            'preparation_time_minutes' => $validated['preparation_time_minutes'] ?? 15,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Menu item '{$item->name}' added successfully.",
            'item' => $item,
        ], 201);
    }

    /**
     * Update menu item or toggle availability.
     */
    public function updateMenuItem(Request $request, string $id): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $item = $hotel->menuItems()->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:150',
            'category_name' => 'sometimes|string|max:100',
            'price' => 'sometimes|numeric|min:0',
            'gst_percentage' => 'sometimes|numeric|min:0',
            'food_type' => 'sometimes|string|in:VEG,NON_VEG,EGG',
            'is_available' => 'sometimes|boolean',
            'description' => 'nullable|string|max:500',
            'preparation_time_minutes' => 'sometimes|integer|min:1',
        ]);

        $item->update($validated);

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
    public function createOrder(Request $request): JsonResponse
    {
        $hotel = $this->getHotel($request);

        $validated = $request->validate([
            'order_type' => 'required|string|in:DINE_IN,ROOM_SERVICE,TAKEAWAY',
            'table_id' => 'required_if:order_type,DINE_IN|nullable|uuid',
            'room_id' => 'required_if:order_type,ROOM_SERVICE|nullable|uuid',
            'booking_id' => 'nullable|uuid',
            'customer_name' => 'nullable|string|max:100',
            'customer_phone' => 'nullable|string|max:30',
            'covers' => 'nullable|integer|min:1',
            'notes' => 'nullable|string|max:255',
            'items' => 'required|array|min:1',
            'items.*.menu_item_id' => 'required|uuid',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.special_notes' => 'nullable|string|max:255',
        ]);

        return DB::transaction(function () use ($hotel, $validated) {
            $table = null;
            if ($validated['order_type'] === RestaurantOrder::ORDER_TYPE_DINE_IN) {
                $table = $hotel->restaurantTables()->findOrFail($validated['table_id']);

                $existingOrder = $hotel->restaurantOrders()
                    ->where('table_id', $table->id)
                    ->whereIn('status', [RestaurantOrder::STATUS_OPEN, RestaurantOrder::STATUS_BILLED])
                    ->first();

                if ($existingOrder) {
                    return response()->json([
                        'success' => false,
                        'message' => "Table {$table->table_no} already has an active order (#{$existingOrder->order_number}). Please add items to existing order or settle it first.",
                    ], 422);
                }

                $table->update(['status' => RestaurantTable::STATUS_OCCUPIED]);
            }

            $room = null;
            $booking = null;
            if ($validated['order_type'] === RestaurantOrder::ORDER_TYPE_ROOM_SERVICE) {
                $room = $hotel->rooms()->findOrFail($validated['room_id']);

                if (!empty($validated['booking_id'])) {
                    $booking = $hotel->bookings()->findOrFail($validated['booking_id']);
                    if ($booking->room_id !== $room->id || $booking->status !== 'CHECKED_IN') {
                        return response()->json([
                            'success' => false,
                            'message' => "Booking #{$booking->booking_number} is not an active in-house booking for Room {$room->room_number}.",
                        ], 422);
                    }
                } else {
                    $booking = $hotel->bookings()
                        ->where('room_id', $room->id)
                        ->where('status', 'CHECKED_IN')
                        ->latest('check_in_at')
                        ->first();
                }

                if (!$booking) {
                    return response()->json([
                        'success' => false,
                        'message' => "Cannot place Room Service order for Room {$room->room_number} because there is no active checked-in guest.",
                    ], 422);
                }
            }

            // Generate unique Order Number (e.g. ORD-20261028-001-A1B2)
            $datePrefix = Carbon::now()->format('Ymd');
            $countToday = RestaurantOrder::where('hotel_id', $hotel->id)
                ->whereDate('created_at', Carbon::today())
                ->count();
            $orderNumber = 'ORD-' . $datePrefix . '-' . str_pad($countToday + 1, 3, '0', STR_PAD_LEFT) . '-' . strtoupper(Str::random(4));

            $order = RestaurantOrder::create([
                'hotel_id' => $hotel->id,
                'order_number' => $orderNumber,
                'order_type' => $validated['order_type'],
                'table_id' => $table?->id,
                'room_id' => $room?->id,
                'booking_id' => $booking?->id,
                'customer_name' => $validated['customer_name'] ?? ($booking ? $booking->guest?->first_name . ' ' . $booking->guest?->last_name : null),
                'customer_phone' => $validated['customer_phone'] ?? $booking?->guest?->phone,
                'covers' => $validated['covers'] ?? 1,
                'status' => RestaurantOrder::STATUS_OPEN,
                'notes' => $validated['notes'] ?? null,
            ]);

            // Punch items under KOT-001
            $kotNumber = 'KOT-001';
            $subtotal = 0;
            $taxAmount = 0;

            foreach ($validated['items'] as $itemData) {
                $menuItem = $hotel->menuItems()->findOrFail($itemData['menu_item_id']);
                $qty = (int) $itemData['quantity'];
                $itemTotal = round($menuItem->price * $qty, 2);
                $itemGst = round(($itemTotal * $menuItem->gst_percentage) / 100, 2);

                RestaurantOrderItem::create([
                    'order_id' => $order->id,
                    'menu_item_id' => $menuItem->id,
                    'kot_number' => $kotNumber,
                    'item_name' => $menuItem->name,
                    'food_type' => $menuItem->food_type,
                    'quantity' => $qty,
                    'unit_price' => $menuItem->price,
                    'total_price' => $itemTotal,
                    'special_notes' => $itemData['special_notes'] ?? null,
                    'status' => RestaurantOrderItem::STATUS_PENDING,
                    'kot_printed_at' => Carbon::now(),
                ]);

                $subtotal += $itemTotal;
                $taxAmount += $itemGst;
            }

            $grandTotal = $subtotal + $taxAmount;

            $order->update([
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'grand_total' => $grandTotal,
            ]);

            return response()->json([
                'success' => true,
                'message' => "Order #{$order->order_number} created with {$kotNumber}.",
                'order' => $order->load(['items', 'table', 'room']),
            ], 201);
        });
    }

    /**
     * Add extra items to an open order (generates incremental KOT e.g. KOT-002).
     */
    public function addOrderItems(Request $request, string $id): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $order = $hotel->restaurantOrders()->findOrFail($id);

        if (in_array($order->status, [RestaurantOrder::STATUS_SETTLED, RestaurantOrder::STATUS_CANCELLED], true)) {
            return response()->json([
                'success' => false,
                'message' => "Cannot add items to an order that is {$order->status}.",
            ], 422);
        }

        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.menu_item_id' => 'required|uuid',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.special_notes' => 'nullable|string|max:255',
        ]);

        return DB::transaction(function () use ($hotel, $order, $validated) {
            // Find next KOT number
            $lastKot = $order->items()->orderBy('kot_number', 'desc')->value('kot_number');
            $kotIndex = 1;
            if ($lastKot && preg_match('/KOT-(\d+)/', $lastKot, $matches)) {
                $kotIndex = ((int) $matches[1]) + 1;
            }
            $kotNumber = 'KOT-' . str_pad($kotIndex, 3, '0', STR_PAD_LEFT);

            $addedSubtotal = 0;
            $addedTax = 0;

            foreach ($validated['items'] as $itemData) {
                $menuItem = $hotel->menuItems()->findOrFail($itemData['menu_item_id']);
                $qty = (int) $itemData['quantity'];
                $itemTotal = round($menuItem->price * $qty, 2);
                $itemGst = round(($itemTotal * $menuItem->gst_percentage) / 100, 2);

                RestaurantOrderItem::create([
                    'order_id' => $order->id,
                    'menu_item_id' => $menuItem->id,
                    'kot_number' => $kotNumber,
                    'item_name' => $menuItem->name,
                    'food_type' => $menuItem->food_type,
                    'quantity' => $qty,
                    'unit_price' => $menuItem->price,
                    'total_price' => $itemTotal,
                    'special_notes' => $itemData['special_notes'] ?? null,
                    'status' => RestaurantOrderItem::STATUS_PENDING,
                    'kot_printed_at' => Carbon::now(),
                ]);

                $addedSubtotal += $itemTotal;
                $addedTax += $itemGst;
            }

            $newSubtotal = (float) $order->subtotal + $addedSubtotal;
            $newTax = (float) $order->tax_amount + $addedTax;
            $newGrandTotal = $newSubtotal + $newTax - (float) $order->discount_amount;

            $order->update([
                'subtotal' => $newSubtotal,
                'tax_amount' => $newTax,
                'grand_total' => $newGrandTotal,
            ]);

            return response()->json([
                'success' => true,
                'message' => "Items punched under {$kotNumber}.",
                'order' => $order->load(['items', 'table']),
            ]);
        });
    }

    /**
     * Settle the order (Direct Cash/UPI/Card or Charge to Front Office Room Folio).
     */
    public function settleOrder(Request $request, string $id): JsonResponse
    {
        $hotel = $this->getHotel($request);
        $order = $hotel->restaurantOrders()->findOrFail($id);

        if ($order->status === RestaurantOrder::STATUS_SETTLED) {
            return response()->json([
                'success' => false,
                'message' => 'This order is already settled.',
            ], 422);
        }

        $validated = $request->validate([
            'settlement_method' => 'required|string|in:ROOM_FOLIO,CASH,UPI_QR,CARD',
            'room_id' => 'required_if:settlement_method,ROOM_FOLIO|nullable|uuid',
            'booking_id' => 'nullable|uuid',
            'discount_amount' => 'nullable|numeric|min:0',
            'transaction_reference' => 'nullable|string|max:100',
        ]);

        return DB::transaction(function () use ($hotel, $order, $validated) {
            $discount = isset($validated['discount_amount']) ? (float) $validated['discount_amount'] : (float) $order->discount_amount;
            $billTotal = (float) $order->subtotal + (float) $order->tax_amount;

            if ($discount > $billTotal) {
                return response()->json([
                    'success' => false,
                    'message' => "Discount cannot exceed the total bill amount (₹" . number_format($billTotal, 2) . ").",
                ], 422);
            }

            $grandTotal = max(0, $billTotal - $discount);

            $order->discount_amount = $discount;
            $order->grand_total = $grandTotal;
            $order->settlement_method = $validated['settlement_method'];
            $order->billed_at = $order->billed_at ?? Carbon::now();
            $order->settled_at = Carbon::now();

            // 1. Cross-Module Settlement: Charge to Room Folio
            if ($validated['settlement_method'] === RestaurantOrder::SETTLEMENT_ROOM_FOLIO) {
                $roomId = $validated['room_id'] ?? $order->room_id;
                $booking = null;

                if (!empty($validated['booking_id'])) {
                    $booking = $hotel->bookings()->findOrFail($validated['booking_id']);
                    if ($roomId && $booking->room_id !== $roomId) {
                        return response()->json([
                            'success' => false,
                            'message' => 'The specified booking does not match the specified room.',
                        ], 422);
                    }
                } elseif ($roomId) {
                    $booking = $hotel->bookings()
                        ->where('room_id', $roomId)
                        ->where('status', 'CHECKED_IN')
                        ->latest('check_in_at')
                        ->first();
                }

                if (!$booking || $booking->status !== 'CHECKED_IN') {
                    return response()->json([
                        'success' => false,
                        'message' => 'Cannot charge order to room folio because guest is not currently checked in.',
                    ], 422);
                }

                $tableLabel = $order->table ? " (Table {$order->table->table_no})" : '';
                $folioDescription = "Restaurant Dining POS - Order #{$order->order_number}{$tableLabel}";

                // Post Folio Item to Booking
                $folioItem = FolioItem::create([
                    'booking_id' => $booking->id,
                    'item_type' => 'FOOD_BEVERAGE',
                    'description' => $folioDescription,
                    'quantity' => 1,
                    'unit_price' => $grandTotal,
                    'total_price' => $grandTotal,
                    'charged_at' => Carbon::now(),
                ]);

                // Recalculate Booking Extra Charges & Balance
                $booking->recalculateTotals();

                $order->room_id = $roomId;
                $order->booking_id = $booking->id;
                $order->settlement_reference = "FOLIO-{$folioItem->id}";
            } else {
                $order->settlement_reference = $validated['transaction_reference'] ?? ('POS-' . strtoupper(Str::random(8)));
            }

            $order->status = RestaurantOrder::STATUS_SETTLED;
            $order->save();

            // Release table if order was dine-in
            if ($order->table) {
                $order->table->update(['status' => RestaurantTable::STATUS_AVAILABLE]);
            }

            return response()->json([
                'success' => true,
                'message' => "Order #{$order->order_number} settled successfully via {$order->settlement_method}.",
                'order' => $order->load(['table', 'room', 'booking.guest', 'items']),
            ]);
        });
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
