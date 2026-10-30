<?php

namespace App\Domain\Restaurant\Contracts;

use App\Domain\Restaurant\Models\MenuItem;
use App\Domain\Restaurant\Models\RestaurantOrder;
use App\Domain\Restaurant\Models\RestaurantTable;
use App\Domain\Tenancy\Models\Hotel;
use App\Models\User;

interface RestaurantPosServiceInterface
{
    public function createTable(Hotel $hotel, array $data): RestaurantTable;

    public function updateTableStatus(RestaurantTable $table, string $status): RestaurantTable;

    public function createMenuItem(Hotel $hotel, array $data): MenuItem;

    public function updateMenuItem(MenuItem $item, array $data): MenuItem;

    public function createOrder(Hotel $hotel, array $data, ?User $actor = null): RestaurantOrder;

    public function addOrderItems(RestaurantOrder $order, array $data, ?User $actor = null): RestaurantOrder;

    public function settleOrder(RestaurantOrder $order, array $data, ?User $actor = null): RestaurantOrder;
}

