<?php

namespace App\Domain\Tenancy\Traits;

use App\Domain\Tenancy\Models\Hotel;
use App\Domain\Tenancy\Scopes\HotelScope;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait BelongsToHotel
{
    /**
     * Boot the trait and apply the global HotelScope.
     */
    protected static function bootBelongsToHotel(): void
    {
        static::addGlobalScope(new HotelScope());

        static::creating(function ($model) {
            if (empty($model->hotel_id) && app()->bound('current_hotel')) {
                $hotel = app('current_hotel');
                if ($hotel instanceof Hotel) {
                    $model->hotel_id = $hotel->id;
                }
            }
        });
    }

    public function hotel(): BelongsTo
    {
        return $this->belongsTo(Hotel::class);
    }
}
