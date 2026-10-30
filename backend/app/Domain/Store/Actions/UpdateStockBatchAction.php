<?php

namespace App\Domain\Store\Actions;

use App\Domain\Store\Models\Product;
use Illuminate\Validation\ValidationException;

class UpdateStockBatchAction
{
    /**
     * Update an individual stock batch and synchronize product expiry date.
     *
     * @throws ValidationException
     */
    public function execute(Product $product, string $batchNo, array $data): Product
    {
        $batches = is_array($product->batches) ? $product->batches : [];
        $found = false;

        foreach ($batches as &$b) {
            if (($b['batch_no'] ?? '') === $batchNo) {
                $b['expiry_period'] = $data['expiry_period'];
                if (isset($data['notes'])) {
                    $b['notes'] = $data['notes'];
                }
                $found = true;
                break;
            }
        }
        unset($b);

        if (!$found) {
            abort(404, "Batch '{$batchNo}' not found on product '{$product->name}'.");
        }

        // Keep product expiry_period in sync with earliest active batch
        $earliestExpiry = $data['expiry_period'];
        $earliestTimestamp = null;
        foreach ($batches as $b) {
            $p = $b['expiry_period'] ?? null;
            $d = Product::parseExpiryDate($p);
            if ($d && ($earliestTimestamp === null || $d->timestamp < $earliestTimestamp)) {
                $earliestTimestamp = $d->timestamp;
                $earliestExpiry = $p;
            }
        }
        if ($earliestExpiry) {
            $product->expiry_period = $earliestExpiry;
        }

        $product->batches = $batches;
        $product->save();

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

