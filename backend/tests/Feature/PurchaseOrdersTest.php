<?php

namespace Tests\Feature;

use App\Domain\Purchase\Models\PurchaseOrder;
use App\Domain\Purchase\Models\Supplier;
use App\Domain\Store\Models\Product;
use App\Domain\Subscriptions\Actions\AssignHotelModulesAction;
use App\Domain\Subscriptions\Models\Module;
use App\Domain\Tenancy\Models\Hotel;
use App\Domain\Tenancy\Models\Organization;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PurchaseOrdersTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $org;
    protected Hotel $hotel;
    protected User $owner;
    protected Supplier $supplier;
    protected Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->org = Organization::create([
            'org_code' => 'ORG-PUR-1',
            'name' => 'Grand Procurement Group',
            'billing_email' => 'finance@grandprocure.com',
            'status' => 'ACTIVE',
        ]);

        $this->hotel = Hotel::create([
            'organization_id' => $this->org->id,
            'hotel_code' => 'HTL-PUR-1',
            'name' => 'Grand Residency',
            'slug' => 'grand-residency',
            'city' => 'Delhi',
            'status' => 'ACTIVE',
        ]);

        Module::firstOrCreate(['code' => 'purchase'], [
            'name' => 'Purchase & Orders',
            'is_active' => true,
        ]);

        app(AssignHotelModulesAction::class)->execute($this->hotel, ['purchase']);

        $this->owner = User::create([
            'organization_id' => $this->org->id,
            'name' => 'Procurement Officer',
            'email' => 'purchaser@grandresidency.com',
            'password' => bcrypt('Password@123'),
            'is_platform_admin' => false,
            'is_org_owner' => true,
            'status' => 'ACTIVE',
        ]);

        $this->supplier = Supplier::create([
            'hotel_id' => $this->hotel->id,
            'firm_name' => 'National Agro Provisions Ltd',
            'mobile' => '+91 9811223344',
            'gst_no' => '07AABCN1234D1Z2',
            'status' => 'Active',
        ]);

        $this->product = Product::create([
            'hotel_id' => $this->hotel->id,
            'supplier_id' => $this->supplier->id,
            'category' => 'Grocery & Grains',
            'name' => 'Basmati Rice Premium (50kg Bag)',
            'product_code' => 'PRD-GRN-501',
            'unit' => 'Kg',
            'rate' => 100.00,
            'gst_percentage' => 5.00,
            'opening_stock' => 100.00,
            'current_stock' => 50.00,
            'minimum_stock_qty' => 40.00,
            'status' => 'Active',
        ]);
    }

    public function test_can_create_purchase_order_with_items_and_totals(): void
    {
        $response = $this->actingAs($this->owner)
            ->withHeader('X-Hotel-ID', $this->hotel->id)
            ->postJson('/api/v1/purchase/orders', [
                'supplier_id' => $this->supplier->id,
                'expected_delivery_date' => Carbon::now()->addDays(2)->toDateString(),
                'payment_terms' => 'Net 30 Days',
                'items' => [
                    [
                        'product_id' => $this->product->id,
                        'quantity' => 100, // 100 kg * 100 = 10,000 + 5% GST = 10,500
                        'unit_price' => 100.00,
                    ],
                ],
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'order' => [
                    'status' => 'ISSUED',
                    'subtotal' => 10000.00,
                    'tax_amount' => 500.00,
                    'grand_total' => 10500.00,
                ],
            ]);

        $this->assertDatabaseHas('purchase_orders', [
            'hotel_id' => $this->hotel->id,
            'supplier_id' => $this->supplier->id,
            'grand_total' => 10500.00,
        ]);
    }

    public function test_can_list_purchase_orders_and_procurement_metrics(): void
    {
        // Create sample PO
        $po = PurchaseOrder::create([
            'hotel_id' => $this->hotel->id,
            'supplier_id' => $this->supplier->id,
            'po_number' => 'PO-TEST-101',
            'status' => 'ISSUED',
            'subtotal' => 5000.00,
            'tax_amount' => 250.00,
            'grand_total' => 5250.00,
        ]);

        $response = $this->actingAs($this->owner)
            ->withHeader('X-Hotel-ID', $this->hotel->id)
            ->getJson('/api/v1/purchase/orders');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'summary' => [
                    'total_pos' => 1,
                    'total_procurement_value' => 5250.00,
                    'pending_deliveries' => 1,
                ],
            ]);
    }

    public function test_can_receive_goods_generating_grn_and_auto_incrementing_store_stock(): void
    {
        // 1. Create PO
        $poRes = $this->actingAs($this->owner)
            ->withHeader('X-Hotel-ID', $this->hotel->id)
            ->postJson('/api/v1/purchase/orders', [
                'supplier_id' => $this->supplier->id,
                'items' => [
                    ['product_id' => $this->product->id, 'quantity' => 100, 'unit_price' => 100.00],
                ],
            ]);

        $poId = $poRes->json('order.id');
        $poItemId = $poRes->json('order.items.0.id');

        $initialStock = (float) $this->product->fresh()->current_stock; // 50

        // 2. Receive delivery via GRN (receive 100 kg)
        $grnRes = $this->actingAs($this->owner)
            ->withHeader('X-Hotel-ID', $this->hotel->id)
            ->postJson("/api/v1/purchase/orders/{$poId}/receive-goods", [
                'delivery_challan_no' => 'DC-8899',
                'invoice_no' => 'INV-2026-77',
                'received_date' => Carbon::today()->toDateString(),
                'items' => [
                    [
                        'purchase_order_item_id' => $poItemId,
                        'quantity_received' => 100.00,
                    ],
                ],
            ]);

        $grnRes->assertStatus(201)
            ->assertJson([
                'success' => true,
                'order' => [
                    'status' => 'COMPLETED',
                ],
            ]);

        // 3. ASSERT: Store inventory stock automatically increased from 50 to 150!
        $refreshedProduct = $this->product->fresh();
        $this->assertEquals($initialStock + 100.00, (float) $refreshedProduct->current_stock);
        $this->assertNotEmpty($refreshedProduct->batches);
        $this->assertEquals(100.00, $refreshedProduct->batches[count($refreshedProduct->batches) - 1]['quantity']);

        // 4. ASSERT: GRN record exists in database
        $this->assertDatabaseHas('goods_receipt_notes', [
            'hotel_id' => $this->hotel->id,
            'purchase_order_id' => $poId,
            'delivery_challan_no' => 'DC-8899',
        ]);
    }

    public function test_hotel_without_purchase_module_is_forbidden(): void
    {
        app(AssignHotelModulesAction::class)->execute($this->hotel, []);

        $response = $this->actingAs($this->owner)
            ->withHeader('X-Hotel-ID', $this->hotel->id)
            ->getJson('/api/v1/purchase/orders');

        $response->assertStatus(403);
    }
}

