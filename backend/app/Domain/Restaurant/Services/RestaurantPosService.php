<?php

namespace App\Domain\Restaurant\Services;

use App\Domain\Restaurant\Actions\AddRestaurantOrderItemsAction;
use App\Domain\Restaurant\Actions\CreateRestaurantOrderAction;
use App\Domain\Restaurant\Actions\ManageMenuItemAction;
use App\Domain\Restaurant\Actions\ManageRestaurantTableAction;
use App\Domain\Restaurant\Actions\SettleRestaurantOrderAction;
use App\Domain\Restaurant\Contracts\RestaurantPosServiceInterface;
use App\Domain\Restaurant\Models\MenuItem;
use App\Domain\Restaurant\Models\RestaurantOrder;
use App\Domain\Restaurant\Models\RestaurantTable;
use App\Domain\Tenancy\Models\Hotel;
use App\Models\User;

class RestaurantPosService implements RestaurantPosServiceInterface
{
    public function __construct(
        protected ManageRestaurantTableAction $manageTableAction,
        protected ManageMenuItemAction $manageMenuItemAction,
        protected CreateRestaurantOrderAction $createOrderAction,
        protected AddRestaurantOrderItemsAction $addOrderItemsAction,
        protected SettleRestaurantOrderAction $settleOrderAction,
    ) {}

    public function createTable(Hotel $hotel, array $data): RestaurantTable
    {
        return $this->manageTableAction->createTable($hotel, $data);
    }

    public function updateTableStatus(RestaurantTable $table, string $status): RestaurantTable
    {
        return $this->manageTableAction->updateStatus($table, $status);
    }

    public function createMenuItem(Hotel $hotel, array $data): MenuItem
    {
        return $this->manageMenuItemAction->createMenuItem($hotel, $data);
    }

    public function updateMenuItem(MenuItem $item, array $data): MenuItem
    {
        return $this->manageMenuItemAction->updateMenuItem($item, $data);
    }

    public function createOrder(Hotel $hotel, array $data, ?User $actor = null): RestaurantOrder
    {
        return $this->createOrderAction->execute($hotel, $data, $actor);
    }

    public function addOrderItems(RestaurantOrder $order, array $data, ?User $actor = null): RestaurantOrder
    {
        return $this->addOrderItemsAction->execute($order, $data, $actor);
    }

    public function settleOrder(RestaurantOrder $order, array $data, ?User $actor = null): RestaurantOrder
    {
        return $this->settleOrderAction->execute($order, $data, $actor);
    }
}

