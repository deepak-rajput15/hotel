<?php

namespace Tests\Feature;

use App\Domain\Purchase\Models\Supplier;
use App\Domain\Store\Models\Product;
use App\Domain\Tenancy\Models\Hotel;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductExpiryAndBatchTrackingTest extends TestCase
{
    use RefreshDatabase;

    protected Hotel $hotel;
    protected User $storekeeper;
    protected Supplier $supplier;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\DatabaseSeeder::class);

        $this->hotel = Hotel::where('hotel_code', 'HTL-1003')->firstOrFail();
        $this->storekeeper = User::where('email', 'store.amit@apexhospitality.com')->firstOrFail();
        $this->supplier = Supplier::where('hotel_id', $this->hotel->id)->firstOrFail();
    }

    public function test_product_expiry_details_and_status_computation(): void
    {
        // 1. Expired product (e.g. 09/2026 or 2024)
        $expiredProduct = Product::create([
            'hotel_id' => $this->hotel->id,
            'supplier_id' => $this->supplier->id,
            'category' => 'Dairy Products',
            'name' => 'Expired Butter 500g',
            'product_code' => 'PRD-DAI-EXP',
            'unit' => 'Pack',
            'expiry_period' => '09/2026', // Past
            'rate' => 250.00,
            'opening_stock' => 10,
            'current_stock' => 10,
            'minimum_stock_qty' => 5,
        ]);

        $details = $expiredProduct->computeExpiryDetails();
        $this->assertEquals('EXPIRED', $details['status']);

        // 2. Product with older expired batch while main product expiry is in 2027
        $multiBatchProduct = Product::create([
            'hotel_id' => $this->hotel->id,
            'supplier_id' => $this->supplier->id,
            'category' => 'Grocery & Grains',
            'name' => 'Basmati Rice Multi-Batch',
            'product_code' => 'PRD-GRN-MB',
            'unit' => 'Kg',
            'expiry_period' => '12/2027', // Valid
            'rate' => 110.00,
            'opening_stock' => 50,
            'current_stock' => 50,
            'minimum_stock_qty' => 10,
            'batches' => [
                [
                    'batch_no' => 'BAT-OLD-01',
                    'quantity' => 15,
                    'expiry_period' => '08/2026', // Expired!
                    'unit' => 'Kg',
                ],
                [
                    'batch_no' => 'BAT-NEW-02',
                    'quantity' => 35,
                    'expiry_period' => '12/2027', // Valid
                    'unit' => 'Kg',
                ],
            ],
        ]);

        $mbDetails = $multiBatchProduct->computeExpiryDetails();
        $this->assertEquals('EXPIRED', $mbDetails['status']);
        $this->assertTrue($mbDetails['has_expired_batch']);
        $this->assertNotNull($mbDetails['oldest_expiring_batch']);
        $this->assertEquals('BAT-OLD-01', $mbDetails['oldest_expiring_batch']['batch_no']);
    }

    public function test_storekeeper_adjust_stock_with_batch_and_fefo_deduction(): void
    {
        $product = Product::create([
            'hotel_id' => $this->hotel->id,
            'supplier_id' => $this->supplier->id,
            'category' => 'Grocery & Grains',
            'name' => 'Premium Sona Masoori Rice',
            'product_code' => 'PRD-GRN-999',
            'unit' => 'Kg',
            'expiry_period' => '10/2026', // Old batch
            'rate' => 80.00,
            'opening_stock' => 20,
            'current_stock' => 20,
            'minimum_stock_qty' => 10,
            'batches' => [
                [
                    'batch_no' => 'BAT-OLD-20',
                    'quantity' => 20,
                    'expiry_period' => '10/2026',
                    'unit' => 'Kg',
                ]
            ],
        ]);

        // Add new batch of 30 Kg with expiry 12/2027
        $response = $this->actingAs($this->storekeeper)
            ->withHeaders(['X-Hotel-Context' => $this->hotel->id])
            ->postJson("/api/v1/store/products/{$product->id}/adjust-stock", [
                'type' => 'ADD',
                'quantity' => 30,
                'reason' => 'Vendor Delivery GRN',
                'batch_no' => 'BAT-NEW-30',
                'expiry_period' => '12/2027',
            ]);

        $response->assertOk();
        $product->refresh();
        $this->assertEquals(50, (float) $product->current_stock);
        $this->assertCount(2, $product->batches);

        // Deduct 25 Kg for Kitchen Requisition (FEFO consumes 20 Kg old batch first, then 5 from new batch)
        $subResponse = $this->actingAs($this->storekeeper)
            ->withHeaders(['X-Hotel-Context' => $this->hotel->id])
            ->postJson("/api/v1/store/products/{$product->id}/adjust-stock", [
                'type' => 'SUBTRACT',
                'quantity' => 25,
                'reason' => 'Kitchen Requisition',
            ]);

        $subResponse->assertOk();
        $product->refresh();
        $this->assertEquals(25, (float) $product->current_stock);

        // Only the new batch should remain with 25 Kg
        $this->assertCount(1, $product->batches);
        $this->assertEquals('BAT-NEW-30', $product->batches[0]['batch_no']);
        $this->assertEquals(25, (float) $product->batches[0]['quantity']);
    }

    public function test_api_products_list_returns_expiry_metrics(): void
    {
        Product::create([
            'hotel_id' => $this->hotel->id,
            'supplier_id' => $this->supplier->id,
            'category' => 'Spices & Masalas',
            'name' => 'Expired Turmeric Powder',
            'product_code' => 'PRD-SPI-01',
            'unit' => 'Kg',
            'expiry_period' => '05/2026', // Expired
            'rate' => 150.00,
            'opening_stock' => 10,
            'current_stock' => 10,
            'minimum_stock_qty' => 5,
        ]);

        $response = $this->actingAs($this->storekeeper)
            ->withHeaders(['X-Hotel-Context' => $this->hotel->id])
            ->getJson('/api/v1/store/products');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'metrics' => [
                    'total_products',
                    'low_stock_count',
                    'expired_count',
                    'expiring_soon_count',
                    'total_stock_value',
                    'active_suppliers',
                ],
                'products',
            ]);

        $this->assertGreaterThanOrEqual(1, $response->json('metrics.expired_count'));
    }
}
