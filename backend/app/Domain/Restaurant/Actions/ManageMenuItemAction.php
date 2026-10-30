<?php

namespace App\Domain\Restaurant\Actions;

use App\Domain\Restaurant\Models\MenuCategory;
use App\Domain\Restaurant\Models\MenuItem;
use App\Domain\Tenancy\Models\Hotel;
use Illuminate\Support\Str;

class ManageMenuItemAction
{
    /**
     * Create a menu item with automatic category resolution.
     */
    public function createMenuItem(Hotel $hotel, array $data): MenuItem
    {
        $category = MenuCategory::firstOrCreate(
            ['hotel_id' => $hotel->id, 'name' => $data['category_name']],
            ['slug' => Str::slug($data['category_name']), 'sort_order' => 1, 'is_active' => true]
        );

        return MenuItem::create([
            'hotel_id' => $hotel->id,
            'category_id' => $category->id,
            'category_name' => $category->name,
            'item_code' => strtoupper($data['item_code']),
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'price' => $data['price'],
            'gst_percentage' => $data['gst_percentage'] ?? 5.00,
            'food_type' => $data['food_type'],
            'is_available' => $data['is_available'] ?? true,
            'preparation_time_minutes' => $data['preparation_time_minutes'] ?? 15,
        ]);
    }

    /**
     * Update menu item attributes.
     */
    public function updateMenuItem(MenuItem $item, array $data): MenuItem
    {
        $item->update($data);
        return $item;
    }
}

