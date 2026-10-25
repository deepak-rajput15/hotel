<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\Tenancy\Actions\CreateOrganizationAction;
use App\Domain\Tenancy\Models\Organization;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SuperAdminOrganizationController extends Controller
{
    public function __construct(
        protected CreateOrganizationAction $createOrgAction
    ) {}

    /**
     * List all registered organizations.
     */
    public function index(Request $request): JsonResponse
    {
        $organizations = Organization::withCount('hotels')
            ->with(['users' => function ($q) {
                $q->where('is_org_owner', true)->select('id', 'organization_id', 'name', 'email', 'phone');
            }])
            ->orderBy('created_at', 'desc')
            ->paginate($request->input('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $organizations,
        ]);
    }

    /**
     * Register a new organization / hotel owner.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'billing_email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:50',
            'tax_number' => 'nullable|string|max:100',
            'org_code' => 'nullable|string|max:30|unique:organizations,org_code',
            'owner_name' => 'required|string|max:255',
            'owner_email' => 'required|email|max:255|unique:users,email',
            'owner_phone' => 'nullable|string|max:50',
            'owner_password' => 'required|string|min:8',
        ]);

        $result = $this->createOrgAction->execute($validated);

        return response()->json([
            'success' => true,
            'message' => "Organization '{$result['organization']->name}' registered successfully with code {$result['organization']->org_code}.",
            'organization' => $result['organization'],
            'owner' => [
                'id' => $result['owner']->id,
                'name' => $result['owner']->name,
                'email' => $result['owner']->email,
            ],
        ], 201);
    }

    /**
     * Get specific organization with its hotels and owner.
     */
    public function show(string $id): JsonResponse
    {
        $organization = Organization::with([
            'hotels' => function ($q) {
                $q->with('subscriptions.module');
            },
            'users' => function ($q) {
                $q->where('is_org_owner', true);
            },
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $organization,
        ]);
    }
}
