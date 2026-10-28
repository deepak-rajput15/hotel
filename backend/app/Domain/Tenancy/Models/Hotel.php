<?php

namespace App\Domain\Tenancy\Models;

use App\Domain\Subscriptions\Models\HotelModuleSubscription;
use App\Domain\Subscriptions\Models\Module;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Hotel extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'organization_id',
        'hotel_code',
        'name',
        'slug',
        'email',
        'phone',
        'address',
        'city',
        'state',
        'country',
        'timezone',
        'currency',
        'status',
        'settings',
    ];

    protected $casts = [
        'settings' => 'array',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(HotelModuleSubscription::class);
    }

    public function modules(): BelongsToMany
    {
        return $this->belongsToMany(Module::class, 'hotel_module_subscriptions')
            ->withPivot(['status', 'starts_at', 'expires_at', 'settings'])
            ->withTimestamps();
    }

    public function activeSubscriptions(): HasMany
    {
        return $this->subscriptions()
            ->where('status', 'ACTIVE')
            ->where(function ($query) {
                $query->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            });
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_hotel_access')
            ->withPivot(['role_id', 'is_default'])
            ->withTimestamps();
    }

    public function userAccess(): HasMany
    {
        return $this->hasMany(UserHotelAccess::class);
    }

    public function rooms(): HasMany
    {
        return $this->hasMany(\App\Domain\FrontOffice\Models\Room::class);
    }

    public function guests(): HasMany
    {
        return $this->hasMany(\App\Domain\FrontOffice\Models\Guest::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(\App\Domain\FrontOffice\Models\Booking::class);
    }

    public function suppliers(): HasMany
    {
        return $this->hasMany(\App\Domain\Purchase\Models\Supplier::class);
    }

    public function purchaseOrders(): HasMany
    {
        return $this->hasMany(\App\Domain\Purchase\Models\PurchaseOrder::class);
    }

    public function goodsReceiptNotes(): HasMany
    {
        return $this->hasMany(\App\Domain\Purchase\Models\GoodsReceiptNote::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(\App\Domain\Store\Models\Product::class);
    }

    public function restaurantTables(): HasMany
    {
        return $this->hasMany(\App\Domain\Restaurant\Models\RestaurantTable::class);
    }

    public function menuCategories(): HasMany
    {
        return $this->hasMany(\App\Domain\Restaurant\Models\MenuCategory::class);
    }

    public function menuItems(): HasMany
    {
        return $this->hasMany(\App\Domain\Restaurant\Models\MenuItem::class);
    }

    public function restaurantOrders(): HasMany
    {
        return $this->hasMany(\App\Domain\Restaurant\Models\RestaurantOrder::class);
    }

    /**
     * Check if a module is currently active and subscribed for this hotel.
     */
    public function hasModule(string $moduleCode): bool
    {
        return $this->activeSubscriptions()
            ->whereHas('module', function ($q) use ($moduleCode) {
                $q->where('code', $moduleCode)->where('is_active', true);
            })
            ->exists();
    }
}
