<?php

namespace App\Http\Controllers\Api\V1\Guest;

use App\Domain\FrontOffice\Models\Booking;
use App\Domain\FrontOffice\Models\Room;
use App\Domain\Restaurant\Contracts\RoomDiningGuestServiceInterface;
use App\Domain\Restaurant\Models\MenuCategory;
use App\Domain\Restaurant\Models\MenuItem;
use App\Domain\Restaurant\Models\RestaurantOrder;
use App\Domain\Tenancy\Models\Hotel;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Guest\PlaceRoomOrderRequest;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class RoomDiningGuestController extends Controller
{
    public function __construct(
        protected RoomDiningGuestServiceInterface $roomDiningService
    ) {}

    /**
     * Public Guest Endpoint: Get active menu and room info for In-Room Dining.
     */
    public function getRoomMenu(Request $request, string $hotelCode, string $roomNumber): JsonResponse
    {
        $hotel = Hotel::where('hotel_code', strtoupper($hotelCode))->first();

        if (!$hotel) {
            return response()->json([
                'success' => false,
                'error_code' => 'HOTEL_NOT_FOUND',
                'message' => "Hotel property with code '{$hotelCode}' was not found.",
            ], 404);
        }

        // Verify if restaurant module is subscribed for this hotel
        $hasRestaurant = $hotel->subscriptions()
            ->whereHas('module', function ($q) {
                $q->where('code', 'restaurant');
            })
            ->where('status', 'ACTIVE')
            ->exists();

        if (!$hasRestaurant) {
            return response()->json([
                'success' => false,
                'error_code' => 'RESTAURANT_MODULE_INACTIVE',
                'message' => "In-room dining service is currently not active for this hotel property.",
            ], 403);
        }

        $room = $hotel->rooms()->where('room_number', $roomNumber)->first();

        if (!$room) {
            return response()->json([
                'success' => false,
                'error_code' => 'ROOM_NOT_FOUND',
                'message' => "Room #{$roomNumber} does not exist at {$hotel->name}.",
            ], 404);
        }

        // Find active in-house booking for this room
        $booking = $hotel->bookings()
            ->where('room_id', $room->id)
            ->where('status', 'CHECKED_IN')
            ->with(['guest'])
            ->latest('check_in_at')
            ->first();

        $guestInfo = null;
        $canOrder = false;
        $statusMessage = "Room is ready for orders.";

        if ($booking && $booking->guest) {
            $canOrder = true;
            $firstName = $booking->guest->first_name;
            $lastInitial = $booking->guest->last_name ? ' ' . Str::substr($booking->guest->last_name, 0, 1) . '.' : '';
            $guestInfo = [
                'display_name' => $firstName . $lastInitial,
                'booking_number' => $booking->booking_number,
                'check_in_date' => $booking->check_in_at ? Carbon::parse($booking->check_in_at)->format('d M Y') : null,
            ];
        } else {
            $canOrder = false;
            $statusMessage = "Room #{$roomNumber} currently does not have an active checked-in guest. Please contact Front Desk to order.";
        }

        // Load Categories & Menu Items
        $categories = MenuCategory::where('hotel_id', $hotel->id)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'slug']);

        $menuItems = MenuItem::where('hotel_id', $hotel->id)
            ->where('is_available', true)
            ->orderBy('category_name')
            ->orderBy('name')
            ->get([
                'id',
                'category_id',
                'category_name',
                'item_code',
                'name',
                'description',
                'price',
                'gst_percentage',
                'food_type',
                'preparation_time_minutes',
                'image_url',
            ]);

        return response()->json([
            'success' => true,
            'data' => [
                'hotel' => [
                    'id' => $hotel->id,
                    'code' => $hotel->hotel_code,
                    'name' => $hotel->name,
                    'city' => $hotel->city,
                    'phone' => $hotel->phone,
                ],
                'room' => [
                    'id' => $room->id,
                    'room_number' => $room->room_number,
                    'room_type' => $room->room_type,
                    'floor' => $room->floor,
                ],
                'guest' => $guestInfo,
                'can_order' => $canOrder,
                'status_message' => $statusMessage,
                'categories' => $categories,
                'menu_items' => $menuItems,
            ],
        ]);
    }

    /**
     * Public Guest Endpoint: Submit an in-room dining order directly from phone.
     */
    public function placeRoomOrder(PlaceRoomOrderRequest $request, string $hotelCode, string $roomNumber): JsonResponse
    {
        $hotel = Hotel::where('hotel_code', strtoupper($hotelCode))->firstOrFail();
        $room = $hotel->rooms()->where('room_number', $roomNumber)->firstOrFail();

        // Check active booking
        $booking = $hotel->bookings()
            ->where('room_id', $room->id)
            ->where('status', 'CHECKED_IN')
            ->with(['guest'])
            ->latest('check_in_at')
            ->first();

        if (!$booking) {
            return response()->json([
                'success' => false,
                'error_code' => 'NO_ACTIVE_BOOKING',
                'message' => "Cannot place In-Room Dining order: Room #{$roomNumber} does not have an active checked-in guest.",
            ], 422);
        }

        $result = $this->roomDiningService->placeOrder($hotel, $room, $booking, $request->validated());
        $order = $result['order'];

        return response()->json([
            'success' => true,
            'message' => "Order #{$order->order_number} has been received by the kitchen for Room {$room->room_number}!",
            'data' => [
                'order_number' => $order->order_number,
                'room_number' => $room->room_number,
                'grand_total' => $result['grand_total'],
                'settlement_method' => $result['settlement_method'],
                'status' => 'RECEIVED',
                'estimated_minutes' => 25,
                'created_at' => $order->created_at->toIso8601String(),
            ],
        ], 201);
    }

    /**
     * Public Guest Endpoint: Real-time live tracking of room service order status.
     */
    public function trackOrderStatus(Request $request, string $orderNumber): JsonResponse
    {
        $order = RestaurantOrder::where('order_number', $orderNumber)
            ->with(['items', 'room:id,room_number,room_type', 'hotel:id,name,hotel_code,phone'])
            ->first();

        if (!$order) {
            return response()->json([
                'success' => false,
                'error_code' => 'ORDER_NOT_FOUND',
                'message' => "Order '{$orderNumber}' not found.",
            ], 404);
        }

        $totalItems = $order->items->count();
        $servedCount = $order->items->where('status', 'SERVED')->count();
        $readyCount = $order->items->where('status', 'READY')->count();
        $prepCount = $order->items->where('status', 'PREPARING')->count();

        $overallStep = 'RECEIVED';
        $stepIndex = 1;
        $statusLabel = 'Order Received & Sent to Kitchen';

        if ($servedCount === $totalItems && $totalItems > 0) {
            $overallStep = 'DELIVERED';
            $stepIndex = 4;
            $statusLabel = 'Delivered to Room';
        } elseif ($readyCount > 0) {
            $overallStep = 'OUT_FOR_DELIVERY';
            $stepIndex = 3;
            $statusLabel = 'Food Ready! Bearer is on the way to Room ' . ($order->room?->room_number ?? '');
        } elseif ($prepCount > 0) {
            $overallStep = 'PREPARING';
            $stepIndex = 2;
            $statusLabel = 'Chef is preparing your food in the kitchen';
        }

        return response()->json([
            'success' => true,
            'data' => [
                'order_number' => $order->order_number,
                'room_number' => $order->room?->room_number,
                'hotel_name' => $order->hotel?->name,
                'overall_step' => $overallStep,
                'step_index' => $stepIndex,
                'status_label' => $statusLabel,
                'subtotal' => (float) $order->subtotal,
                'tax_amount' => (float) $order->tax_amount,
                'grand_total' => (float) $order->grand_total,
                'settlement_method' => $order->settlement_method,
                'created_at' => $order->created_at->toIso8601String(),
                'items' => $order->items->map(function ($item) {
                    return [
                        'item_name' => $item->item_name,
                        'food_type' => $item->food_type,
                        'quantity' => $item->quantity,
                        'unit_price' => (float) $item->unit_price,
                        'total_price' => (float) $item->total_price,
                        'status' => $item->status,
                        'special_notes' => $item->special_notes,
                    ];
                }),
            ],
        ]);
    }
}
