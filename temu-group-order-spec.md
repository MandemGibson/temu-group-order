# Temu Group-Order Platform — Product Spec

## 1. Concept

Temu requires a 350 cedi minimum order in Ghana. Buyers often can't reach that alone, or have items sitting in an abandoned cart. People already solve this informally by pooling orders with others and having one person receive and redistribute. This platform formalizes that pattern into infrastructure — not just for one person running pools, but for many trusted, onboarded "pool leaders" to run their own storefronts.

## 2. Actors

- **Buyers** — join pools to get their item included in a combined Temu order.
- **Pool leaders** — trusted, onboarded users who create and run pools, receive item-cost payments, place the real Temu order, and distribute items. Run like individual storefronts (Amazon third-party seller model).
- **Platform** — runs its own first-party pools in addition to listing leader-run pools. Takes a cut of every join fee.

## 3. Pool Structure

Each pool has:
- **Target amount** — the leader's planning goal (soft, not a hard gate)
- **Minimum per person** — smallest contribution a buyer can join with
- **Max participants** — cap on pool size
- **Hard floor: 350 cedis** — a pool can never close below this, regardless of target
- **Deadline** — leader-set, platform-enforced range of **24 hours to 3 days**

### Closing rules
- Pool **cannot close** below 350 cedis.
- Once above 350, the **leader can close at their own discretion**, even if the self-set target isn't reached. Target is a goal, not an enforcement gate.

## 4. Money Model

Two fully separate payment tracks:

### 4.1 Join fee (platform-controlled)
- **Set freely per pool by the leader** — not a platform-wide flat fee, no enforced range. Lives on the `Pool` entity.
- Paid by the buyer **directly via Moolre to the platform** when joining a pool.
- **Non-refundable as cash** — but converts to **platform credit** if the pool fails.
- Split between leader and platform per an agreed per-join commission (e.g. example used: 30 cedis fee, 10% platform commission = 3 cedis platform / 27 cedis leader).
- **Collection then disbursement model** (not a native instant split):
  1. Fee collected → `join_fee` transaction, status `pending`, with `pending_split` line items (leader share / platform share) computed but not paid out.
  2. **On pool success** (closed & eligible to ship): `pending_split` disburses — leader share becomes withdrawable, platform share recognized as revenue.
  3. **On pool failure** (dead pool): `join_fee` transaction voided, `pending_split` cancelled (nothing disbursed to either party). **Full fee amount (platform + leader shares) converts to buyer credit — platform keeps nothing on failure.**
- Idempotency key per join attempt + a "payment pending" state resolved via Moolre webhook/callback — prevents duplicate charges on retry.
- All monetary values stored/calculated internally as **integer pesewas**, not decimal cedis, to avoid rounding/floating-point errors.

### 4.2 Item cost (leader-controlled, off-platform)
- Leader uploads a screenshot of the item(s) + total value per joined user, shares their momo number and a payment reference.
- **Payment reference format**: buyer's name + last 4 digits of their phone number.
- Buyer pays **outside the platform** directly to the leader's momo.
- **Two-sided confirmation required**:
  1. Buyer uploads proof of payment AND explicitly confirms "I've paid."
  2. Leader separately reviews and confirms "funded."
  - Neither side's action alone is sufficient — both must confirm.
- **Sub-deadline**: **leader-set within a platform range of 12-48 hours**, applied per pool once it funds — if a buyer doesn't pay item cost / upload proof within that window, they're dropped from the pool and their join fee converts to credit.
  - Automated reminder notifications sent before the deadline to reduce accidental misses.
  - If a buyer actually paid but missed the upload deadline, recovery goes through the same dispute flag below — no separate late-upload exception.
- **Dispute path**: buyer can raise a manual flag ("I paid but wasn't marked funded"), surfaced for manual review using their uploaded proof. Covers both a leader failing to confirm and a buyer missing the upload deadline after having actually paid.

### 4.3 Platform credit
- Not withdrawable as cash — usable only toward joining future pools.
- If a new pool's join fee exceeds a buyer's credit balance, credit applies as partial payment and the buyer tops up the difference via Moolre.

## 5. Pool Failure & Recovery Flow

```
Pool created → Open for joins → [Target/350 met?]
                                    │
                          ┌─────────┴─────────┐
                         Yes                  No (deadline passed)
                          │                    │
                       Funded              Pool "dies"
                          │                    │
                    Ordered on Temu     Leader offered recreate option
                    (leader has 24-48h        │
                     to move to shipped)  ┌────┴────┐
                          │              Yes         No / 2nd failure
                       Shipped            │               │
                          │        Recreate (1x only,  Buyers freed —
                       Delivered    buyers auto-carried) fee stays as
                                          │              platform credit
                                    [dies again?]
                                          │
                                    Buyers freed
```

