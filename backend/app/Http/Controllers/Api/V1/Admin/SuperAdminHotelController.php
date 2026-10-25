<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\Tenancy\Actions\CreateHotelAction;
use App\Domain\Tenancy\Models\Hotel;
use App\Domain\Tenancy\Models\Organization;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SuperAdminHotelController extends Controller
{
    public function __construct(
        protected CreateHotelAction $createHotelAction
    ) {}

    /**
     * List all hotels across the platform.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Hotel::with(['organization:id,org_code,name', 'subscriptions.module:id,code,name']);

        if ($request->has('organization_id')) {
            $query->where('organization_id', $request->query('organization_id'));
        }

        if ($request->has('status')) {
            $query->where('status', $request->query('status'));
        }

        $hotels = $query->orderBy('created_at', 'desc')->paginate($request->input('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $hotels,
        ]);
    }

    /**
     * Register a new hotel under an organization.
     */
    public function store(Request $request, string $orgId): JsonResponse
    {
        $organization = Organization::findOrFail($orgId);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'hotel_code' => 'nullable|string|max:30|unique:hotels,hotel_code',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'timezone' => 'nullable|string|max:50',
            'currency' => 'nullable|string|max:10',
            'modules' => 'nullable|array', // Optional initial module keys e.g. ['front_office', 'rooms']
        ]);

        $hotel = $this->createHotelAction->execute($organization, $validated);

        return response()->json([
            'success' => true,
            'message' => "Hotel '{$hotel->name}' created successfully with code {$hotel->hotel_code}.",
            'hotel' => $hotel,
        ], 201);
    }

    /**
     * View details of a specific hotel with its module subscriptions.
     */
    public function show(string $id): JsonResponse
    {
        $hotel = Hotel::with([
            'organization',
            'subscriptions' => function ($q) {
                $q->with('module');
            },
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $hotel,
        ]);
    }
}
