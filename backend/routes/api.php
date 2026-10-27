<?php

use App\Http\Controllers\Api\V1\Admin\SuperAdminHotelController;
use App\Http\Controllers\Api\V1\Admin\SuperAdminModuleController;
use App\Http\Controllers\Api\V1\Admin\SuperAdminOrganizationController;
use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\FrontOffice\FrontOfficeController;
use App\Http\Controllers\Api\V1\Hotel\HotelModuleController;
use App\Http\Controllers\Api\V1\Hotel\HotelStaffController;
use App\Http\Controllers\Api\V1\Modules\TestModuleController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Hotel SaaS API Routes (v1)
|--------------------------------------------------------------------------
*/

use App\Http\Controllers\Api\V1\Store\StoreInventoryController;

Route::prefix('v1')->group(function () {

    Route::get('/debug-db', function () {
        try {
            \Illuminate\Support\Facades\DB::connection()->getPdo();
            $driver = \Illuminate\Support\Facades\DB::connection()->getDriverName();
            $dbName = \Illuminate\Support\Facades\DB::connection()->getDatabaseName();
            $usersCount = \App\Models\User::count();
            return response()->json([
                'status' => 'connected',
                'driver' => $driver,
                'database' => $dbName,
                'users_count' => $usersCount,
                'app_key_set' => !empty(config('app.key')),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'file' => $e->getFile() . ':' . $e->getLine(),
            ], 500);
        }
    });

    // 1. Authentication
    Route::post('/auth/login', [AuthController::class, 'login']);

    // 2. Protected Authenticated Routes
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me'])->middleware('tenant');
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        // Hotel & Module Navigation
        Route::get('/hotels/{hotelId?}/modules', [HotelModuleController::class, 'activeModules'])->middleware('tenant');

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
                Route::get('/suppliers', [StoreInventoryController::class, 'suppliers']);
                Route::post('/suppliers', [StoreInventoryController::class, 'storeSupplier']);
            });

            // Restaurant routes
            Route::prefix('restaurant')->middleware('module:restaurant')->group(function () {
                Route::get('/orders', [TestModuleController::class, 'restaurantOrders']);
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
