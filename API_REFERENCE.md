# Fides Backend API Reference

This document provides a complete, exhaustive reference for all endpoints available on the Fides backend server. Use this specification to build the client-side UI, forms, and state stores.

---

## 1. Global Conventions & Standards

- **Base URL**: `http://localhost:5001/api` (Local development) or configured via `VITE_API_URL`
- **Authentication**: JWT Bearer token passed in the `Authorization` header:
  ```http
  Authorization: Bearer <JWT_TOKEN>
  ```
- **Currency Representation**:
  All financial amounts in the backend are stored and processed as integer **pesewas**:
  - $1\text{ GHS} = 100\text{ pesewas}$
  - $\text{GH₵ 350.00} = 35{,}000\text{ pesewas}$ (Temu Ghana minimum cart threshold)
  - $\text{GH₵ 10.00} = 1{,}000\text{ pesewas}$ (Typical join fee)
  - Display format: $\text{GHS} = \text{pesewas} / 100$ (e.g. `(pesewas / 100).toFixed(2)`)
- **Ghana Phone Format**:
  Numbers must match the standard 10-digit format starting with `0` (e.g., `0241234567`, `0501234567`) or international format (`+233241234567`).
  Regex: `/^(?:\+233|233|0)[235][0-9]{8}$/`
- **Rate Limits**:
  - General API: 300 requests / 15 minutes per IP
  - OTP Requests: 5 requests / 15 minutes per IP or phone number
  - Webhooks: 120 requests / 1 minute

---

## 2. Authentication & Onboarding (`/api/auth`)

### 2.1 Request OTP
Initiates phone number verification via SMS OTP (or console simulation in development).

- **Method**: `POST`
- **Path**: `/api/auth/otp/request`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "phone": "0241234567"
  }
  ```
- **Response `(200 OK)`**:
  ```json
  {
    "message": "OTP sent successfully"
  }
  ```

---

### 2.2 Verify OTP
Verifies the 6-digit numeric OTP code. Creates a new account if the phone is not registered, or logs into an existing account.

- **Method**: `POST`
- **Path**: `/api/auth/otp/verify`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "phone": "0241234567",
    "code": "123456",
    "name": "Kwame Mensah"
  }
  ```
  *(Note: `name` is optional on first sign-up)*
