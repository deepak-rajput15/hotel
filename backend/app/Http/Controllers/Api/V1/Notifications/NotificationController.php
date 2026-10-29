<?php

namespace App\Http\Controllers\Api\V1\Notifications;

use App\Domain\Notifications\Models\InternalNotification;
use App\Domain\Notifications\Models\NotificationRead;
use App\Domain\Tenancy\Models\Hotel;
use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class NotificationController extends Controller
{
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
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->isPlatformAdmin() && !$user->isOrgOwner()) {
            return response()->json([
                'success' => false,
                'error_code' => 'UNAUTHORIZED_NOTIFICATION_BROADCAST',
                'message' => 'Only Hotel Owners and SaaS Platform Admins are authorized to broadcast notifications.',
            ], 403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'priority' => 'nullable|string|in:INFO,WARNING,URGENT',
            'is_banner' => 'nullable|boolean',
            'target_scope' => [
                'required',
                'string',
                Rule::in(['GLOBAL_OWNERS', 'ORGANIZATION_OWNERS', 'ALL_STAFF', 'SPECIFIC_ROLE', 'SPECIFIC_HOTEL']),
            ],
            'target_role' => [
                'nullable',
                'string',
                'required_if:target_scope,SPECIFIC_ROLE',
                Rule::in(['front-desk', 'restaurant-cashier', 'head-chef', 'storekeeper', 'general-manager']),
            ],
            'hotel_id' => 'nullable|uuid|exists:hotels,id',
            'organization_id' => 'nullable|uuid|exists:organizations,id',
            'expires_at' => 'nullable|date',
        ]);

        $senderType = $user->isPlatformAdmin() ? 'PLATFORM_ADMIN' : 'HOTEL_OWNER';
        $organizationId = $user->organization_id;
        $hotelId = $validated['hotel_id'] ?? null;

        if ($user->isPlatformAdmin()) {
            $organizationId = $validated['organization_id'] ?? null;
        } else {
            // Hotel Owner validation: Ensure hotel_id belongs to owner's organization
            if ($hotelId) {
                $hotel = Hotel::where('id', $hotelId)
                    ->where('organization_id', $organizationId)
                    ->first();

                if (!$hotel) {
                    return response()->json([
                        'success' => false,
                        'error_code' => 'INVALID_HOTEL_SELECTION',
                        'message' => 'Selected hotel does not belong to your organization.',
                    ], 422);
                }
            }

            // Prevent Hotel Owner from broadcasting GLOBAL_OWNERS (only Platform Admin can)
            if ($validated['target_scope'] === 'GLOBAL_OWNERS') {
                return response()->json([
                    'success' => false,
                    'error_code' => 'FORBIDDEN_GLOBAL_BROADCAST',
                    'message' => 'Hotel owners cannot broadcast global announcements across all organizations.',
                ], 403);
            }
        }

        $notification = InternalNotification::create([
            'sender_id' => $user->id,
            'sender_type' => $senderType,
            'organization_id' => $organizationId,
            'hotel_id' => $hotelId,
            'target_scope' => $validated['target_scope'],
            'target_role' => $validated['target_scope'] === 'SPECIFIC_ROLE' ? $validated['target_role'] : null,
            'title' => $validated['title'],
            'message' => $validated['message'],
            'priority' => $validated['priority'] ?? 'INFO',
            'is_banner' => $request->boolean('is_banner', false),
            'starts_at' => now(),
            'expires_at' => !empty($validated['expires_at']) ? Carbon::parse($validated['expires_at']) : null,
            'is_active' => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Internal notification broadcasted successfully.',
            'data' => $notification->load(['sender:id,name,email', 'hotel:id,name,hotel_code']),
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
