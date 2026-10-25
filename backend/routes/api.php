<?php

use App\Http\Controllers\Api\V1\Admin\SuperAdminHotelController;
use App\Http\Controllers\Api\V1\Admin\SuperAdminModuleController;
use App\Http\Controllers\Api\V1\Admin\SuperAdminOrganizationController;
use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\Hotel\HotelModuleController;
use App\Http\Controllers\Api\V1\Modules\TestModuleController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Hotel SaaS API Routes (v1)
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    // 1. Authentication
    Route::post('/auth/login', [AuthController::class, 'login']);

    // 2. Protected Authenticated Routes
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me'])->middleware('tenant');
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        // Hotel & Module Navigation
        Route::get('/hotels/{hotelId?}/modules', [HotelModuleController::class, 'activeModules'])->middleware('tenant');

        // Module-Protected Operational Routes (Enforced via 'tenant' and 'module:{code}')
        Route::middleware('tenant')->group(function () {
            // Front Office routes
            Route::prefix('front-office')->middleware('module:front_office')->group(function () {
                Route::get('/dashboard', [TestModuleController::class, 'frontOfficeDashboard']);
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
