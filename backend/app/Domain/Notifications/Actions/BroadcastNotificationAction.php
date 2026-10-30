<?php

namespace App\Domain\Notifications\Actions;

use App\Domain\Notifications\Models\InternalNotification;
use App\Domain\Tenancy\Models\Hotel;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Exceptions\HttpResponseException;

class BroadcastNotificationAction
{
    /**
     * Broadcast an internal notification.
     *
     * @throws HttpResponseException
     */
    public function execute(User $user, array $data): InternalNotification
    {
        if (!$user->isPlatformAdmin() && !$user->isOrgOwner()) {
            throw new HttpResponseException(response()->json([
                'success' => false,
                'error_code' => 'UNAUTHORIZED_NOTIFICATION_BROADCAST',
                'message' => 'Only Hotel Owners and SaaS Platform Admins are authorized to broadcast notifications.',
            ], 403));
        }

        $senderType = $user->isPlatformAdmin() ? 'PLATFORM_ADMIN' : 'HOTEL_OWNER';
        $organizationId = $user->organization_id;
        $hotelId = $data['hotel_id'] ?? null;

        if ($user->isPlatformAdmin()) {
            $organizationId = $data['organization_id'] ?? null;
        } else {
            // Hotel Owner validation: Ensure hotel_id belongs to owner's organization
            if ($hotelId) {
                $hotel = Hotel::where('id', $hotelId)
                    ->where('organization_id', $organizationId)
                    ->first();

                if (!$hotel) {
                    throw new HttpResponseException(response()->json([
                        'success' => false,
                        'error_code' => 'INVALID_HOTEL_SELECTION',
                        'message' => 'Selected hotel does not belong to your organization.',
                    ], 422));
                }
            }

            // Prevent Hotel Owner from broadcasting GLOBAL_OWNERS (only Platform Admin can)
            if ($data['target_scope'] === 'GLOBAL_OWNERS') {
                throw new HttpResponseException(response()->json([
                    'success' => false,
                    'error_code' => 'FORBIDDEN_GLOBAL_BROADCAST',
                    'message' => 'Hotel owners cannot broadcast global announcements across all organizations.',
                ], 403));
            }
        }

        $isBanner = isset($data['is_banner']) ? (bool) $data['is_banner'] : false;

        $notification = InternalNotification::create([
            'sender_id' => $user->id,
            'sender_type' => $senderType,
            'organization_id' => $organizationId,
            'hotel_id' => $hotelId,
            'target_scope' => $data['target_scope'],
            'target_role' => $data['target_scope'] === 'SPECIFIC_ROLE' ? $data['target_role'] : null,
            'title' => $data['title'],
            'message' => $data['message'],
            'priority' => $data['priority'] ?? 'INFO',
            'is_banner' => $isBanner,
            'starts_at' => now(),
            'expires_at' => !empty($data['expires_at']) ? Carbon::parse($data['expires_at']) : null,
            'is_active' => true,
        ]);

        return $notification->load(['sender:id,name,email', 'hotel:id,name,hotel_code']);
    }
}

