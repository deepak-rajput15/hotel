<?php

use App\Http\Controllers\Api\V1\Admin\SuperAdminHotelController;
use App\Http\Controllers\Api\V1\Admin\SuperAdminModuleController;
use App\Http\Controllers\Api\V1\Admin\SuperAdminOrganizationController;
use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\Finance\ShiftHandoverController;
use App\Http\Controllers\Api\V1\FrontOffice\FrontOfficeController;
use App\Http\Controllers\Api\V1\Guest\RoomDiningGuestController;
use App\Http\Controllers\Api\V1\Hotel\HotelModuleController;
use App\Http\Controllers\Api\V1\Hotel\HotelStaffController;
use App\Http\Controllers\Api\V1\Kitchen\KitchenKdsController;
use App\Http\Controllers\Api\V1\Notifications\NotificationController;
use App\Http\Controllers\Api\V1\Notifications\WhatsAppController;
use App\Http\Controllers\Api\V1\Modules\TestModuleController;
use App\Http\Controllers\Api\V1\Purchase\PurchaseOrdersController;
use App\Http\Controllers\Api\V1\Reports\ReportsController;
use App\Http\Controllers\Api\V1\Restaurant\RestaurantPosController;
use App\Http\Controllers\Api\V1\Store\StoreInventoryController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    // 1. Authentication
    Route::post('/auth/login', [AuthController::class, 'login']);

    // Public In-Room Dining & Digital QR Menu for In-House Guests
    Route::prefix('public/room-dining')->group(function () {
        Route::get('/orders/{orderNumber}', [RoomDiningGuestController::class, 'trackOrderStatus']);
        Route::get('/{hotelCode}/{roomNumber}', [RoomDiningGuestController::class, 'getRoomMenu']);
        Route::post('/{hotelCode}/{roomNumber}/order', [RoomDiningGuestController::class, 'placeRoomOrder']);
    });

    // 2. Protected Authenticated Routes
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me'])->middleware('tenant');
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        // Hotel & Module Navigation
        Route::get('/hotels/{hotelId?}/modules', [HotelModuleController::class, 'activeModules'])->middleware('tenant');

        // Internal Notifications & Reminder Broadcasts
        Route::prefix('notifications')->group(function () {
            Route::get('/', [NotificationController::class, 'index']);
            Route::post('/', [NotificationController::class, 'store']);
            Route::post('/mark-all-read', [NotificationController::class, 'markAllAsRead']);
            Route::post('/{id}/read', [NotificationController::class, 'markAsRead']);
            Route::put('/{id}/toggle-banner', [NotificationController::class, 'toggleBanner']);
            Route::delete('/{id}', [NotificationController::class, 'destroy']);
        });

        // Staff & Module Access Management (Tier 2 Owner generates Tier 3 Staff logins)
        Route::get('/hotels/{hotelId}/staff', [HotelStaffController::class, 'index']);
        Route::post('/hotels/{hotelId}/staff', [HotelStaffController::class, 'store']);

        // Module-Protected Operational Routes (Enforced via 'tenant' and 'module:{code}')
        Route::middleware('tenant')->group(function () {
            // Front Office & Rooms routes (Guest Check-in, KYC Documents, Folio Billing, Room Rack & Creation)
            Route::prefix('front-office')->middleware('module:front_office,rooms')->group(function () {
                Route::get('/dashboard', [FrontOfficeController::class, 'overview']);
                Route::get('/overview', [FrontOfficeController::class, 'overview']);
                Route::get('/rooms', [FrontOfficeController::class, 'rooms']);
                Route::post('/rooms', [FrontOfficeController::class, 'storeRoom']);
                Route::put('/rooms/{roomId}', [FrontOfficeController::class, 'updateRoom']);
                Route::get('/rooms/calendar', [FrontOfficeController::class, 'calendar']);
                Route::put('/rooms/{roomId}/status', [FrontOfficeController::class, 'updateRoomStatus']);
                Route::get('/bookings', [FrontOfficeController::class, 'bookings']);
                Route::get('/bookings/{id}', [FrontOfficeController::class, 'bookingDetail']);
                Route::post('/check-in', [FrontOfficeController::class, 'checkIn']);
                Route::post('/bookings/{id}/confirm-check-in', [FrontOfficeController::class, 'confirmCheckIn']);
                Route::post('/bookings/{id}/folio-items', [FrontOfficeController::class, 'addFolioCharge']);
                Route::post('/bookings/{id}/payments', [FrontOfficeController::class, 'recordPayment']);
                Route::post('/bookings/{id}/check-out', [FrontOfficeController::class, 'checkOut']);
            });

            // Store & Inventory routes (Products, Stock adjustment, Low stock alerts, Suppliers)
            Route::prefix('store')->middleware('module:store,purchase')->group(function () {
                Route::get('/products', [StoreInventoryController::class, 'products']);
                Route::post('/products', [StoreInventoryController::class, 'storeProduct']);
                Route::put('/products/{id}', [StoreInventoryController::class, 'updateProduct']);
                Route::post('/products/{id}/adjust-stock', [StoreInventoryController::class, 'adjustStock']);
                Route::put('/products/{id}/batches/{batchNo}', [StoreInventoryController::class, 'updateBatch']);
                Route::get('/suppliers', [StoreInventoryController::class, 'suppliers']);
                Route::post('/suppliers', [StoreInventoryController::class, 'storeSupplier']);
            });

            // Purchase & Vendor Procurement routes (PO Generation, Vendor Tracking, GRN Receiving)
            Route::prefix('purchase')->middleware('module:purchase')->group(function () {
                Route::get('/orders', [PurchaseOrdersController::class, 'index']);
                Route::get('/orders/{id}', [PurchaseOrdersController::class, 'show']);
                Route::post('/orders', [PurchaseOrdersController::class, 'store']);
                Route::post('/orders/{id}/receive-goods', [PurchaseOrdersController::class, 'receiveGoods']);
                Route::get('/grn', [PurchaseOrdersController::class, 'grnList']);
            });

            // Restaurant & POS routes (Tables, Menu, KOT Orders, Settlement, Room Service)
            Route::prefix('restaurant')->middleware('module:restaurant')->group(function () {
                // Tables
                Route::get('/tables', [RestaurantPosController::class, 'tables']);
                Route::post('/tables', [RestaurantPosController::class, 'storeTable']);
                Route::put('/tables/{id}/status', [RestaurantPosController::class, 'updateTableStatus']);

                // Menu
                Route::get('/menu', [RestaurantPosController::class, 'menu']);
                Route::post('/menu/items', [RestaurantPosController::class, 'storeMenuItem']);
                Route::put('/menu/items/{id}', [RestaurantPosController::class, 'updateMenuItem']);

                // Orders & KOT
                Route::get('/orders', [RestaurantPosController::class, 'orders']);
                Route::get('/orders/{id}', [RestaurantPosController::class, 'orderDetail']);
                Route::post('/orders', [RestaurantPosController::class, 'createOrder']);
                Route::post('/orders/{id}/items', [RestaurantPosController::class, 'addOrderItems']);
                Route::post('/orders/{id}/settle', [RestaurantPosController::class, 'settleOrder']);

                // In-house rooms for Room Service / Folio Posting
                Route::get('/in-house-rooms', [RestaurantPosController::class, 'inHouseRooms']);
            });

            // Kitchen Display System (KDS) routes (Live KOTs, Preparation Queue, Item Status Updates)
            Route::prefix('kitchen')->middleware('module:kitchen')->group(function () {
                Route::get('/kots', [KitchenKdsController::class, 'liveKots']);
                Route::get('/summary', [KitchenKdsController::class, 'summary']);
                Route::put('/items/{itemId}/status', [KitchenKdsController::class, 'updateItemStatus']);
                Route::put('/kots/{orderId}/{kotNumber}/status', [KitchenKdsController::class, 'updateKotStatus']);
            });

            // Reports & Analytics routes (Occupancy, Revenue, Guest Ledger Night Audit, Inventory, CSV Export)
            Route::prefix('reports')->group(function () {
                Route::get('/overview', [ReportsController::class, 'overview']);
                Route::get('/guest-ledger', [ReportsController::class, 'guestLedger']);
                Route::get('/inventory', [ReportsController::class, 'inventory']);
                Route::get('/export', [ReportsController::class, 'exportCsv']);
            });

            // Shift Handover & Cash Drawer Register routes
            Route::prefix('shifts')->group(function () {
                Route::get('/current', [ShiftHandoverController::class, 'getCurrentShift']);
                Route::post('/open', [ShiftHandoverController::class, 'openShift']);
                Route::post('/{shiftId}/cash-transaction', [ShiftHandoverController::class, 'recordCashTransaction']);
                Route::post('/{shiftId}/close', [ShiftHandoverController::class, 'closeShift']);
                Route::get('/', [ShiftHandoverController::class, 'listShifts']);
                Route::get('/{shiftId}/slip', [ShiftHandoverController::class, 'getShiftSlip']);
            });

            // WhatsApp Automated Communication Engine routes
            Route::prefix('whatsapp')->group(function () {
                Route::get('/logs', [WhatsAppController::class, 'logs']);
                Route::post('/resend', [WhatsAppController::class, 'resend']);
                Route::post('/daily-summary', [WhatsAppController::class, 'sendDailySummary']);
            });
        });

        // 3. Platform Super Admin Routes (Our Company Internal Operations)
        Route::prefix('admin')->middleware('platform.admin')->group(function () {
            // Organizations & Owners Management
            Route::get('/organizations', [SuperAdminOrganizationController::class, 'index']);
            Route::post('/organizations', [SuperAdminOrganizationController::class, 'store']);
            Route::get('/organizations/{id}', [SuperAdminOrganizationController::class, 'show']);

            // Hotels Management
            Route::get('/hotels', [SuperAdminHotelController::class, 'index']);
            Route::post('/organizations/{orgId}/hotels', [SuperAdminHotelController::class, 'store']);
            Route::get('/hotels/{id}', [SuperAdminHotelController::class, 'show']);

            // Dynamic Module & Subscription Management (No code changes needed)
            Route::get('/modules', [SuperAdminModuleController::class, 'index']);
            Route::put('/hotels/{hotelId}/modules', [SuperAdminModuleController::class, 'updateHotelModules']);
        });
    });
});
