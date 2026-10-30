# GrandStay Hotel SaaS - Engineering SOP & Architecture Standards
**Version:** 1.0 (Strict Enforcement)  
**Applies to:** Backend (Laravel 12 / PHP 8.4) & Frontend (React / Vite)

---

## 1. Core Architectural Philosophy: Modular Monolith + Action-Domain-Responder (ADR)

Our backend strictly enforces the **Action-Domain-Responder (ADR)** pattern combined with **Domain-Driven Design (DDD)**. 

### ❌ What is FORBIDDEN ("No Hawabaji"):
1. **Fat Controllers:** Controller methods with more than 15-20 lines of code.
2. **Direct DB Queries in Controllers:** Never use `Model::create()`, `DB::transaction()`, or complex `where()` logic inside a controller.
3. **Inline Validation:** Never use `$request->validate([...])` inside controller methods.
4. **Direct Notifications / Side Effects in Controllers:** Never call email/SMS/WhatsApp dispatchers directly from a controller; use Events/Listeners or Domain Services.
5. **Ignoring Multi-Tenant Scoping:** Every query MUST be scoped to `$hotel->id` or use Tenant-aware traits.

---

## 2. The 5-Layer Backend Architecture

```
[ Incoming HTTP Request ]
          │
          ▼
1. FORM REQUEST LAYER (Validation & Authorization)
   └── App\Http\Requests\Api\V1\{Domain}\{Action}Request.php
          │
          ▼
2. SKINNY CONTROLLER (Traffic Coordinator Only)
   └── App\Http\Controllers\Api\V1\{Domain}\{Entity}Controller.php
          │
          ▼
3. DOMAIN ACTION LAYER (Pure Business Logic & DB Transactions)
   └── App\Domain\{Domain}\Actions\{Verb}{Entity}Action.php
          │
          ▼
4. DOMAIN MODEL & SCOPES (Data Structures & Relations)
   └── App\Domain\{Domain}\Models\{Entity}.php
          │
          ▼
5. EVENT / SERVICE LAYER (Async Side-Effects & Third-Party Gateways)
   └── App\Domain\{Domain}\Events\ & App\Domain\{Domain}\Services\
```

---

## 3. Mandatory 5-Step SOP for Adding Any New Feature

Before any pull request or commit is merged, every developer must check off all 5 steps:

### Step 1: Database Schema & Migration
* Primary keys must use **UUIDs** (`$table->uuid('id')->primary()`).
* Every tenant entity must have `hotel_id` foreign key (`$table->foreignUuid('hotel_id')->constrained('hotels')->cascadeOnDelete()`).
* Compound indexes must be added on `['hotel_id', 'status']` and `['hotel_id', 'created_at']`.
* Never leave nullable columns without explicit design justification.

### Step 2: Form Request Validation Layer
* Create dedicated request class: `php artisan make:request Api/V1/{Domain}/{Action}Request`.
* Implement strict validation rules (types, regex, in-enums, exists with tenant scoping).
* Never let raw unvalidated input pass into the domain.

### Step 3: Domain Action Pattern (Single-Responsibility Class)
* Class name must be an active verb: `LogLostItemAction`, `ClaimLostItemAction`, `CheckInGuestAction`, `SettleRestaurantOrderAction`.
* Must have a single public entry point: `public function execute(Hotel $hotel, array $data, ?User $actor = null): Model`.
* All database mutations affecting multiple tables must be wrapped in `DB::transaction()`.
* Must be 100% decoupled from HTTP requests (`$request` object must NEVER be passed into an Action; pass pure DTOs or validated arrays).

### Step 4: Skinny Controller
* The controller's ONLY responsibilities:
  1. Resolve hotel context via `$this->getHotel($request)`.
  2. Inject and execute the Domain Action with `$request->validated()`.
  3. Return standardized JSON response:
     ```php
     return response()->json([
         'success' => true,
         'message' => 'Action completed successfully.',
         'data'    => $result,
     ], 200); // or 201 for store
     ```

### Step 5: Automated Testing Protocol
* **Feature Tests (`tests/Feature/`):** Must verify HTTP endpoints, status codes (200, 201, 403, 404, 422), JSON structures, and database persistence.
* **Unit Tests (`tests/Unit/Domain/`):** Test Action classes directly in isolation with mocks if needed.
* **Multi-Tenant Isolation Test:** Explicitly test that Hotel B cannot view, mutate, or access Hotel A's records.

---

## 4. Standard Response Formats

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

## 5. Directory Mapping Convention

| Layer | Path | Example |
|---|---|---|
| **Models** | `app/Domain/{Domain}/Models/` | `app/Domain/FrontOffice/Models/LostAndFoundItem.php` |
| **Actions** | `app/Domain/{Domain}/Actions/` | `app/Domain/FrontOffice/Actions/LogLostItemAction.php` |
| **Services** | `app/Domain/{Domain}/Services/` | `app/Domain/ChannelManager/Services/OtaChannelService.php` |
| **Requests** | `app/Http/Requests/Api/V1/{Domain}/` | `app/Http/Requests/Api/V1/FrontOffice/StoreLostItemRequest.php` |
| **Controllers** | `app/Http/Controllers/Api/V1/{Domain}/` | `app/Http/Controllers/Api/V1/FrontOffice/LostAndFoundController.php` |
| **Tests** | `tests/Feature/` & `tests/Unit/Domain/` | `tests/Feature/LostAndFoundTest.php` |
