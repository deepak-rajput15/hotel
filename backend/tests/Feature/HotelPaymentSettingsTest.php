<?php

namespace Tests\Feature;

use App\Domain\Tenancy\Models\Hotel;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HotelPaymentSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected User $owner;
    protected User $cashier;
    protected Hotel $hotel;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        $this->owner = User::where('email', 'owner@apexhospitality.com')->first();
        $this->cashier = User::where('email', 'cashier.rahul@apexhospitality.com')->first();
        $this->hotel = Hotel::where('hotel_code', 'HTL-1002')->first();
    }

    public function test_can_get_hotel_upi_payment_settings(): void
    {
        $response = $this->actingAs($this->owner)
            ->withHeader('X-Hotel-Context', $this->hotel->id)
            ->getJson('/api/v1/hotel/payment-settings');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'hotel' => [
                    'id' => $this->hotel->id,
                    'hotel_code' => 'HTL-1002',
                ],
            ])
            ->assertJsonStructure([
                'settings' => [
                    'upi_id',
                    'upi_payee_name',
                    'upi_qr_image',
                    'is_configured',
                ],
            ]);
    }

    public function test_can_update_hotel_upi_id_and_payee_name(): void
    {
        $response = $this->actingAs($this->owner)
            ->withHeader('X-Hotel-Context', $this->hotel->id)
            ->putJson('/api/v1/hotel/payment-settings', [
                'upi_id' => 'apexseabreeze@icici',
                'upi_payee_name' => 'Apex Sea Breeze Goa Resort',
                'upi_qr_image' => 'https://example.com/qr-standee.png',
                'upi_merchant_code' => '7011',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'settings' => [
                    'upi_id' => 'apexseabreeze@icici',
                    'upi_payee_name' => 'Apex Sea Breeze Goa Resort',
                    'upi_qr_image' => 'https://example.com/qr-standee.png',
                    'is_configured' => true,
                ],
            ]);

        $this->hotel->refresh();
        $this->assertEquals('apexseabreeze@icici', $this->hotel->upi_id);
        $this->assertEquals('Apex Sea Breeze Goa Resort', $this->hotel->upi_payee_name);
        $this->assertEquals('https://example.com/qr-standee.png', $this->hotel->upi_qr_image);
    }

    public function test_rejects_invalid_upi_id_format(): void
    {
        $response = $this->actingAs($this->owner)
            ->withHeader('X-Hotel-Context', $this->hotel->id)
            ->putJson('/api/v1/hotel/payment-settings', [
                'upi_id' => 'invalid-upi-without-at',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['upi_id']);
    }
}
