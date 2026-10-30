# GrandStay Hotel SaaS - Engineering SOP & Architecture Standards
**Version:** 2.0 (Strict Enterprise Interface-Driven Service Pattern)  
**Applies to:** Backend (Laravel 12 / PHP 8.4) & Frontend (React / Vite)

---

## 1. Core Architectural Philosophy: Modular Monolith + Service Contract Pattern + Action-Domain-Responder (ADR)

Our backend strictly enforces the **Interface-Driven Service Pattern** combined with **Domain-Driven Design (DDD)** and **Action-Domain-Responder (ADR)**. 

### ❌ What is FORBIDDEN ("No Hawabaji"):
1. **Fat Controllers:** Controller methods with more than 15-20 lines of code.
2. **Direct Action / Business Logic in Controllers:** Controllers must NOT execute database operations, transaction commits, or orchestrate heavy flows. Controllers ONLY inject Domain Service Interfaces (`{Domain}ServiceInterface`).
3. **Unbound Concrete Dependencies:** Controllers must NEVER type-hint concrete Service classes directly. They must always depend on the Contract/Interface registered in `AppServiceProvider`.
4. **Direct DB Queries in Controllers:** Never use `Model::create()`, `DB::transaction()`, or complex `where()` logic inside a controller.
5. **Inline Validation:** Never use `$request->validate([...])` inside controller methods; always use Form Requests.
6. **Direct Notifications / Side Effects in Controllers:** Never call email/SMS/WhatsApp dispatchers directly from a controller; use Events/Listeners or Domain Services.
7. **Ignoring Multi-Tenant Scoping:** Every query MUST be scoped to `$hotel->id` or use Tenant-aware traits.

---

## 2. The 6-Layer Backend Architecture

```
[ Incoming HTTP Request ]
          │
          ▼
1. FORM REQUEST LAYER (Validation & Tenant Authorization)
   └── App\Http\Requests\Api\V1\{Domain}\{Action}Request.php
          │
          ▼
2. SKINNY CONTROLLER (Traffic Coordinator Only)
   └── App\Http\Controllers\Api\V1\{Domain}\{Entity}Controller.php
          │ (Injects Interface via Constructor IoC)
          ▼
3. SERVICE CONTRACT LAYER (Decoupled Interfaces)
   └── App\Domain\{Domain}\Contracts\{Entity}ServiceInterface.php
          │ (Bound in AppServiceProvider::$bindings)
          ▼
4. DOMAIN SERVICE IMPLEMENTATION (Business Orchestrator)
   └── App\Domain\{Domain}\Services\{Entity}Service.php
          │ (Coordinates multiple Single-Responsibility Actions)
          ▼
5. DOMAIN ACTION LAYER (Pure Business Units & Transactions)
   └── App\Domain\{Domain}\Actions\{Verb}{Entity}Action.php
          │
          ▼
6. DOMAIN MODEL & SCOPES (Data Structures, Relations & Auditing)
   └── App\Domain\{Domain}\Models\{Entity}.php
```

---

## 3. Mandatory Service Provider Binding Pattern

