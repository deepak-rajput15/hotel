<?php

namespace App\Http\Controllers\Api\V1\Notifications;

use App\Domain\Notifications\Contracts\NotificationServiceInterface;
use App\Domain\Notifications\Models\InternalNotification;
use App\Domain\Notifications\Models\NotificationRead;
use App\Domain\Tenancy\Models\Hotel;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Notifications\BroadcastNotificationRequest;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class NotificationController extends Controller
{
    public function __construct(
        protected NotificationServiceInterface $notificationService
    ) {}
    /**
     * List relevant internal notifications for authenticated user.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = InternalNotification::with(['sender:id,name,email', 'hotel:id,name,hotel_code', 'organization:id,name']);

        if ($request->boolean('active_only', true)) {
            $query->active();
        }

        if ($user->isPlatformAdmin()) {
            // Super Admin: sees platform announcements and sent notifications
            // If sender filter is provided
            if ($request->has('scope')) {
                $query->where('target_scope', $request->query('scope'));
            }
        } elseif ($user->isOrgOwner()) {
            // Hotel Owner:
            // 1. Receives announcements from SaaS Platform Admin (GLOBAL_OWNERS or for their organization)
            // 2. OR notifications they sent or created within their organization for subordinates
            $orgId = $user->organization_id;
            $query->where(function ($q) use ($user, $orgId) {
                // Announcements from SaaS Platform targeted to owners
                $q->where(function ($sub) use ($orgId) {
                    $sub->where('sender_type', 'PLATFORM_ADMIN')
                        ->where(function ($p) use ($orgId) {
                            $p->where('target_scope', 'GLOBAL_OWNERS')
                                ->orWhere(function ($o) use ($orgId) {
                                    $o->where('target_scope', 'ORGANIZATION_OWNERS')
                                        ->where('organization_id', $orgId);
                                });
                        });
                })
                // OR notifications created within their organization (broadcasts to staff)
                ->orWhere('organization_id', $orgId)
                ->orWhere('sender_id', $user->id);
            });
        } else {
            // Subordinate Staff:
            // Fetch staff assigned hotels & roles
            $staffHotelIds = $user->hotelAccess()->pluck('hotel_id')->toArray();
            $staffRoleSlugs = $user->hotelAccess()->with('role')->get()->pluck('role.slug')->filter()->toArray();
            $orgId = $user->organization_id;

            $query->where('is_active', true)
                ->where(function ($q) {
                    $q->whereNull('expires_at')
                        ->orWhere('expires_at', '>=', now());
                })
                ->where(function ($q) use ($orgId, $staffHotelIds, $staffRoleSlugs) {
                    $q->where(function ($hotelScope) use ($staffHotelIds) {
                        $hotelScope->whereNull('hotel_id')
                            ->orWhereIn('hotel_id', $staffHotelIds);
                    })
                    ->where(function ($targetScope) use ($staffRoleSlugs, $staffHotelIds) {
                        $targetScope->where('target_scope', 'ALL_STAFF')
                            ->orWhere(function ($r) use ($staffRoleSlugs) {
                                $r->where('target_scope', 'SPECIFIC_ROLE')
                                    ->whereIn('target_role', $staffRoleSlugs);
                            })
                            ->orWhere(function ($h) use ($staffHotelIds) {
                                $h->where('target_scope', 'SPECIFIC_HOTEL')
                                    ->whereIn('hotel_id', $staffHotelIds);
                            });
                    });

                    if ($orgId) {
                        $q->where('organization_id', $orgId);
                    }
                });
        }

        // Include user read status
        $notifications = $query->orderByDesc('created_at')->get();

        $userReadMap = NotificationRead::where('user_id', $user->id)
            ->whereIn('notification_id', $notifications->pluck('id'))
            ->get()
            ->keyBy('notification_id');

        $formatted = $notifications->map(function ($item) use ($userReadMap) {
            $readRecord = $userReadMap->get($item->id);
            return [
                'id' => $item->id,
                'title' => $item->title,
                'message' => $item->message,
                'priority' => $item->priority,
                'is_banner' => (bool) $item->is_banner,
                'sender_type' => $item->sender_type,
                'sender' => $item->sender ? [
                    'id' => $item->sender->id,
                    'name' => $item->sender->name,
                    'email' => $item->sender->email,
                ] : null,
                'organization' => $item->organization ? [
                    'id' => $item->organization->id,
                    'name' => $item->organization->name,
                ] : null,
                'hotel' => $item->hotel ? [
                    'id' => $item->hotel->id,
                    'name' => $item->hotel->name,
                    'code' => $item->hotel->hotel_code,
                ] : null,
                'target_scope' => $item->target_scope,
                'target_role' => $item->target_role,
                'is_active' => (bool) $item->is_active,
                'starts_at' => $item->starts_at?->toIso8601String(),
                'expires_at' => $item->expires_at?->toIso8601String(),
                'created_at' => $item->created_at?->toIso8601String(),
                'is_read' => $readRecord ? !is_null($readRecord->read_at) : false,
                'read_at' => $readRecord?->read_at?->toIso8601String(),
                'is_dismissed' => $readRecord ? (bool) $readRecord->dismissed : false,
            ];
        });

        // Compute unread and banner counts
        $unreadCount = $formatted->where('is_read', false)->count();
        $activeBanners = $formatted->where('is_banner', true)->where('is_dismissed', false)->values();

        return response()->json([
            'success' => true,
            'data' => $formatted->values(),
            'meta' => [
                'total' => $formatted->count(),
                'unread_count' => $unreadCount,
                'active_banners_count' => $activeBanners->count(),
                'banners' => $activeBanners,
            ],
        ]);
    }

    /**
     * Create / Broadcast a new notification.
     * Platform Admin -> Hotel Owners
     * Hotel Owner -> Subordinates / Staff
     */
    public function store(BroadcastNotificationRequest $request): JsonResponse
    {
        $notification = $this->notificationService->broadcast($request->user(), $request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Internal notification broadcasted successfully.',
            'data' => $notification,
        ], 201);
    }

    /**
     * Mark notification as read or dismissed for the current user.
     */
    public function markAsRead(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $notification = InternalNotification::findOrFail($id);

        $read = NotificationRead::updateOrCreate(
            [
                'notification_id' => $notification->id,
                'user_id' => $user->id,
            ],
            [
                'read_at' => now(),
                'dismissed' => $request->boolean('dismissed', false),
            ]
        );

        return response()->json([
            'success' => true,
            'message' => $read->dismissed ? 'Notification banner dismissed.' : 'Notification marked as read.',
            'data' => $read,
        ]);
    }

    /**
     * Mark all active notifications as read for current user.
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $user = $request->user();
        $response = $this->index($request);
        $data = json_decode($response->getContent(), true)['data'] ?? [];

        $now = now();
        foreach ($data as $item) {
            NotificationRead::updateOrCreate(
                [
                    'notification_id' => $item['id'],
                    'user_id' => $user->id,
                ],
                [
                    'read_at' => $now,
                ]
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'All notifications marked as read.',
        ]);
    }

    /**
     * Toggle banner flag (flash on top reminder bar) for a notification.
     */
    public function toggleBanner(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $notification = InternalNotification::findOrFail($id);

        if (!$user->isPlatformAdmin() && $notification->sender_id !== $user->id && $notification->organization_id !== $user->organization_id) {
            return response()->json([
                'success' => false,
                'error_code' => 'UNAUTHORIZED',
                'message' => 'You are not authorized to update this notification banner.',
            ], 403);
        }

        $notification->is_banner = !$notification->is_banner;
        $notification->save();

        return response()->json([
            'success' => true,
            'message' => $notification->is_banner ? 'Notification pinned to top reminder bar.' : 'Notification unpinned from reminder bar.',
            'data' => $notification,
        ]);
    }

    /**
     * Deactivate or delete notification.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $notification = InternalNotification::findOrFail($id);

        if (!$user->isPlatformAdmin() && $notification->sender_id !== $user->id && $notification->organization_id !== $user->organization_id) {
            return response()->json([
                'success' => false,
                'error_code' => 'UNAUTHORIZED',
                'message' => 'You are not authorized to delete this notification.',
            ], 403);
        }

        $notification->delete();

        return response()->json([
            'success' => true,
            'message' => 'Notification removed successfully.',
        ]);
    }
}

