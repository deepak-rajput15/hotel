<?php

namespace App\Domain\Store\Contracts;

use App\Domain\Purchase\Models\Supplier;
use App\Domain\Store\Models\Product;
use App\Domain\Tenancy\Models\Hotel;
use App\Models\User;

interface StoreInventoryServiceInterface
{
    public function createProduct(Hotel $hotel, array $data): Product;

    public function updateProduct(Product $product, array $data): Product;

    public function updateBatch(Product $product, string $batchNo, array $data): Product;

    public function adjustStock(Hotel $hotel, string $productId, array $data, ?User $actor = null): array;

    public function createSupplier(Hotel $hotel, array $data): Supplier;
}

