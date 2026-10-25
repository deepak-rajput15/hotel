<?php

namespace App\Domain\Tenancy\Scopes;

use App\Domain\Tenancy\Models\Hotel;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class HotelScope implements Scope
{
    /**
     * Apply the scope to a given Eloquent query builder.
     */
    public function apply(Builder $builder, Model $model): void
    {
        if (app()->bound('current_hotel')) {
            $hotel = app('current_hotel');
            if ($hotel instanceof Hotel) {
                $builder->where($model->getTable() . '.hotel_id', $hotel->id);
            }
        }
    }
}
