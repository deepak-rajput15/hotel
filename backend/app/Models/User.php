<?php

namespace App\Models;

use App\Domain\Tenancy\Models\Hotel;
use App\Domain\Tenancy\Models\Organization;
use App\Domain\Tenancy\Models\UserHotelAccess;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasUuids, Notifiable, SoftDeletes;

    protected $fillable = [
        'organization_id',
        'name',
        'email',
        'phone',
        'password',
        'is_platform_admin',
        'is_org_owner',
        'status',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_platform_admin' => 'boolean',
            'is_org_owner' => 'boolean',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function hotelAccess(): HasMany
    {
        return $this->hasMany(UserHotelAccess::class);
    }

    public function hotels(): BelongsToMany
    {
        return $this->belongsToMany(Hotel::class, 'user_hotel_access')
            ->withPivot(['role_id', 'is_default'])
            ->withTimestamps();
    }

    public function isPlatformAdmin(): bool
    {
        return $this->is_platform_admin === true;
    }

    public function isOrgOwner(): bool
    {
        return $this->is_org_owner === true;
    }

    public function hasAccessToHotel(string $hotelId): bool
    {
        if ($this->isPlatformAdmin()) {
            return true;
        }

        // If organization owner, can access any hotel under their organization
        if ($this->isOrgOwner() && $this->organization_id) {
            return Hotel::where('id', $hotelId)
                ->where('organization_id', $this->organization_id)
                ->exists();
        }

        // Staff members: check explicit hotel assignment
        return $this->hotelAccess()->where('hotel_id', $hotelId)->exists();
    }
}
