<?php

namespace App\Domain\Subscriptions\Models;

use App\Domain\Tenancy\Models\Hotel;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class SubscriptionPackage extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'subscription_packages';

    protected $fillable = [
        'name',
        'slug',
        'description',
        'monthly_price',
        'yearly_price',
        'onetime_price',
        'setup_fee',
        'currency',
        'billing_cycle',
        'max_rooms',
        'max_staff_accounts',
        'max_pos_terminals',
        'included_modules',
        'features_list',
        'is_featured',
        'badge_text',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'monthly_price' => 'decimal:2',
        'yearly_price' => 'decimal:2',
        'onetime_price' => 'decimal:2',
        'setup_fee' => 'decimal:2',
        'max_rooms' => 'integer',
        'max_staff_accounts' => 'integer',
        'max_pos_terminals' => 'integer',
        'included_modules' => 'array',
        'features_list' => 'array',
        'is_featured' => 'boolean',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function hotelSubscriptions(): HasMany
    {
        return $this->hasMany(HotelSubscription::class, 'package_id');
    }

    public function activeHotelsCount(): int
    {
        return $this->hotelSubscriptions()->where('status', 'ACTIVE')->count();
    }
}
