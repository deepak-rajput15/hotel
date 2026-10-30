# 📱 GrandStay Hotel SaaS — Mobile App (Expo & React Native)

A unified, role-adaptive cross-platform mobile application for **Hotel Owners, General Managers, Front Desk Receptionists, Restaurant Waiters, Kitchen Chefs, and Housekeeping Staff**.

---

## 🚀 Quick Start & Testing on Physical Phone (iOS & Android)

You can run and test this app on your physical mobile phone within 30 seconds using **Expo Go**!

### 1. Install Expo Go on your Phone:
- **Android:** Download [Expo Go on Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
- **iPhone (iOS):** Download [Expo Go on Apple App Store](https://apps.apple.com/app/expo-go/id982107440)

### 2. Start the Mobile Dev Server:
```bash
cd mobile
npx expo start
```
*(Or with tunnel if phone is on a different Wi-Fi network: `npx expo start --tunnel`)*

### 3. Scan the Terminal QR Code:
- **Android:** Open Expo Go app -> Tap **"Scan QR Code"** -> Scan the QR code shown in your terminal.
- **iPhone:** Open default Camera app -> Scan QR code -> Tap the yellow **"Open in Expo Go"** banner.

The app will bundle and load instantly on your phone with Fast Refresh!

---

## 👥 Role-Based Logins & Credentials

The login screen includes **1-Tap Quick Switch buttons** for instant testing:

| Role Persona | Test Email | Password | Default Property | Custom Mobile Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **👑 Hotel Owner** | `owner@apexhospitality.com` | `Password@123` | Multi-Hotel (Mumbai / Goa / Delhi) | Live RevPAR, Occupancy pulse, today's collections, Cash Drawer status, multi-hotel switcher. |
| **🛎️ Front Desk** | `frontdesk.priya@apexhospitality.com` | `Password@123` | `HTL-1001` (Mumbai) | Fast Walk-In Check-In with KYC document number, In-house guest search, Instant Checkout & Settle. |
| **🍽️ Restaurant Waiter** | `cashier.rahul@apexhospitality.com` | `Password@123` | `HTL-1002` (Goa) | Dining Table & Room Service selector, Food Menu catalog with Quantity (+/-), Instant KOT dispatch. |
| **👨‍🍳 Head Chef** | `chef.sanjeev@apexhospitality.com` | `Password@123` | `HTL-1002` (Goa) | Live Kitchen Display System (KDS) Queue with 15-sec auto-poll. Mark tickets: Pending ➔ Preparing ➔ Ready ➔ Served. |
| **🧹 Housekeeping** | `store.amit@apexhospitality.com` | `Password@123` | `HTL-1003` (Delhi) | Room Turnover grid. Tap dirty room ➔ "Mark Clean & Inspected" (instantly updates room to READY for check-in). |

---

## 🌐 Backend API Configuration

The mobile app connects directly to the live production backend API by default:
- **Production API URL:** `https://sasapi.u2tech.in/api/v1`
- **Tenant Header:** `X-Hotel-Id` auto-injected based on selected active hotel property.
- **Auth Tokens:** Persisted in `@react-native-async-storage/async-storage`.

To switch to a local backend development server:
Open [`src/api/client.js`](file:///Users/deepakrajput/Desktop/projects/hotel/mobile/src/api/client.js) and update `DEFAULT_API_BASE` to your local machine IP (e.g., `http://192.168.1.10:8000/api/v1`).

---

## 📂 Architecture Structure

```
mobile/
├── App.js                     # Root entry point with AuthProvider & SafeAreaProvider
├── app.json                   # Expo configuration & app branding
├── package.json               # Expo SDK 58 & React Native dependencies
└── src/
    ├── api/
    │   └── client.js          # Axios API client with Sanctum interceptors
    ├── context/
    │   └── AuthContext.js     # User session, active hotel & role computation
    ├── theme/
    │   └── colors.js          # Unified dark theme tokens
    ├── components/
    │   ├── Header.js          # Hotel badge, property picker & logout
    │   ├── MetricCard.js      # Executive stat cards
    │   └── RoomCard.js        # Interactive room rack cards
    ├── navigation/
    │   └── AppNavigator.js    # Dynamic role-based bottom tab bars
    └── screens/
        ├── auth/
        │   └── LoginScreen.js
        ├── owner/
        │   └── OwnerDashboardScreen.js
        ├── frontoffice/
        │   ├── FrontDeskScreen.js
        │   ├── QuickCheckInScreen.js
        │   └── RoomRackScreen.js
        ├── restaurant/
        │   └── MobilePosScreen.js
        ├── kitchen/
        │   └── KitchenKdsScreen.js
        └── housekeeping/
            └── HousekeepingScreen.js
```

