# Fides (fidesgh.com) — Documentation Bundle

A marketplace platform for pooling Temu orders in Ghana to meet the 350 cedi cart minimum, run by onboarded pool leaders alongside the platform's own pools. This bundle is everything decided so far — read in this order.

## Read in this order

1. **`temu-group-order-spec.md`** — start here. The product spec: business rules, the pool lifecycle, money model, every edge case and deadline, page structure. This is "what the product does and why," no code.
2. **`schema.prisma`** — the full data model. Read this once the spec makes sense; the entities and their fields map directly to the rules in the spec.
3. **`temu-group-order-system-design.md`** — the architecture: high-level system diagram, ERD, state machines, sequence diagrams for every major flow, the full API endpoint list, and the background jobs table. This is "how the pieces fit together and talk to each other."
4. **`money-ledger-operations.md`** — reference implementation for the three operations where money correctness matters most: disbursing a pool's fees on success, voiding them to buyer credit on failure, and applying credit + Moolre top-up when joining a new pool. Read this last, once you're actually about to write the payment code.
5. **`notification-system.md`** — every notification event in the system, which channel(s) it goes out on, and how delivery works (queued through pg-boss, same as background jobs). Includes the `Notification` schema addition.

## What's settled

Every business rule, deadline, state transition, and money-flow decision in the four documents above reflects an actual decision made — not a guess or a default I picked silently. Where something genuinely wasn't decided, it's called out explicitly below rather than left ambiguous in the docs.

## What's still open

These are the real gaps — things worth resolving before or during build, not just documentation debt:

1. **SMS/OTP provider** — check Moolre's docs for built-in SMS support before adding a separate provider (Africa's Talking or Twilio as fallback if not).
2. **Identity verification for MVP** — decided to go manual (founder reviews Ghana Card + selfie) rather than a paid KYC API like Smile ID, until volume makes manual review a bottleneck. This does **not** remove the need for DPC registration and explicit consent language — those apply regardless of manual vs. automated verification.
3. **Legal review** — the police-reporting clause in the terms of service, and the Ghana Data Protection Act consent/registration language, both need an actual legal read before launch. This is the one item on this list that isn't a technical decision — get a real consult.
4. **Exact grace period** for automated dispute defaults (e.g. how long before a `shipping_deadline_missed` dispute auto-resolves toward the buyer if the leader doesn't respond).
5. **Exact threshold** for the leader delivery-performance warning (e.g. 3+ missed shipping deadlines before it becomes visible on their profile).
6. **Volume caps for new leaders** — not decided whether smaller pools for unproven leaders should complement Ghana Card verification as a second layer of fraud protection.

## Current build-order recommendation

1. Scaffold Node/Express/Prisma project. Prisma 7 requires a driver adapter for Postgres (`@prisma/adapter-pg`) plus a `prisma.config.ts` for connection config — see the included template. Run the initial migration from `schema.prisma`. Note: Prisma 8 is in Release Candidate as of this writing — check current docs before assuming v7 conventions still apply.
2. Build OTP auth end-to-end first — everything else depends on it
3. Pool CRUD (leader creates, buyer browses/joins)
4. Moolre integration — join fee payment + webhook handling (see `money-ledger-operations.md`)
5. Item-cost two-sided confirmation flow
6. Background jobs — deadline sweeps, reminders (this is what makes every deadline rule actually enforce itself; nothing here is automatic without it)
7. Reviews, disputes, leader dashboard

## Status

Product spec: complete. Data model: complete. Architecture: complete. Money-ledger logic: complete with a resolved credit-balance model. Notification system: complete, SMS provider still pending. Remaining open items are legal/vendor research, not product decisions.
