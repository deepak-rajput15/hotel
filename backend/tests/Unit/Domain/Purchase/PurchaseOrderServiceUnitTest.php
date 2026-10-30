<?php

namespace Tests\Unit\Domain\Purchase;

use App\Domain\Purchase\Contracts\PurchaseOrderServiceInterface;
use App\Domain\Purchase\Models\PurchaseOrder;
use App\Domain\Purchase\Models\Supplier;
use App\Domain\Store\Models\Product;
use App\Domain\Tenancy\Models\Hotel;
use App\Domain\Tenancy\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class PurchaseOrderServiceUnitTest extends TestCase
{
    use RefreshDatabase;

    protected Hotel $hotel;
    protected User $user;
    protected Supplier $supplier;
    protected Product $product;
    protected PurchaseOrderServiceInterface $purchaseService;

    protected function setUp(): void
    {
        parent::setUp();

        $org = Organization::create([
            'name' => 'Purchase Unit Org',
            'org_code' => 'ORG-PUR',
            'billing_email' => 'purchase@test.com',
            'slug' => 'org-pur',
        ]);

        $this->hotel = Hotel::create([
            'organization_id' => $org->id,
            'hotel_code' => 'HTL-PUR',
            'name' => 'Purchase Grand Hotel',
            'slug' => 'purchase-grand-hotel',
            'city' => 'Delhi',
        ]);

        $this->user = User::create([
            'name' => 'Procurement Officer',
            'email' => 'purchaser.unit@test.com',
            'password' => bcrypt('Secret@123'),
            'organization_id' => $org->id,
            'role_tier' => 'HOTEL_STAFF',
        ]);

        $this->supplier = Supplier::create([
            'hotel_id' => $this->hotel->id,
            'firm_name' => 'Apex Dairy Supplies',
            'contact_person' => 'Sanjay Verma',
            'mobile' => '9811223344',
        ]);

        $this->product = Product::create([
            'hotel_id' => $this->hotel->id,
            'product_code' => 'PRD-MILK-01',
            'name' => 'Full Cream Fresh Milk',
            'category' => 'Dairy & Refrigerated',
            'unit' => 'LITER',
            'current_stock' => 10.00,
            'batches' => [],
        ]);

        $this->purchaseService = app(PurchaseOrderServiceInterface::class);
    }

    public function test_can_create_po_and_receive_goods_with_synced_batches(): void
    {
        $order = $this->purchaseService->createPurchaseOrder($this->hotel, [
            'supplier_id' => $this->supplier->id,
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'quantity' => 50,
                    'unit_price' => 60.00,
                ],
            ],
        ], $this->user);

        $this->assertInstanceOf(PurchaseOrder::class, $order);
        $this->assertEquals(3000.00, (float) $order->subtotal);

        $poItem = $order->items->first();

        // Receive 50 liters via GRN
        $grnResult = $this->purchaseService->receiveGoods($order, [
            'received_date' => now()->format('Y-m-d'),
            'delivery_challan_no' => 'CHALLAN-9900',
            'items' => [
                [
                    'purchase_order_item_id' => $poItem->id,
                    'quantity_received' => 50,
                ],
            ],
        ], $this->user);

        $this->assertArrayHasKey('grn', $grnResult);
        $this->assertEquals('COMPLETED', $grnResult['order']->status);

        // Verify Product stock incremented from 10 to 60
        $product = $this->product->fresh();
        $this->assertEquals(60.00, (float) $product->current_stock);

        // Verify Batches are populated
        $this->assertNotEmpty($product->batches);
        $this->assertEquals(50.00, $product->batches[0]['quantity']);
    }

    public function test_cannot_receive_more_quantity_than_ordered_on_po(): void
    {
        $order = $this->purchaseService->createPurchaseOrder($this->hotel, [
            'supplier_id' => $this->supplier->id,
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'quantity' => 20,
                    'unit_price' => 50.00,
                ],
            ],
        ], $this->user);

        $poItem = $order->items->first();

        $this->expectException(ValidationException::class);

        // Over-receiving 30 liters when only 20 were ordered must be rejected
        $this->purchaseService->receiveGoods($order, [
            'received_date' => now()->format('Y-m-d'),
            'items' => [
                [
                    'purchase_order_item_id' => $poItem->id,
                    'quantity_received' => 30,
                ],
            ],
        ], $this->user);
    }
}
