<?php

namespace App\Domain\Restaurant\Actions;

use App\Domain\Restaurant\Models\RestaurantTable;
use App\Domain\Tenancy\Models\Hotel;

class ManageRestaurantTableAction
{
    /**
     * Create a new dining table with unique QR code.
     */
    public function createTable(Hotel $hotel, array $data): RestaurantTable
    {
        $qrUrl = "https://menu.hotelsaask.com/qr/{$hotel->hotel_code}/" . urlencode($data['table_no']);

        return RestaurantTable::create([
            'hotel_id' => $hotel->id,
            'table_no' => $data['table_no'],
            'capacity' => $data['capacity'],
            'seating_area' => $data['seating_area'],
            'status' => RestaurantTable::STATUS_AVAILABLE,
            'qr_code' => $qrUrl,
            'notes' => $data['notes'] ?? null,
        ]);
    }

    /**
     * Update dining table status.
     */
    public function updateStatus(RestaurantTable $table, string $status): RestaurantTable
    {
        $table->update(['status' => $status]);
        return $table;
    }
}

