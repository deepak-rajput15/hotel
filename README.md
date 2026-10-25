# Multi-Tenant Hotel Management SaaS Platform

A multi-tenant, modular Hotel Management SaaS platform built with **Laravel 11**, **PostgreSQL 16**, and designed for a **React.js** web dashboard and **React Native** mobile app.

---

## Architecture Overview

- **Design Pattern:** Modular Service-Action Pattern with Scoped Repositories.
- **Tenancy Isolation:** Row-level multi-tenancy backed by `hotel_id` global scopes (`HotelScope`), composite indexing, and tenant context resolution middleware (`ResolveTenantContext`).
- **Dynamic Module Subscriptions:** Modules are database-driven (`modules` table). Subscriptions are assigned per-hotel (`hotel_module_subscriptions`). Module access is guarded at the backend using the `EnsureModuleSubscribed` middleware with instant Redis caching.

---

## Hierarchy

```
Platform Super Admin (Our SaaS Company)
   └── Organization (Hotel Owner Account - e.g. Apex Hospitality Group)
         ├── Hotel A (HTL-1001) -> Subscribed to: [Front Office, Rooms]
         ├── Hotel B (HTL-1002) -> Subscribed to: [Front Office, Rooms, Restaurant, Kitchen]
         └── Hotel C (HTL-1003) -> Subscribed to: [Store, Purchase]
```

---

## Core Entities & Database Tables

1. **`organizations`**: Customer accounts (`org_code`, `name`, `billing_email`, `status`).
2. **`hotels`**: Operational units (`hotel_code`, `organization_id`, `name`, `slug`, `city`, `status`).
3. **`users`**: Platform users with roles (`organization_id`, `name`, `email`, `is_platform_admin`, `is_org_owner`).
4. **`modules`**: Available platform features (`front_office`, `rooms`, `restaurant`, `kitchen`, `store`, `purchase`).
5. **`hotel_module_subscriptions`**: Per-hotel module access (`hotel_id`, `module_id`, `status`, `expires_at`).
6. **`roles` & `user_hotel_access`**: Staff roles and per-hotel access bindings.

---

## Default Seeded Accounts (Development)

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Platform Super Admin** | `admin@hotelsaask.com` | `Password@123` | Has platform-wide access, can onboard orgs and toggle modules |
| **Hotel Owner** | `owner@apexhospitality.com` | `Password@123` | Owns `ORG-1001` (Hotels: `HTL-1001`, `HTL-1002`, `HTL-1003`) |

---

## API Endpoints (v1)

### Platform Super Admin (Company Portal)
- `POST /api/v1/auth/login` - Admin login
- `GET /api/v1/admin/organizations` - List all registered organizations
- `POST /api/v1/admin/organizations` - Onboard new organization & owner account
- `GET /api/v1/admin/organizations/{id}` - View organization and its hotels
- `POST /api/v1/admin/organizations/{orgId}/hotels` - Provision new hotel with unique `hotel_code`
- `GET /api/v1/admin/hotels` - List all hotels on platform
- `GET /api/v1/admin/modules` - List all platform modules
- `PUT /api/v1/admin/hotels/{hotelId}/modules` - **Dynamic module subscription toggle (zero code change)**

### Customer & Hotel Staff
- `POST /api/v1/auth/login` - Owner / Staff login
- `GET /api/v1/auth/me` - Profile, accessible hotels, and current hotel context
- `GET /api/v1/hotels/{hotelId?}/modules` - Active subscribed modules for hotel
- `GET /api/v1/front-office/dashboard` - Protected Front Office endpoint (`module:front_office`)
- `GET /api/v1/restaurant/orders` - Protected Restaurant endpoint (`module:restaurant`)

---

## Running Locally

```bash
cd backend
php artisan serve
```

Run automated tests:
```bash
cd backend
php artisan test
```