- **Dead pool**: deadline reached, 350 cedis not met. Leader cannot withdraw their join-fee split (payout only unlocks on success).
- **Recreation**: leader can recreate a dead pool once. Buyers already joined are **auto-carried** into the new pool (no manual rejoin).
- **Cap**: only **one recreate attempt** allowed. If the recreated pool also dies, buyers are freed — fee stays as platform credit, no longer auto-carried, leader must start a genuinely new pool.
- **Shipping deadline**: leader has a fixed **24-48 hours** after a pool closes to move it to "shipped" (place the Temu order, share tracking number). Not open-ended. **Missing it auto-escalates to a dispute** and is reflected on the leader's profile as a delivery-performance concern.
- **Delivered status is two-sided**: leader marks "delivered," buyer separately confirms receipt — same pattern as the "funded" confirmation. Neither side's word alone flips the status.

## 6. Buyer Actions & Rules

- **Auth**: phone OTP only (lightweight) — no full account/password system. Verified phone number is the buyer's identity across joins, reviews, and credit.
- **Recovery**: if a buyer loses access to their verified number, they recover via email (verify email → re-link identity/credit/history to new number). Email is a required field, not optional.
- **Editing**: buyer can edit their item/quantity after joining, **up until they pay item cost** — locked after payment.
- **Voluntary leave**: buyer can leave a pool before it closes, but their join fee is **fully forfeited** (no credit) — distinct from a platform/leader failure.
- **Reviews**: gated to **"delivered" status only** — must have actually received the item, not just joined, to leave a review. Review-eligibility itself is gated so a phone number can only review a leader it actually joined a pool with (prevents fake reviews).

## 7. Pool Leader Rules

- **Onboarding**: one-time fee of 30-50 cedis (possibly more) required before approval.
- **Identity verification**: Ghana Card + selfie required at onboarding.
- **Legal deterrent**: platform terms include a clause allowing a leader's identity info to be reported to police if there's evidence they ran off with item-cost money.
- **Suspension**: if a leader is suspended, their active/funded pools are allowed to finish — only creating new pools is blocked.
- **Liability**: platform terms explicitly disclaim liability for missing/damaged items — that risk sits with the leader/Temu/SpeedAF, not the platform.

## 8. Order Tracking

- Temu ships via SpeedAF. No direct public SpeedAF API exists — would require a multi-carrier tracking aggregator (AfterShip, 17TRACK, Track123, etc.).
- **Phase 2**: real tracking-number integration via one of these aggregators.
- **MVP**: leader is required to enter a tracking number as a **required field before marking a pool "shipped"** — no authenticity validation yet, purely informational for buyers.

## 9. Page Structure

### Public (no auth)
- Home / landing
- Browse pools (platform's own + all leaders', filterable)
- Pool detail page (target, min, max, progress, item screenshots, leader, join CTA)
- Pool leader profile / storefront (rating, reviews, active & past pools)
- How it works
- Become a pool leader (onboarding info)

### Buyer (phone OTP required)
- OTP verify / login
- Join pool flow (screenshot, contribution amount, Moolre payment)
- My orders (status per pool: joined → item cost paid → funded → ordered → shipped → delivered; tracking number; proof upload)
- Leave a review (only for leaders with a "delivered" order)

### Pool leader (OTP-verified + approved)
- Leader application (details, Ghana Card + selfie, onboarding fee)
- Leader dashboard (active pools, buyers pending "mark as funded," earnings overview)
- Create pool (target, min, max, deadline, item info)
- Pool management per pool (buyer list + status, item cost details/momo/reference, "mark funded" action, tracking number field, mark shipped/delivered)
- Earnings / payout history

### Later (not MVP)
- Admin panel (approve/reject leaders, handle disputes, monitor flagged pools)
- In-platform group chat, auto-created when a pool's target is met (Phase 2 — WhatsApp group link is a lighter interim alternative)

## 10. Deadlines Summary

| Stage | Window |
|---|---|
| Pool join window | 24 hours – 3 days (leader-set within this range) |
| Item cost payment / proof upload (after pool funds) | Leader-set within a 12-48 hour platform range |
| Leader ships (after pool closes) | 24–48 hours |
| Pool recreation | 1 attempt only |

## 11. Open Items for Later

- Exact duration for the item-cost payment sub-deadline
- Whether ID verification needs a third-party Ghana Card verification provider, or manual review initially
- Full legal review of the police-reporting clause in terms of service
- Whether volume caps for new leaders (smaller pools until proven) should complement identity verification
- Admin/dispute-resolution workflow details once disputes start coming in
