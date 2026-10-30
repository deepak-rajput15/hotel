<?php

namespace App\Domain\Store\Actions;

use App\Domain\Store\Models\Product;
use App\Domain\Tenancy\Models\Hotel;

class ManageProductAction
{
    /**
     * Create a new inventory product with initial opening stock batches.
     */
    public function createProduct(Hotel $hotel, array $data): Product
    {
        $initialBatches = [];
        if ((float) $data['opening_stock'] > 0) {
            $initialBatches[] = [
                'batch_no' => 'BAT-' . strtoupper(substr(uniqid(), -5)),
                'quantity' => (float) $data['opening_stock'],
                'unit' => $data['unit'],
                'expiry_period' => $data['expiry_period'] ?? null,
                'received_at' => now()->toIso8601String(),
                'notes' => 'Opening Stock',
            ];
        }

        $product = $hotel->products()->create([
            'supplier_id' => $data['supplier_id'] ?? null,
            'category' => $data['category'],
            'name' => $data['name'],
            'product_code' => $data['product_code'],
            'description' => $data['description'] ?? null,
            'unit' => $data['unit'],
            'expiry_period' => $data['expiry_period'] ?? null,
            'rate' => $data['rate'],
            'gst_percentage' => $data['gst_percentage'] ?? 0.00,
            'opening_stock' => $data['opening_stock'],
            'current_stock' => $data['opening_stock'],
            'minimum_stock_qty' => $data['minimum_stock_qty'] ?? 0.00,
            'batches' => $initialBatches,
            'status' => $data['status'] ?? 'Active',
        ]);

        return $product->load('supplier');
    }

    /**
     * Update an existing product and synchronize batch expiry dates if needed.
     */
    public function updateProduct(Product $product, array $data): Product
    {
        $oldExpiry = $product->expiry_period;
        $product->update($data);

        // If expiry_period changed, synchronize existing batches that belonged to the initial/existing stock
        if (isset($data['expiry_period']) && $data['expiry_period'] !== $oldExpiry) {
            $batches = is_array($product->batches) ? $product->batches : [];
            $newExpiry = $data['expiry_period'];
            $modified = false;

            foreach ($batches as &$b) {
                if (($b['expiry_period'] ?? '') === $oldExpiry || ($b['notes'] ?? '') === 'Existing Stock' || ($b['notes'] ?? '') === 'Initial Stock' || ($b['notes'] ?? '') === 'Opening Stock') {
                    $b['expiry_period'] = $newExpiry;
                    $modified = true;
                }
            }
            unset($b);

            if ($modified) {
                $product->batches = $batches;
                $product->save();
            }
        }

        $product->load('supplier');

        $expiryDetails = $product->computeExpiryDetails();
        $product->expiry_status = $expiryDetails['status'];
        $product->days_until_expiry = $expiryDetails['days_remaining'];
        $product->has_expired_batch = $expiryDetails['has_expired_batch'];
        $product->has_expiring_soon_batch = $expiryDetails['has_expiring_soon_batch'];
        $product->oldest_expiring_batch = $expiryDetails['oldest_expiring_batch'];
        $product->active_batches = $expiryDetails['batches'];

        return $product;
    }
}

