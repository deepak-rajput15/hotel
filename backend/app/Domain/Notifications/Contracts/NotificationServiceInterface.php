<?php

namespace App\Domain\Notifications\Contracts;

use App\Domain\Notifications\Models\InternalNotification;
use App\Models\User;

interface NotificationServiceInterface
{
    public function broadcast(User $user, array $data): InternalNotification;
}

