<?php

namespace Database\Seeders;

use App\Domain\Purchase\Models\Supplier;
use App\Domain\Restaurant\Models\RestaurantTable;
use App\Domain\Store\Models\Product;
use App\Domain\Tenancy\Models\Hotel;
use Illuminate\Database\Seeder;

class MasterDataSeeder extends Seeder
{
    /**
     * Run database seeds for Suppliers, Products, and Restaurant Tables
     * based on Book1.xlsx specification.
     */
    public function run(): void
    {
        $hotels = Hotel::all();

        foreach ($hotels as $hotel) {
            // 1. Seed Suppliers if none exist for this hotel
            if ($hotel->suppliers()->count() === 0) {
                $supplier1 = Supplier::create([
                    'hotel_id' => $hotel->id,
                    'firm_name' => 'Royal Agro & Provisions Pvt Ltd',
                    'address' => 'Plot 14, APMC Grain Market, Vashi, Navi Mumbai',
                    'contact_person' => 'Ramesh Gupta',
                    'mobile' => '+91 9823456789',
                    'email' => 'orders@royalagro.com',
                    'gst_no' => '27AABCR1234D1Z2',
                    'pan_no' => 'AABCR1234D',
                    'aadhar_no' => '5421-9876-1234',
                    'status' => 'Active',
                ]);

                $supplier2 = Supplier::create([
                    'hotel_id' => $hotel->id,
                    'firm_name' => 'Oceanic Seafood & Fresh Meats',
                    'address' => 'Shop 7, Fisheries Wharf, Panaji, Goa',
                    'contact_person' => 'Francis Fernandes',
                    'mobile' => '+91 9890123456',
                    'email' => 'sales@oceanicmeats.in',
                    'gst_no' => '30AACCO9876M1Z8',
                    'pan_no' => 'AACCO9876M',
                    'aadhar_no' => '3214-5678-9012',
                    'status' => 'Active',
                ]);

                $supplier3 = Supplier::create([
                    'hotel_id' => $hotel->id,
                    'firm_name' => 'Shivaji Crockery & Hotelware Suppliers',
                    'address' => 'Shop 22, Crawford Market, Fort, Mumbai',
                    'contact_person' => 'Vikram Joshi',
                    'mobile' => '+91 9811223344',
                    'email' => 'vikram@shivajicrockery.com',
                    'gst_no' => '27AABCJ4567K1Z3',
                    'pan_no' => 'AABCJ4567K',
                    'aadhar_no' => '7890-1234-5678',
                    'status' => 'Active',
                ]);
            } else {
                $supplier1 = $hotel->suppliers()->first();
                $supplier2 = $hotel->suppliers()->skip(1)->first() ?? $supplier1;
                $supplier3 = $hotel->suppliers()->skip(2)->first() ?? $supplier1;
            }

            // 2. Seed Products covering all categories from Book1.xlsx
            if ($hotel->products()->count() === 0) {
                $productsData = [
                    [
                        'supplier_id' => $supplier1?->id,
                        'category' => 'Grocery & Grains',
                        'name' => 'Basmati Rice Premium (Daawat Extra Long)',
                        'product_code' => 'PRD-GRN-101',
                        'description' => 'Aged premium long grain basmati rice for biryanis and pulao.',
                        'unit' => 'Kg',
                        'expiry_period' => '12/2026',
                        'rate' => 125.00,
                        'gst_percentage' => 5.00,
                        'opening_stock' => 500.00,
                        'current_stock' => 450.00,
                        'minimum_stock_qty' => 50.00,
                        'status' => 'Active',
                    ],
                    [
                        'supplier_id' => $supplier1?->id,
                        'category' => 'Vegetables & Fruits',
                        'name' => 'Fresh Farm Potatoes & Onions (Hybrid)',
                        'product_code' => 'PRD-VEG-102',
                        'description' => 'Grade A kitchen cooking staple roots.',
                        'unit' => 'Kg',
                        'expiry_period' => '11/2026',
                        'rate' => 38.00,
                        'gst_percentage' => 0.00,
                        'opening_stock' => 200.00,
                        'current_stock' => 180.00,
                        'minimum_stock_qty' => 30.00,
                        'status' => 'Active',
                    ],
                    [
                        'supplier_id' => $supplier1?->id,
                        'category' => 'Dairy Products',
                        'name' => 'Amul Pasteurised Cow Milk (1L Pouch)',
                        'product_code' => 'PRD-DRY-103',
                        'description' => 'Standard fresh cow milk for tea, coffee, and breakfast buffet.',
                        'unit' => 'Ltr',
                        'expiry_period' => '11/2026',
                        'rate' => 64.00,
                        'gst_percentage' => 5.00,
                        'opening_stock' => 100.00,
                        'current_stock' => 85.00,
                        'minimum_stock_qty' => 20.00,
                        'status' => 'Active',
                    ],
                    [
                        'supplier_id' => $supplier2?->id,
                        'category' => 'Meat & Seafood',
                        'name' => 'Fresh Boneless Chicken Breast & Curry Cut',
                        'product_code' => 'PRD-MET-104',
                        'description' => 'Hygienically vacuum packed poultry cuts.',
                        'unit' => 'Kg',
                        'expiry_period' => '11/2026',
                        'rate' => 260.00,
                        'gst_percentage' => 5.00,
                        'opening_stock' => 80.00,
                        'current_stock' => 65.00,
                        'minimum_stock_qty' => 15.00,
                        'status' => 'Active',
                    ],
                    [
                        'supplier_id' => $supplier1?->id,
                        'category' => 'Beverages',
                        'name' => 'Tata Gold Premium CTC Leaf Tea',
                        'product_code' => 'PRD-BEV-105',
                        'description' => 'Rich aroma CTC tea blend for hospitality beverage service.',
                        'unit' => 'Kg',
                        'expiry_period' => '05/2027',
                        'rate' => 480.00,
                        'gst_percentage' => 5.00,
                        'opening_stock' => 40.00,
                        'current_stock' => 36.00,
                        'minimum_stock_qty' => 10.00,
                        'status' => 'Active',
                    ],
                    [
                        'supplier_id' => $supplier1?->id,
                        'category' => 'Spices & Masalas',
                        'name' => 'Everest Shahi Garam Masala Powder (500g)',
                        'product_code' => 'PRD-SPC-106',
                        'description' => 'Authentic Indian blended spice mix.',
                        'unit' => 'Packet',
                        'expiry_period' => '10/2027',
                        'rate' => 210.00,
                        'gst_percentage' => 12.00,
                        'opening_stock' => 50.00,
                        'current_stock' => 42.00,
                        'minimum_stock_qty' => 10.00,
                        'status' => 'Active',
                    ],
                    [
                        'supplier_id' => $supplier3?->id,
                        'category' => 'Crockery',
                        'name' => 'Fine Porcelain Dinner Plate 11-inch (White Rim)',
                        'product_code' => 'PRD-CRK-107',
                        'description' => 'Chip-resistant restaurant table service bone china dinner plate.',
                        'unit' => 'Pcs',
                        'expiry_period' => 'N/A',
                        'rate' => 320.00,
                        'gst_percentage' => 18.00,
                        'opening_stock' => 120.00,
                        'current_stock' => 114.00,
                        'minimum_stock_qty' => 20.00,
                        'status' => 'Active',
                    ],
                    [
                        'supplier_id' => $supplier3?->id,
                        'category' => 'Other / Restaurant Supplies',
                        'name' => 'Premium 2-Ply Paper Napkins (Pack of 100)',
                        'product_code' => 'PRD-SUP-108',
                        'description' => 'Absorbent embossed dining paper napkins.',
                        'unit' => 'Packet',
                        'expiry_period' => 'N/A',
                        'rate' => 75.00,
                        'gst_percentage' => 18.00,
                        'opening_stock' => 150.00,
                        'current_stock' => 130.00,
                        'minimum_stock_qty' => 30.00,
                        'status' => 'Active',
                    ],
                ];

                foreach ($productsData as $prod) {
                    Product::create(array_merge($prod, ['hotel_id' => $hotel->id]));
                }
            }

            // 3. Seed Restaurant Tables for hotels
            if ($hotel->restaurantTables()->count() === 0) {
                $tablesData = [
                    ['table_no' => 'T-01', 'capacity' => 2, 'seating_area' => 'AC Dining Hall', 'status' => 'AVAILABLE'],
                    ['table_no' => 'T-02', 'capacity' => 4, 'seating_area' => 'AC Dining Hall', 'status' => 'OCCUPIED'],
                    ['table_no' => 'T-03', 'capacity' => 4, 'seating_area' => 'AC Dining Hall', 'status' => 'AVAILABLE'],
                    ['table_no' => 'T-04', 'capacity' => 6, 'seating_area' => 'Family Lounge', 'status' => 'AVAILABLE'],
                    ['table_no' => 'T-05', 'capacity' => 2, 'seating_area' => 'Sea View Terrace', 'status' => 'RESERVED'],
                    ['table_no' => 'T-06', 'capacity' => 8, 'seating_area' => 'VIP Private Dining', 'status' => 'AVAILABLE'],
                ];

                foreach ($tablesData as $tbl) {
                    RestaurantTable::create([
                        'hotel_id' => $hotel->id,
                        'table_no' => $tbl['table_no'],
                        'qr_code' => 'https://menu.hotelsaask.com/qr/' . $hotel->hotel_code . '/' . $tbl['table_no'],
                        'capacity' => $tbl['capacity'],
                        'seating_area' => $tbl['seating_area'],
                        'status' => $tbl['status'],
                        'notes' => 'Table configured with QR digital ordering.',
                    ]);
                }
            }
        }
    }
}
