# Fides Group Buying Platform — Page & Component Architecture

This document defines the complete client-side page structure, component hierarchy, view routing, role access controls, and interactive modal flows for **Fides** (Ghana's Temu Group Buying Infrastructure).

---

## 🗺️ View Navigation Hierarchy

```
Fides Web Application
│
├── 🌐 Public Views (Accessible to all visitors)
│   ├── Home / Hero Section (Platform tagline, live pool statistics, CTA)
│   ├── Browse Pools View (Category tabs, minimum cart floor progress bars, filters)
│   ├── Pool Detail Modal / View (Target, min/max, cart breakdown, leader profile, trust badges)
│   ├── Leader Storefront / Profile Modal (Leader rating, verified badge, active/past pools)
│   ├── How It Works View (4-step buyer & leader process breakdown, Temu minimum order guide)
│   └── Leader Onboarding View (Application info, benefits, Ghana Card & selfie submission)
│
├── 👤 Buyer Views (Phone OTP Authentication Required)
│   ├── Auth Modal (Phone number input → 6-digit OTP verification)
│   ├── Multi-Item Join Pool Wizard (Multi-item cart builder, quantity, estimated cost, Cloudinary upload)
│   ├── My Orders & Buyer Ledger View (Active & historical order timelines, delivery confirmations)
│   ├── Payment Proof Upload Modal (MoMo payment receipt upload to leader)
│   └── Verified Buyer Review Modal (5-star rating & comment — unlocked post-delivery)
│
├── 👑 Pool Leader Views (Leader Role & Approved Onboarding Status Required)
│   ├── Create Pool Modal (Title, category, target, min/max participants, join fee, deadlines)
│   ├── Leader Dashboard View (Active pool management, earnings summary, payout log)
│   ├── Item-Cost Confirmation Manager (Review buyer payment proofs, confirm funded)
│   └── Fulfillment & Tracking Modal (Enter SpeedAF tracking number & waybill screenshot)
│
└── 🛡️ Admin Control Panel (Super Admin & Admin Roles Required)
    ├── Leader Applications Queue (Review Ghana Card submissions, approve/reject applicants)
    ├── Leader Management (Active leader directory, suspend leader controls)
    └── Dispute Resolution Center (Review delivery/item disputes, resolve to buyer/leader)
```

---

## 📄 Detailed Page & Component Specification

### 1. Public Views (No Auth Required)

#### 1.1 Home & Browse Pools View ([`client/src/components/HeroSection.tsx`](file:///Users/philipgibsoncudjoe/Projects/ReactJS/temu-group-order/client/src/components/HeroSection.tsx) & [`client/src/components/PoolCard.tsx`](file:///Users/philipgibsoncudjoe/Projects/ReactJS/temu-group-order/client/src/components/PoolCard.tsx))
- **Header Navigation Bar**: Brand logo (`Fides`), primary navigation tabs (Browse Pools, How It Works, Become a Leader), Notification Bell icon with live unread counter badge, and Auth/Profile controls.
- **Hero Section**: Value proposition ("Split Shipping. Reach Temu Minimums Together in Ghana"), platform statistics badge.
- **Category Filter Tabs**: All Categories, Electronics, Fashion, Home & Kitchen, Others (`null` category).
- **Pool Cards Grid**: Shows title, leader name & rating, category badge, minimum contribution per person, join fee, time remaining countdown, participant capacity, and **350 GHS Cart Floor Progress Bar**.

#### 1.2 Pool Detail Modal ([`client/src/components/PoolDetailModal.tsx`](file:///Users/philipgibsoncudjoe/Projects/ReactJS/temu-group-order/client/src/components/PoolDetailModal.tsx))
- Displays complete pool parameters (target, min contribution, participant cap, join fee).
- **Verified Leader Card**: Average star rating, total completed pools count, verified shield badge.
- **Current Participants & Cart Breakdown**: List of active participants and their multi-item cart submissions.
- **Temu Platform Buyer Guarantee Banner**: Explains 100% platform credit conversion if pool fails to reach 350 GHS.
- **CTA**: "Join Pool Now (GH₵ Fee)" button.

#### 1.3 How It Works View ([`client/src/views/HowItWorksView.tsx`](file:///Users/philipgibsoncudjoe/Projects/ReactJS/temu-group-order/client/src/views/HowItWorksView.tsx))
- **Step 1**: Find or Create a Pool (Browse active pools in Accra, Kumasi, Tema, etc.).
- **Step 2**: Join & Pay Join Fee (Pay leader join fee via Moolre MoMo, covered by platform credit if available).
- **Step 3**: Item-Cost Two-Sided Confirmation (Pay item cost to leader MoMo, both confirm funded).
- **Step 4**: SpeedAF Delivery & Reviews (Track package, confirm receipt, leave 5-star leader review).

#### 1.4 Leader Onboarding View ([`client/src/views/LeaderOnboardingView.tsx`](file:///Users/philipgibsoncudjoe/Projects/ReactJS/temu-group-order/client/src/views/LeaderOnboardingView.tsx))
- Onboarding information explaining leader earnings and platform escrow safety.
- **Application Form**:
  - Ghana Card Number (`GHA-XXXXXXXXX-X`)
  - Ghana Card Selfie Photo Verification (Cloudinary `ImageUploader`)
  - Primary Delivery City / Hub Region dropdown (Accra, Kumasi, Tema, Sunyani, Tamale, Cape Coast)
  - Leader Bio & Import Experience description

---

### 2. Buyer Views (Phone OTP Required)

#### 2.1 OTP Authentication Modal ([`client/src/components/AuthModal.tsx`](file:///Users/philipgibsoncudjoe/Projects/ReactJS/temu-group-order/client/src/components/AuthModal.tsx))
- **Step 1**: Enter 10-digit Ghana phone number (`024XXXXXXX`). Sends 6-digit SMS OTP via Moolre SMS Gateway.
- **Step 2**: Enter 6-digit verification code. Issues 30-day JWT session token and updates Zustand auth state.

#### 2.2 Multi-Item Cart Join Wizard ([`client/src/components/JoinPoolModal.tsx`](file:///Users/philipgibsoncudjoe/Projects/ReactJS/temu-group-order/client/src/components/JoinPoolModal.tsx))
- **Step 1: Multi-Item Cart Builder**:
  - `+ Add Another Item to Cart` button allowing buyers to add multiple items from Temu.
  - Per-item fields: Item Description/Title, Quantity, Size/Color Specs, Estimated Cost (GH₵), Temu web link, Cloudinary image screenshot.
  - Live **Total Cart Estimated Cost Banner**.
- **Step 2: Financial Breakdown & Payment**:
  - Cart items list review.
  - Moolre Mobile Money phone number input.
  - Fee calculation breakdown: Join Fee - Available Platform Credit = Net Mobile Money Charge.

#### 2.3 My Orders & Buyer Ledger View ([`client/src/views/BuyerOrdersView.tsx`](file:///Users/philipgibsoncudjoe/Projects/ReactJS/temu-group-order/client/src/views/BuyerOrdersView.tsx))
- **Platform Credit Balance Card**: Shows current reusable GHS credit balance and audit transaction log.
- **Active & Historical Orders List**: Shows order status stepper (`joined` → `item cost paid` → `funded` → `ordered` → `shipped` → `delivered`), list of cart items, SpeedAF tracking number, and action triggers:
  - Upload Item-Cost Payment Proof (`UploadProofModal`)
  - Confirm Package Delivered (`confirm-delivery`)
  - Leave Verified Leader Review (`ReviewModal`)

---

### 3. Pool Leader Views (Approved Leader Role Required)

#### 3.1 Create Pool Modal ([`client/src/components/CreatePoolModal.tsx`](file:///Users/philipgibsoncudjoe/Projects/ReactJS/temu-group-order/client/src/components/CreatePoolModal.tsx))
- Title, category selection (`Electronics`, `Fashion`, `Home & Kitchen`, `Others`), target pesewas, min contribution per person, max participants, join fee, join deadline (24h–72h), and item-cost deadline hours (12h–48h).

#### 3.2 Leader Dashboard View ([`client/src/views/LeaderDashboardView.tsx`](file:///Users/philipgibsoncudjoe/Projects/ReactJS/temu-group-order/client/src/views/LeaderDashboardView.tsx))
- **Overview Metrics**: Total Pools Led, Active Pools, Pending Proof Confirmations, Total Earnings.
- **Active Pools Management**:
  - List of participants and their multi-item cart submissions.
  - **Confirm Funded**: One-click leader confirmation when buyer item-cost payment is received.
  - **Update SpeedAF Tracking**: Triggers `UpdateTrackingModal` to enter tracking number & upload waybill image.

---

### 4. Admin Control Panel (Super Admin & Admin Roles Required)

#### 4.1 Admin Dashboard View ([`client/src/views/AdminDashboardView.tsx`](file:///Users/philipgibsoncudjoe/Projects/ReactJS/temu-group-order/client/src/views/AdminDashboardView.tsx))
- **Leader Onboarding Approvals Tab**: Review Ghana Card numbers & selfie photos, approve or reject applicant leaders.
- **Dispute Resolution Tab**: Inspect platform disputes (`funded_dispute`, `delivery_dispute`, `fraud_report`, `shipping_deadline_missed`), view buyer proofs, and resolve to buyer credit or leader payout.

---

## 🔒 Access Control Matrix

| Page / Component | Guest | Buyer | Leader | Admin / Super Admin |
|---|---|---|---|---|
| Home & Browse Pools | ✅ View | ✅ View | ✅ View | ✅ View |
| How It Works & Leader Info | ✅ View | ✅ View | ✅ View | ✅ View |
| Join Pool Modal | 🔒 OTP Login | ✅ Join | ✅ Join | ✅ Join |
| My Orders & Credit Ledger | ❌ Restricted | ✅ Access | ✅ Access | ✅ Access |
| Create Pool Modal | ❌ Restricted | 🔒 Requires Leader | ✅ Create | ✅ Create |
| Leader Dashboard | ❌ Restricted | 🔒 Requires Leader | ✅ Access | ✅ Access |
| Admin Panel & Disputes | ❌ Restricted | ❌ Restricted | ❌ Restricted | ✅ Full Access |
