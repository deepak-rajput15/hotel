<?php

namespace App\Domain\Store\Actions;

use App\Domain\Store\Models\Product;
use App\Domain\Tenancy\Models\Hotel;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AdjustStockAction
{
    /**
     * Adjust product stock level (GRN, Consumption, Spoilage, Audit).
     *
     * @throws ValidationException
     */
    public function execute(Hotel $hotel, string $productId, array $data, ?User $actor = null): array
    {
        return DB::transaction(function () use ($hotel, $productId, $data) {
            $product = $hotel->products()->where('id', $productId)->lockForUpdate()->firstOrFail();

            $oldStock = (float) $product->current_stock;
            $qty = (float) $data['quantity'];
            $batches = is_array($product->batches) ? $product->batches : [];

            if ($data['type'] === 'ADD') {
                $newStock = $oldStock + $qty;

                // If batches was empty but we had stock, seed existing stock batch
                if (empty($batches) && $oldStock > 0) {
                    $batches[] = [
                        'batch_no' => 'BAT-PREV-01',
                        'quantity' => $oldStock,
                        'unit' => $product->unit,
                        'expiry_period' => $product->expiry_period,
                        'received_at' => $product->created_at?->toIso8601String(),
                        'notes' => 'Existing Stock',
                    ];
                }

                $batchNo = !empty($data['batch_no']) ? $data['batch_no'] : ('BAT-' . strtoupper(substr(uniqid(), -6)));
                $batchExpiry = !empty($data['expiry_period']) ? $data['expiry_period'] : $product->expiry_period;

                $batches[] = [
                    'batch_no' => $batchNo,
                    'quantity' => $qty,
                    'unit' => $product->unit,
                    'expiry_period' => $batchExpiry,
                    'received_at' => now()->toIso8601String(),
                    'notes' => $data['notes'] ?? $data['reason'],
                ];
            } elseif ($data['type'] === 'SUBTRACT') {
                if ($oldStock < $qty) {
                    throw ValidationException::withMessages([
                        'quantity' => "Cannot subtract {$qty} {$product->unit}. Current stock is only {$oldStock} {$product->unit}.",
                    ]);
                }
                $newStock = $oldStock - $qty;

                // If specific batch requested
                if (!empty($data['batch_no'])) {
                    foreach ($batches as &$b) {
                        if (($b['batch_no'] ?? '') === $data['batch_no']) {
                            $bQty = (float) ($b['quantity'] ?? 0);
                            $b['quantity'] = max(0, round($bQty - $qty, 2));
                            break;
                        }
                    }
                    unset($b);
                } else {
                    // FEFO deduction: First Expired, First Out
                    usort($batches, function ($a, $b) {
                        $tA = Product::parseExpiryDate($a['expiry_period'] ?? null)?->timestamp ?? 9999999999;
                        $tB = Product::parseExpiryDate($b['expiry_period'] ?? null)?->timestamp ?? 9999999999;
                        return $tA <=> $tB;
                    });

                    $rem = $qty;
                    foreach ($batches as &$b) {
                        if ($rem <= 0) break;
                        $bQty = (float) ($b['quantity'] ?? 0);
                        if ($bQty <= 0) continue;
                        if ($bQty <= $rem) {
                            $rem -= $bQty;
                            $b['quantity'] = 0;
                        } else {
                            $b['quantity'] = round($bQty - $rem, 2);
                            $rem = 0;
                        }
                    }
                    unset($b);
                }

                // Filter out 0 qty batches
                $batches = array_values(array_filter($batches, fn($b) => (float)($b['quantity'] ?? 0) > 0));
            } else {
                $newStock = $qty;
                $batchNo = !empty($data['batch_no']) ? $data['batch_no'] : ('BAT-AUDIT-' . strtoupper(substr(uniqid(), -4)));
                $batches = [
                    [
                        'batch_no' => $batchNo,
                        'quantity' => $newStock,
                        'unit' => $product->unit,
                        'expiry_period' => !empty($data['expiry_period']) ? $data['expiry_period'] : $product->expiry_period,
                        'received_at' => now()->toIso8601String(),
                        'notes' => 'Physical Stock Audit / Reset',
                    ]
                ];
            }

            $product->current_stock = $newStock;
            $product->batches = $batches;
            $product->save();

            $expiryDetails = $product->computeExpiryDetails();
            $product->expiry_status = $expiryDetails['status'];
            $product->days_until_expiry = $expiryDetails['days_remaining'];
            $product->has_expired_batch = $expiryDetails['has_expired_batch'];
            $product->has_expiring_soon_batch = $expiryDetails['has_expiring_soon_batch'];
            $product->oldest_expiring_batch = $expiryDetails['oldest_expiring_batch'];
            $product->active_batches = $expiryDetails['batches'];

            return [
                'product' => $product,
                'adjustment' => [
                    'old_stock' => $oldStock,
                    'new_stock' => $newStock,
                    'type' => $data['type'],
                    'quantity' => $qty,
                    'reason' => $data['reason'],
                    'notes' => $data['notes'] ?? null,
                ],
            ];
        });
    }
}