- **Response `(200 OK)`**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "e2a4b870-22c6-4d2b-98f9-4d6cb17c6e12",
      "phone": "+233241234567",
      "name": "Kwame Mensah",
      "role": "buyer",
      "leaderOnboardingStatus": "not_started"
    }
  }
  ```
  *Roles: `"buyer"` | `"leader"` | `"admin"` | `"super_admin"`*
  *Status: `"not_started"` | `"pending_review"` | `"approved"` | `"suspended"`*

---

### 2.3 Get Current User Profile
Fetches the profile of the authenticated user.

- **Method**: `GET`
- **Path**: `/api/auth/me`
- **Access**: Private (Authenticated)
- **Response `(200 OK)`**:
  ```json
  {
    "user": {
      "id": "e2a4b870-22c6-4d2b-98f9-4d6cb17c6e12",
      "phone": "+233241234567",
      "name": "Kwame Mensah",
      "email": null,
      "role": "buyer",
      "leaderOnboardingStatus": "not_started",
      "ghanaCardNumber": null,
      "createdAt": "2026-11-18T00:00:00.000Z"
    }
  }
  ```

---

### 2.4 Submit Leader KYC Application
Submits Ghana Card ID and live selfie image for platform approval to become a verified pool leader.

- **Method**: `POST`
- **Path**: `/api/auth/leader-application`
- **Access**: Private (Buyer)
- **Request Body**:
  ```json
  {
    "ghanaCardNumber": "GHA-123456789-1",
    "selfieImageUrl": "https://res.cloudinary.com/.../selfie.jpg"
  }
  ```
- **Response `(200 OK)`**:
  ```json
  {
    "message": "Leader application submitted for review",
    "user": {
      "id": "e2a4b870-22c6-4d2b-98f9-4d6cb17c6e12",
      "leaderOnboardingStatus": "pending_review",
      "ghanaCardNumber": "GHA-123456789-1"
    }
  }
  ```

---

## 3. Group Pools (`/api/pools`)

### 3.1 List Pools
Retrieves active or filtered group order pools with pagination and participant counts.

- **Method**: `GET`
- **Path**: `/api/pools`
- **Access**: Public
- **Query Parameters**:
  - `status`: Filter by pool state: `open` (default) | `funded` | `shipped` | `delivered` | `dead`
  - `category`: `Electronics` | `Fashion` | `Home & Kitchen` | `Beauty` | `Others`
  - `isPlatformPool`: `true` | `false`
  - `page`: Page number (default: `1`)
  - `limit`: Items per page (default: `20`, max: `50`)
- **Response `(200 OK)`**:
  ```json
  {
    "pools": [
      {
        "id": "7bfa254a-5f91-4e78-9e12-88241470471b",
        "title": "Temu Kitchen Gadgets & Blender Pool",
        "category": "Home & Kitchen",
        "itemScreenshotUrl": "https://...",
        "targetPesewas": 35000,
        "joinFeePesewas": 1000,
        "minPerPersonPesewas": 1000,
        "maxParticipants": 10,
        "deadlineAt": "2026-11-20T12:00:00.000Z",
        "itemCostDeadlineHours": 24,
        "status": "open",
        "participantCount": 3,
        "totalContributedPesewas": 21500,
        "isPlatformPool": false,
        "leader": {
          "id": "0df621a2-3f19-4cb4-8a43-cb2017e42d76",
          "name": "Ama Serwaa",
          "role": "leader"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
  ```

---

### 3.2 Get Pool By ID
Retrieves full details of a specific pool, including the breakdown of participants, cart items, deadline timestamps, and leader ratings.

- **Method**: `GET`
- **Path**: `/api/pools/:id`
- **Access**: Public
- **Response `(200 OK)`**:
  ```json
  {
    "pool": {
      "id": "7bfa254a-5f91-4e78-9e12-88241470471b",
      "title": "Temu Kitchen Gadgets & Blender Pool",
      "category": "Home & Kitchen",
      "itemScreenshotUrl": "https://...",
      "targetPesewas": 35000,
      "joinFeePesewas": 1000,
      "totalContributedPesewas": 21500,
      "participantCount": 3,
      "status": "open",
      "deadlineAt": "2026-11-20T12:00:00.000Z",
      "itemCostDeadlineHours": 24,
      "shipDeadlineAt": null,
      "trackingNumber": null,
      "leader": {
        "id": "0df621a2-3f19-4cb4-8a43-cb2017e42d76",
        "name": "Ama Serwaa",
        "phone": "+233240001122",
        "role": "leader",
        "createdAt": "2026-08-01T10:00:00.000Z"
      },
      "joins": [
        {
          "id": "416fb9bc-8833-4f90-a292-628d052a5c4e",
          "buyer": {
            "id": "e2a4b870-22c6-4d2b-98f9-4d6cb17c6e12",
            "name": "Kwame Mensah"
          },
          "contributionPesewas": 8500,
          "itemCostStatus": "pending",
          "deliveryStatus": "pending",
          "items": [
            {
              "id": "a98a0044-67f7-41ab-85a2-f947ee1c5d0e",
              "itemDescription": "Portable USB Blender",
              "temuItemUrl": "https://temu.to/m/...",
              "itemSpecs": "Black color, rechargeable 2000mAh",
              "quantity": 2,
              "estimatedCostGhs": 85.0,
              "itemScreenshotUrl": "https://..."
            }
          ]
        }
      ],
      "reviews": []
    }
  }
  ```

---

### 3.3 Create Pool
Creates a new group buying pool.

- **Method**: `POST`
- **Path**: `/api/pools`
- **Access**: Private (Verified Leaders with `leaderOnboardingStatus: "approved"`, or Admins)
- **Request Body**:
  ```json
  {
    "title": "Temu Wireless Earbuds & Cables Batch 5",
    "category": "Electronics",
    "itemScreenshotUrl": "https://res.cloudinary.com/.../preview.jpg",
    "targetPesewas": 35000,
    "minPerPersonPesewas": 1000,
    "maxParticipants": 10,
    "joinFeePesewas": 1000,
    "deadlineHours": 48,
    "itemCostDeadlineHours": 24,
    "platformCommissionBps": 1000
  }
  ```
  *Validation Rules:*
  - `title`: 3 to 120 characters
  - `targetPesewas`: Minimum 35,000 (GH₵ 350.00)
  - `minPerPersonPesewas`: Minimum 100 (GH₵ 1.00)
  - `maxParticipants`: 2 to 50
  - `joinFeePesewas`: 0 to 50,000 (GH₵ 0 to GH₵ 500)
  - `deadlineHours`: 24 to 72 hours
  - `itemCostDeadlineHours`: 12 to 48 hours
- **Response `(201 Created)`**:
  ```json
  {
    "message": "Pool created successfully",
    "pool": { ... }
  }
  ```

---

### 3.4 Early Close Pool
Allows a leader to close the pool early once it reaches or exceeds the GH₵ 350 cart floor ($$\ge 35{,}000\text{ pesewas}$$). Moves the pool from `open` to `funded`.

- **Method**: `PATCH`
- **Path**: `/api/pools/:id/close`
- **Access**: Private (Pool Leader or Admin)
- **Response `(200 OK)`**:
  ```json
  {
    "message": "Pool closed early and marked as funded",
    "pool": { ... }
  }
  ```

---

### 3.5 Recreate Dead Pool
Recreates an expired/dead pool once (`recreateCount < 1`) with an extended 48-hour deadline.

- **Method**: `POST`
- **Path**: `/api/pools/:id/recreate`
- **Access**: Private (Pool Leader or Admin)
- **Response `(201 Created)`**:
  ```json
  {
    "message": "Pool recreated successfully",
    "pool": { ... }
  }
  ```

---

## 4. Joins & Cart Building (`/api`)

### 4.1 Join Pool
Adds a buyer's cart items to an open pool.

*Payment Logic:*
- If buyer has platform wallet credit, credit is deducted first.
- Any remaining join fee is collected via Moolre MoMo.
- If total pool contribution reaches GH₵ 350, the pool is automatically locked into `funded` status.

- **Method**: `POST`
- **Path**: `/api/pools/:id/join`
- **Access**: Private (Buyer)
- **Request Body**:
  ```json
  {
    "momoPhone": "0241234567",
    "idempotencyKey": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "items": [
      {
        "itemDescription": "Rechargeable Desk Fan",
        "temuItemUrl": "https://temu.to/m/...",
        "itemSpecs": "White, 4-speed",
        "quantity": 1,
        "estimatedCostGhs": 55.0,
        "itemScreenshotUrl": "https://..."
      }
    ]
  }
  ```
- **Response `(201 Created)`**:
  ```json
  {
    "message": "Pool joined successfully",
    "poolJoin": {
      "id": "416fb9bc-8833-4f90-a292-628d052a5c4e",
      "poolId": "7bfa254a-5f91-4e78-9e12-88241470471b",
      "buyerId": "e2a4b870-22c6-4d2b-98f9-4d6cb17c6e12",
      "contributionPesewas": 5500,
      "itemCostStatus": "pending"
    },
    "payment": {
      "paidWithCredit": 1000,
      "moolrePaid": 0,
      "requiresMoolreOtp": false
    }
  }
  ```

---

### 4.2 Update Join
Updates cart items or specs while the join is still unlocked (`editableUntilPaid === true`).

- **Method**: `PATCH`
- **Path**: `/api/pool-joins/:id`
- **Access**: Private (Buyer who created join)
- **Request Body**:
  ```json
  {
    "contributionPesewas": 6000,
    "itemScreenshotUrl": "https://..."
  }
  ```
- **Response `(200 OK)`**:
  ```json
  {
    "message": "Join updated successfully",
    "poolJoin": { ... }
  }
  ```

---

### 4.3 Leave Pool
Voluntarily withdraws from a pool before the pool reaches the funded threshold.

- **Method**: `DELETE`
- **Path**: `/api/pool-joins/:id`
- **Access**: Private (Buyer who created join)
- **Response `(200 OK)`**:
  ```json
  {
    "message": "Voluntarily left pool successfully"
  }
  ```

---

## 5. Item Cost Payments & Two-Sided Lock-in (`/api`)

Once a pool is `funded`, buyers must send their item cost directly to the leader's MoMo number within the pool's `itemCostDeadlineHours` (e.g. 24 hours).

### 5.1 Upload Item-Cost Payment Proof
Buyer submits their MoMo receipt screenshot and transaction reference.

- **Method**: `POST`
- **Path**: `/api/pool-joins/:id/proof`
- **Access**: Private (Buyer)
- **Request Body**:
  ```json
  {
    "proofOfPaymentUrl": "https://res.cloudinary.com/.../receipt.png",
    "paymentReference": "TRX-982374619"
  }
  ```
- **Response `(200 OK)`**: Updates `itemCostStatus` from `"pending"` to `"paid"`.

---

### 5.2 Confirm Item Cost Received
Leader verifies the MoMo transfer in their mobile wallet and confirms the payment.

- **Method**: `POST`
- **Path**: `/api/pool-joins/:id/confirm-funded`
- **Access**: Private (Pool Leader)
- **Response `(200 OK)`**: Updates `itemCostStatus` from `"paid"` to `"confirmed_funded"`. Locks cart item editing.

---

## 6. Fulfillment & Logistics (`/api`)

### 6.1 Update SpeedAF Tracking
Leader inputs the SpeedAF express tracking code when Temu dispatches the pooled order from China to Ghana.

- **Method**: `POST`
- **Path**: `/api/pools/:id/tracking`
- **Access**: Private (Pool Leader)
- **Request Body**:
  ```json
  {
    "trackingNumber": "SP2411180092GH",
    "shippingProofImageUrl": "https://..."
  }
  ```
- **Response `(200 OK)`**: Transitions pool from `funded` to `shipped`. Notifies all buyers.

---

### 6.2 Mark Delivered by Leader
Leader marks an individual buyer's parcel as arrived at the local pickup hub (Accra, Kumasi, Tema) or handed over.

- **Method**: `POST`
- **Path**: `/api/pool-joins/:id/mark-delivered`
- **Access**: Private (Pool Leader)
- **Response `(200 OK)`**: Sets `deliveryStatus: "delivered_by_leader"`.

---

### 6.3 Confirm Delivery by Buyer
Buyer confirms receipt of items in good condition.

*Financial Ledger Consequence:*
- Atomically disburses the held join fee escrow into the leader's account balance.
- Unlocks the ability for the buyer to leave a review.

- **Method**: `POST`
- **Path**: `/api/pool-joins/:id/confirm-delivery`
- **Access**: Private (Buyer)
- **Response `(200 OK)`**: Sets `deliveryStatus: "confirmed_by_buyer"`.

---

## 7. Buyer Orders & Credit Wallet (`/api/me`)

### 7.1 Get My Orders
Lists all pool participations for the logged-in buyer, complete with item lists, tracking status, and current action required.

- **Method**: `GET`
- **Path**: `/api/me/orders`
- **Access**: Private (Buyer)
- **Response `(200 OK)`**:
  ```json
  {
    "orders": [
      {
        "id": "416fb9bc-8833-4f90-a292-628d052a5c4e",
        "contributionPesewas": 8500,
        "itemCostStatus": "confirmed_funded",
        "deliveryStatus": "delivered_by_leader",
        "proofOfPaymentUrl": "https://...",
        "pool": {
          "id": "7bfa254a-5f91-4e78-9e12-88241470471b",
          "title": "Temu Kitchen Gadgets & Blender Pool",
          "status": "shipped",
          "trackingNumber": "SP2411180092GH",
          "leader": {
            "name": "Ama Serwaa",
            "phone": "+233240001122"
          }
        },
        "items": [ ... ]
      }
    ]
  }
  ```

---

### 7.2 Get My Credit Balance & Ledger
Retrieves the buyer's reusable platform wallet balance and ledger history (refunds from dead pools, missed deadlines, or customer compensation).

- **Method**: `GET`
- **Path**: `/api/me/credit`
- **Access**: Private (Buyer)
- **Response `(200 OK)`**:
  ```json
  {
    "creditBalancePesewas": 2500,
    "creditBalanceGhs": 25.0,
    "ledger": [
      {
        "id": "c138da64-67d7-4b7b-8b5e-4bb2bc54fe54",
        "amountPesewas": 1000,
        "type": "credit",
        "reason": "pool_dead_refund",
        "createdAt": "2026-11-18T10:00:00.000Z"
      }
    ]
  }
  ```

---

## 8. Leader Operations Hub (`/api/leader`, `/api/leaders`)

### 8.1 Get Leader Dashboard
Aggregated metrics and actionable items for a pool leader.

- **Method**: `GET`
- **Path**: `/api/leader/dashboard`
- **Access**: Private (Verified Leader)
- **Response `(200 OK)`**:
  ```json
  {
    "totalPoolsCreated": 12,
    "activePools": 3,
    "completedPools": 8,
    "pendingPaymentProofs": 2,
    "pendingDeliveries": 4,
    "rating": 4.9,
    "pools": [ ... ]
  }
  ```

---

### 8.2 Get Leader Payouts
Breakdown of escrow releases and earnings from completed group pools.

- **Method**: `GET`
- **Path**: `/api/leader/payouts`
- **Access**: Private (Verified Leader)
- **Response `(200 OK)`**:
  ```json
  {
    "totalEarnedPesewas": 48000,
    "payouts": [ ... ]
  }
  ```

---

### 8.3 Get Public Leader Profile
Public reputation profile displaying leader stats, badges, and review ratings.

- **Method**: `GET`
- **Path**: `/api/leaders/:id`
- **Access**: Public
- **Response `(200 OK)`**:
  ```json
  {
    "leader": {
      "id": "0df621a2-3f19-4cb4-8a43-cb2017e42d76",
      "name": "Ama Serwaa",
      "cityHub": "Accra",
      "rating": 4.9,
      "poolsCompleted": 8,
      "totalMembersServed": 46
    }
  }
  ```

---

## 9. Disputes & Reviews (`/api`)

### 9.1 Raise Dispute
Opens an escrow dispute claim if a leader fails to fulfill goods or misses deadlines.

- **Method**: `POST`
- **Path**: `/api/pool-joins/:id/disputes`
- **Access**: Private (Buyer)
- **Request Body**:
  ```json
  {
    "type": "delivery_dispute",
    "reason": "Leader marked order delivered but parcel was not handed over at the pickup location",
    "evidenceUrl": "https://..."
  }
  ```
  *Allowed `type` values:*
  - `"funded_dispute"`
  - `"delivery_dispute"`
  - `"fraud_report"`
  - `"shipping_deadline_missed"`
- **Response `(201 Created)`**:
  ```json
  {
    "message": "Dispute submitted successfully",
    "dispute": { ... }
  }
  ```

---

### 9.2 Submit Leader Review
Submits 1-to-5 star rating and feedback after delivery confirmation.

- **Method**: `POST`
- **Path**: `/api/reviews`
- **Access**: Private (Buyer)
- **Request Body**:
  ```json
  {
    "poolId": "7bfa254a-5f91-4e78-9e12-88241470471b",
    "poolJoinId": "416fb9bc-8833-4f90-a292-628d052a5c4e",
    "rating": 5,
    "comment": "Super seamless pickup in East Legon! Will order again."
  }
  ```
- **Response `(201 Created)`**:
  ```json
  {
    "message": "Review created successfully",
    "review": { ... }
  }
  ```

---

## 10. Notifications (`/api/notifications`)

### 10.1 List Notifications
Retrieves in-app notification alerts for the authenticated user.

- **Method**: `GET`
- **Path**: `/api/notifications`
- **Access**: Private
- **Response `(200 OK)`**:
  ```json
  {
    "notifications": [
      {
        "id": "7dfb01e3-26db-4e50-a92c-62b1a82e987c",
        "type": "pool_funded",
        "title": "Pool Ready for Payment",
        "body": "Temu Kitchen Gadgets reached GH₵ 350. Please send item cost to leader.",
        "readAt": null,
        "createdAt": "2026-11-18T14:30:00.000Z"
      }
    ],
    "unreadCount": 1
  }
  ```

---

### 10.2 Mark Notification as Read
- **Method**: `PATCH`
- **Path**: `/api/notifications/:id/read`
- **Access**: Private

---

### 10.3 Mark All Notifications as Read
- **Method**: `PATCH`
- **Path**: `/api/notifications/read-all`
- **Access**: Private

---

## 11. Image Upload (`/api/upload`)

Uploads image files (Ghana Card KYC, live selfie, payment receipts, screenshots) directly to Cloudinary.

- **Method**: `POST`
- **Path**: `/api/upload`
- **Access**: Public / Private
- **Content-Type**: `multipart/form-data`
- **Form Field**: `image` (Accepted: `.jpg`, `.jpeg`, `.png`, `.webp` up to 10MB)
- **Response `(200 OK)`**:
  ```json
  {
    "url": "https://res.cloudinary.com/temu-group-order/image/upload/v1724200000/xyz123.jpg"
  }
  ```

---

## 12. Administration Console (`/api/admin`)

*(Restricted to users with role: `"admin"` or `"super_admin"`)*

### 12.1 List Leader Applications
Returns all leader KYC submissions with full Ghana Card and selfie URLs.
- **Method**: `GET`
- **Path**: `/api/admin/leader-applications`

### 12.2 Approve Leader
Upgrades a user to verified leader status.
- **Method**: `POST`
- **Path**: `/api/admin/leaders/:id/approve`

### 12.3 Suspend Leader
Suspends leader privileges with a recorded rationale.
- **Method**: `POST`
- **Path**: `/api/admin/leaders/:id/suspend`
- **Request Body**: `{ "reason": "Failure to fulfill goods within shipping window" }`

### 12.4 List Platform Disputes
- **Method**: `GET`
- **Path**: `/api/admin/disputes`

### 12.5 Adjudicate Dispute
Resolves an escrow claim in favor of either the buyer or the leader.
- **Method**: `PATCH`
- **Path**: `/api/admin/disputes/:id`
- **Request Body**:
  ```json
  {
    "status": "resolved_buyer",
    "adminNotes": "Tracking showed parcel was retained at regional hub."
  }
  ```
  *Allowed status:* `"resolved_buyer"` | `"resolved_leader"` | `"dismissed"`

---

## 13. Webhooks & System Health

### 13.1 Moolre Mobile Money Webhook
Inbound payment notification callback from Moolre. Automatically verifies `X-Moolre-Signature` using SHA-256 HMAC and idempotent transaction matching.
- **Method**: `POST`
- **Path**: `/api/webhooks/moolre`
- **Access**: Moolre Gateway only

### 13.2 Health Check
Returns deep diagnostic status: PostgreSQL connection, `pg-boss` background worker, and Temu minimum configuration.
- **Method**: `GET`
- **Path**: `/api/health`
- **Access**: Public
- **Response `(200 OK)`**:
  ```json
  {
    "status": "ok",
    "service": "fides-backend",
    "platform": "Fides Group Buying",
    "timestamp": "2026-11-18T17:10:00.000Z",
    "env": "development",
    "database": "connected",
    "queueWorker": "running",
    "minOrderGhs": 350
  }
  ```
