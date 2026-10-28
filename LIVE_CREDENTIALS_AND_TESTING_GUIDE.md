# 🏨 GrandStay Hotel SaaS — Live Server Testing & Login Credentials Guide

**Live Web Application URL:** [https://sas.u2tech.in](https://sas.u2tech.in)  
**Live Backend API URL:** [https://sasapi.u2tech.in/api/v1](https://sasapi.u2tech.in/api/v1)  
**Default Password for all accounts:** `Password@123`

---

## 👥 Tier-wise User Logins & Role Permissions

| Tier | Role / Designation | Email Address | Password | Assigned Property / Scope | Modules Accessible |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tier 1** | **Platform Super Admin** | `admin@hotelsaask.com` | `Password@123` | Global Platform & All Tenants | Organizations, Hotels, Dynamic Module Toggling, Global Audits |
| **Tier 2** | **Hotel Organization Owner** | `owner@apexhospitality.com` | `Password@123` | **Apex Hospitality Group** (Multi-Hotel Portfolio) | Full portfolio view across Mumbai, Goa & Delhi, Financial Reports, Staff Provisioning |
| **Tier 3** | **General Manager (Sub-Admin)** | `subadmin.vikram@apexhospitality.com` | `Password@123` | **Apex Grand Palace** (`HTL-1001` - Mumbai) | Front Office, Rooms, Restaurant, Hotel Staff & Local Reports |
| **Tier 3** | **Front Desk Receptionist** | `frontdesk.priya@apexhospitality.com` | `Password@123` | **Apex Grand Palace** (`HTL-1001` - Mumbai) | Front Office Desk, Guest KYC Check-in, 30-Day Tape Chart, Folio Billing |
| **Tier 3** | **Head Chef** | `chef.sanjeev@apexhospitality.com` | `Password@123` | **Apex Sea Breeze Resort** (`HTL-1002` - Goa) | Kitchen KDS (Live KOT Cards, Food Prep Timers, Cooking Statuses) |
| **Tier 3** | **Restaurant Cashier / Waiter** | `cashier.rahul@apexhospitality.com` | `Password@123` | **Apex Sea Breeze Resort** (`HTL-1002` - Goa) | Restaurant POS, Table Management, Room Service Billing, Settlement |
| **Tier 3** | **Storekeeper / Inventory** | `store.amit@apexhospitality.com` | `Password@123` | **Apex Express Inn** (`HTL-1003` - Delhi) | Store Inventory, Stock Adjustments, Low-Stock Alerts, Suppliers |

---

## 🏢 Hotel Properties & Module Subscription Map

| Hotel Code | Hotel Name | City | Subscribed Active Modules | Notes / Testing Focus |
| :--- | :--- | :--- | :--- | :--- |
| **`HTL-1001`** | **Apex Grand Palace** | Mumbai | `front_office`, `rooms`, `restaurant` | Test Walk-in check-in, 30-Day Tape Chart, Room Service order & Folio settlement. (Kitchen/Store are inactive to verify 403 guards). |
| **`HTL-1002`** | **Apex Sea Breeze Resort** | Goa | `front_office`, `rooms`, `restaurant`, `kitchen` | Test Kitchen KDS Live KOT updates, Chef ticket flow, Dine-in Table billing & QR orders. |
| **`HTL-1003`** | **Apex Express Inn** | Delhi | `store`, `purchase` | Test Product inventory catalog, Stock Adjustments (Audit/Spoilage), Supplier listings, and Purchase Orders. |

---

## 📋 Recommended Testing Scenarios for Ops Team

### 1. Front Desk & Walk-in Check-in (`frontdesk.priya@apexhospitality.com`)
1. Log in to [https://sas.u2tech.in](https://sas.u2tech.in).
2. Navigate to **Front Office** -> **Room Availability & Tape Chart**.
3. Click on any `AVAILABLE` room (Green) to start a **Guest Check-in**.
4. Enter Guest KYC details (Name, Phone, Aadhaar number).
5. Add an Advance Deposit (UPI or Cash).
6. Confirm Check-in: Verify that the room turns **OCCUPIED** (Blue).

### 2. Restaurant POS & Room Service Billing (`cashier.rahul@apexhospitality.com` or `owner@apexhospitality.com`)
1. Navigate to **Restaurant POS**.
2. Select **Room Service** -> Choose an in-house room (e.g. Room 101).
3. Add food items (e.g., *Paneer Tikka Angara*, *Butter Naan*).
4. Punch order -> Observe KOT generation (e.g. `KOT-001`).
5. Settle the order by choosing **Charge to Room Folio**.
6. Verify that the order moves to `SETTLED` and food charges are reflected on the guest's room bill without duplicate GST.

### 3. Kitchen KDS Live Queue (`chef.sanjeev@apexhospitality.com`)
1. Navigate to **Kitchen (KDS)** on property **Apex Sea Breeze Resort** (`HTL-1002`).
2. View incoming KOT tickets organized by order time.
3. Click **Start Cooking** -> Status updates to `PREPARING` (Yellow).
4. Click **Mark Ready** -> Ticket turns green `READY` for server pickup.

### 4. Store Inventory & Low Stock Tracking (`store.amit@apexhospitality.com`)
1. Navigate to **Store / Inventory** on property **Apex Express Inn** (`HTL-1003`).
2. Search products or filter by category (*Grocery*, *Dairy*, *Housekeeping*).
3. Click **Adjust Stock** -> Select *Add (Vendor GRN)* or *Subtract (Kitchen Requisition)*.
4. Verify instant inventory recalculation and stock audit trail.

### 5. Consolidated Financial Reports (`owner@apexhospitality.com`)
1. Navigate to **Reports & Analytics**.
2. Toggle between **Consolidated Portfolio** and individual hotel view.
3. Review Daily Revenue Trends, RevPAR, ADR, and Collections Breakdown (UPI vs Card vs Cash).
4. Click **Export CSV** to download Excel-compatible audit reports.

---

## 🔒 Security & Tenant Isolation Verification
- **Module Guards:** Trying to access Kitchen or Store under `HTL-1001` will show an informative subscription notice.
- **RBAC Guards:** Front Desk staff cannot adjust inventory or create other staff accounts.
- **Folio Audit:** Guests cannot check out with unsettled negative or outstanding balances without clearance.

