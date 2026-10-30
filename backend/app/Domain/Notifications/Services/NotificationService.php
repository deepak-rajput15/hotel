<?php

namespace App\Domain\Notifications\Services;

use App\Domain\Notifications\Actions\BroadcastNotificationAction;
use App\Domain\Notifications\Contracts\NotificationServiceInterface;
use App\Domain\Notifications\Models\InternalNotification;
use App\Models\User;

class NotificationService implements NotificationServiceInterface
{
    public function __construct(
        protected BroadcastNotificationAction $broadcastAction
    ) {}

    public function broadcast(User $user, array $data): InternalNotification
    {
        return $this->broadcastAction->execute($user, $data);
    }
}

