<?php

namespace App\Providers;

use App\Domain\Access\Contracts\HotelStaffServiceInterface;
use App\Domain\Access\Services\HotelStaffService;
use App\Domain\Finance\Contracts\ShiftHandoverServiceInterface;
use App\Domain\Finance\Services\ShiftHandoverService;
use App\Domain\FrontOffice\Contracts\FrontOfficeServiceInterface;
use App\Domain\FrontOffice\Contracts\LostAndFoundServiceInterface;
use App\Domain\FrontOffice\Services\FrontOfficeService;
use App\Domain\FrontOffice\Services\LostAndFoundService;
use App\Domain\Kitchen\Contracts\KitchenKdsServiceInterface;
use App\Domain\Kitchen\Services\KitchenKdsService;
use App\Domain\Notifications\Contracts\NotificationServiceInterface;
use App\Domain\Notifications\Services\NotificationService;
use App\Domain\Purchase\Contracts\PurchaseOrderServiceInterface;
use App\Domain\Purchase\Services\PurchaseOrderService;
use App\Domain\Restaurant\Contracts\RestaurantPosServiceInterface;
use App\Domain\Restaurant\Contracts\RoomDiningGuestServiceInterface;
use App\Domain\Restaurant\Services\RestaurantPosService;
use App\Domain\Restaurant\Services\RoomDiningGuestService;
use App\Domain\Store\Contracts\StoreInventoryServiceInterface;
use App\Domain\Store\Services\StoreInventoryService;
use App\Domain\Tenancy\Contracts\HotelPaymentSettingServiceInterface;
use App\Domain\Tenancy\Services\HotelPaymentSettingService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * All of the container bindings that should be registered.
     */
    public array $bindings = [
        FrontOfficeServiceInterface::class => FrontOfficeService::class,
        LostAndFoundServiceInterface::class => LostAndFoundService::class,
        RestaurantPosServiceInterface::class => RestaurantPosService::class,
        RoomDiningGuestServiceInterface::class => RoomDiningGuestService::class,
        StoreInventoryServiceInterface::class => StoreInventoryService::class,
        PurchaseOrderServiceInterface::class => PurchaseOrderService::class,
        ShiftHandoverServiceInterface::class => ShiftHandoverService::class,
        KitchenKdsServiceInterface::class => KitchenKdsService::class,
        HotelStaffServiceInterface::class => HotelStaffService::class,
        HotelPaymentSettingServiceInterface::class => HotelPaymentSettingService::class,
        NotificationServiceInterface::class => NotificationService::class,
    ];

    /**
     * Register any application services.
     */
    public function register(): void
    {
        foreach ($this->bindings as $abstract => $concrete) {
            $this->app->bind($abstract, $concrete);
        }
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