All Domain Services and their Contracts are explicitly registered in [`App\Providers\AppServiceProvider`](file:///Users/deepakrajput/Desktop/projects/hotel/backend/app/Providers/AppServiceProvider.php):

```php
namespace App\Providers;

use App\Domain\FrontOffice\Contracts\FrontOfficeServiceInterface;
use App\Domain\FrontOffice\Services\FrontOfficeService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * All of the container bindings that should be registered.
     */
    public array $bindings = [
        FrontOfficeServiceInterface::class => FrontOfficeService::class,
        LostAndFoundServiceInterface::class => LostAndFoundService::class,
        RestaurantPosServiceInterface::class => RestaurantPosService::class,
        RoomDiningGuestServiceInterface::class => RoomDiningGuestService::class,
        StoreInventoryServiceInterface::class => StoreInventoryService::class,
        PurchaseOrderServiceInterface::class => PurchaseOrderService::class,
        ShiftHandoverServiceInterface::class => ShiftHandoverService::class,
        KitchenKdsServiceInterface::class => KitchenKdsService::class,
        HotelStaffServiceInterface::class => HotelStaffService::class,
        HotelPaymentSettingServiceInterface::class => HotelPaymentSettingService::class,
        NotificationServiceInterface::class => NotificationService::class,
    ];

    public function register(): void
    {
        foreach ($this->bindings as $abstract => $concrete) {
            $this->app->bind($abstract, $concrete);
        }
    }
}
```

### Why this is strictly enforced:
- **Testability & Mocking:** Unit tests can effortlessly swap any `{Domain}ServiceInterface` with a test double or mock.
- **Single Responsibility (SRP):** Controllers only manage HTTP requests/responses; Domain Services orchestrate complex business flows; Domain Actions perform atomic transactional units.
- **Maintainability:** Business rules can be modified without altering HTTP routing or controllers.

---

## 4. Mandatory 6-Step SOP for Adding Any New Feature

Before any pull request or commit is merged, every developer must check off all 6 steps:

### Step 1: Database Schema & Migration
* Primary keys must use **UUIDs** (`$table->uuid('id')->primary()`).
* Every tenant entity must have `hotel_id` foreign key (`$table->foreignUuid('hotel_id')->constrained('hotels')->cascadeOnDelete()`).
* Compound indexes must be added on `['hotel_id', 'status']` and `['hotel_id', 'created_at']`.
* Never leave nullable columns without explicit design justification.

### Step 2: Form Request Validation Layer
* Create dedicated request class: `php artisan make:request Api/V1/{Domain}/{Action}Request`.
* Implement strict validation rules (types, regex, in-enums, exists with tenant scoping).
* Never let raw unvalidated input pass into the domain.

### Step 3: Domain Action Pattern (Atomic Mutation Units)
* Class name must be an active verb: `LogLostItemAction`, `ClaimLostItemAction`, `CheckInGuestAction`, `SettleRestaurantOrderAction`.
* Must have a single public entry point: `public function execute(Hotel $hotel, array $data, ?User $actor = null): Model`.
* All database mutations affecting multiple tables must be wrapped in `DB::transaction()`.
* Must be 100% decoupled from HTTP requests (`$request` object must NEVER be passed into an Action; pass pure DTOs or validated arrays).

### Step 4: Domain Service & Contract Interface
* Define contract: `app/Domain/{Domain}/Contracts/{Entity}ServiceInterface.php`.
* Implement concrete service: `app/Domain/{Domain}/Services/{Entity}Service.php`.
* Register binding in `AppServiceProvider::$bindings`.
* The service coordinates domain actions, audits, notifications, and events.

### Step 5: Skinny Controller
* Inject `{Domain}ServiceInterface` via constructor:
  ```php
  class LostAndFoundController extends Controller
  {
      public function __construct(
          protected LostAndFoundServiceInterface $lostAndFoundService
      ) {}

      public function store(StoreLostItemRequest $request): JsonResponse
      {
          $hotel = $this->getHotel($request);
          $item = $this->lostAndFoundService->logItem($hotel, $request->validated(), $request->user());

          return response()->json([
              'success' => true,
              'message' => 'Lost item logged successfully in hotel custody.',
              'data'    => $item,
          ], 201);
      }
  }
  ```

### Step 6: Automated Testing Protocol
* **Feature Tests (`tests/Feature/`):** Must verify HTTP endpoints, status codes (200, 201, 403, 404, 422), JSON structures, and database persistence.
* **Unit Tests (`tests/Unit/Domain/`):** Test Action and Service classes directly in isolation with mocks if needed.
* **Multi-Tenant Isolation Test:** Explicitly test that Hotel B cannot view, mutate, or access Hotel A's records.

---

## 5. Standard Response Formats

### Success Response:
```json
{
  "success": true,
  "message": "Human readable action outcome.",
  "data": { ... }
}
```

### Error Response (Handled by Exception Handler & FormRequest):
```json
{
  "success": false,
  "message": "Specific error explanation.",
  "errors": {
    "field_name": ["Specific validation error message."]
  }
}
```

---

## 6. Directory Mapping Convention

| Layer | Path | Example |
|---|---|---|
| **Models** | `app/Domain/{Domain}/Models/` | `app/Domain/FrontOffice/Models/LostAndFoundItem.php` |
| **Actions** | `app/Domain/{Domain}/Actions/` | `app/Domain/FrontOffice/Actions/LogLostItemAction.php` |
| **Contracts** | `app/Domain/{Domain}/Contracts/` | `app/Domain/FrontOffice/Contracts/LostAndFoundServiceInterface.php` |
| **Services** | `app/Domain/{Domain}/Services/` | `app/Domain/FrontOffice/Services/LostAndFoundService.php` |
| **Requests** | `app/Http/Requests/Api/V1/{Domain}/` | `app/Http/Requests/Api/V1/FrontOffice/StoreLostItemRequest.php` |
| **Controllers** | `app/Http/Controllers/Api/V1/{Domain}/` | `app/Http/Controllers/Api/V1/FrontOffice/LostAndFoundController.php` |
| **Providers** | `app/Providers/` | `app/Providers/AppServiceProvider.php` |
| **Tests** | `tests/Feature/` & `tests/Unit/Domain/` | `tests/Feature/LostAndFoundTest.php` |
