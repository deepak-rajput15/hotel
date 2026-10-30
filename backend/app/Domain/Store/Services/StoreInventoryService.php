<?php

namespace App\Domain\Store\Services;

use App\Domain\Purchase\Models\Supplier;
use App\Domain\Store\Actions\AdjustStockAction;
use App\Domain\Store\Actions\ManageProductAction;
use App\Domain\Store\Actions\ManageSupplierAction;
use App\Domain\Store\Actions\UpdateStockBatchAction;
use App\Domain\Store\Contracts\StoreInventoryServiceInterface;
use App\Domain\Store\Models\Product;
use App\Domain\Tenancy\Models\Hotel;
use App\Models\User;

class StoreInventoryService implements StoreInventoryServiceInterface
{
    public function __construct(
        protected ManageProductAction $manageProductAction,
        protected UpdateStockBatchAction $updateStockBatchAction,
        protected AdjustStockAction $adjustStockAction,
        protected ManageSupplierAction $manageSupplierAction,
    ) {}

    public function createProduct(Hotel $hotel, array $data): Product
    {
        return $this->manageProductAction->createProduct($hotel, $data);
    }

    public function updateProduct(Product $product, array $data): Product
    {
        return $this->manageProductAction->updateProduct($product, $data);
    }

    public function updateBatch(Product $product, string $batchNo, array $data): Product
    {
        return $this->updateStockBatchAction->execute($product, $batchNo, $data);
    }

    public function adjustStock(Hotel $hotel, string $productId, array $data, ?User $actor = null): array
    {
        return $this->adjustStockAction->execute($hotel, $productId, $data, $actor);
    }

    public function createSupplier(Hotel $hotel, array $data): Supplier
    {
        return $this->manageSupplierAction->createSupplier($hotel, $data);
    }
}

