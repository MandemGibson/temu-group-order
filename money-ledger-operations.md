# Money Ledger Operations — Explicit Prisma Transactions

Reference implementation for the three operations where money state must change atomically: disbursing a pool's join fees on success, voiding them to buyer credit on failure, and applying credit + top-up when a buyer joins a new pool. Each uses Prisma's interactive `$transaction` so every write inside either all commits or all rolls back together.

## 1. Disburse — pool succeeds (reaches `funded`)

Called once a pool crosses 350 cedis and is marked `funded`. Every `pending`/`paid` transaction tied to that pool's joins gets its split disbursed — leader share becomes withdrawable, platform share is recognized as revenue.

```typescript
async function disbursePoolTransactions(poolId: string) {
  return prisma.$transaction(async (tx) => {
    const pool = await tx.pool.findUniqueOrThrow({ where: { id: poolId } });

    if (pool.status !== "funded") {
      throw new Error(`Pool ${poolId} is not in funded status, cannot disburse`);
    }

    const joins = await tx.poolJoin.findMany({
      where: { poolId, transaction: { status: "paid" } },
      include: { transaction: true },
    });

    for (const join of joins) {
      if (!join.transaction) continue;

      await tx.transaction.update({
        where: { id: join.transaction.id },
        data: {
          status: "disbursed",
          disbursedAt: new Date(),
        },
      });

      // Leader's withdrawable balance is derived from summing disbursed
      // transactions where userId = leaderId — no separate balance column
      // to keep in sync. Platform revenue recognition works the same way.
    }

    return { disbursedCount: joins.length };
  });
}
```

## 2. Void to credit — pool dies

Called when the deadline sweep (or manual leader decline) marks a pool `dead`. The **full** join fee — platform and leader shares alike — converts to buyer credit. Nothing gets disbursed to either party.

```typescript
async function voidPoolTransactionsToCredit(poolId: string) {
  return prisma.$transaction(async (tx) => {
    const pool = await tx.pool.findUniqueOrThrow({ where: { id: poolId } });

    if (pool.status !== "dead") {
      throw new Error(`Pool ${poolId} is not dead, cannot void to credit`);
    }

    const joins = await tx.poolJoin.findMany({
      where: { poolId, transaction: { status: "paid" } },
      include: { transaction: true },
    });

    for (const join of joins) {
      if (!join.transaction) continue;

      await tx.transaction.update({
        where: { id: join.transaction.id },
        data: { status: "voided", voidedAt: new Date() },
      });

      await tx.buyerCredit.upsert({
        where: { userId: join.buyerId },
        create: { userId: join.buyerId, balancePesewas: join.transaction.amountPesewas },
        update: { balancePesewas: { increment: join.transaction.amountPesewas } },
      });

      await tx.buyerCredit.update({
        where: { userId: join.buyerId },
        data: {
          ledgerEntries: {
            create: {
              deltaPesewas: join.transaction.amountPesewas,
              reason: "dead_pool",
              relatedTransactionId: join.transaction.id,
            },
          },
        },
      });
    }

    return { voidedCount: joins.length };
  });
}
```

## 3. Apply credit + top-up — joining a new pool

Called when a buyer joins a pool whose fee exceeds their available credit. Applies as much credit as available, then creates a Moolre charge for the remainder. Credit consumption and the new transaction record happen together — a buyer should never end up with credit marked "spent" but no corresponding join.

```typescript
async function applyCreditAndCreateJoinTransaction(
  buyerId: string,
  poolId: string,
  joinFeePesewas: number,
) {
  return prisma.$transaction(async (tx) => {
    const credit = await tx.buyerCredit.findUnique({ where: { userId: buyerId } });
    const available = credit?.balancePesewas ?? 0;

    const creditApplied = Math.min(available, joinFeePesewas);
    const moolrePaid = joinFeePesewas - creditApplied;

    if (creditApplied > 0) {
      await tx.buyerCredit.update({
        where: { userId: buyerId },
        data: {
          balancePesewas: { decrement: creditApplied },
          ledgerEntries: {
            create: { deltaPesewas: -creditApplied, reason: "join_fee_spend" },
          },
        },
      });
    }

    const transaction = await tx.transaction.create({
      data: {
        userId: buyerId,
        amountPesewas: joinFeePesewas,
        creditAppliedPesewas: creditApplied,
        moolrePaidPesewas: moolrePaid,
        status: "pending",
        idempotencyKey: crypto.randomUUID(),
        leaderSharePesewas: 0, // computed once pool's commission rate is known
        platformSharePesewas: 0,
      },
    });

    return { transaction, creditApplied, moolrePaid };
  });
}
```

## Why these are wrapped this way

- **Atomicity**: if the process crashes mid-loop (e.g. after updating one `Transaction` but before crediting the buyer), the whole `$transaction` rolls back — you never end up with a voided transaction and no credit issued, or a partially-disbursed pool.
- **No separate balance columns to drift for payouts**: leader payout totals and platform revenue are always *derived* from summing `disbursed` transactions, not stored as a running balance that could get out of sync with the underlying records.
- **Credit is a single running balance per user** (`BuyerCredit.balancePesewas`), not lot-tracked rows — simpler to reason about and query. The `CreditLedgerEntry` table is an append-only log of what changed the balance and why, kept for support/audit visibility, but never summed to derive the balance itself — the balance column is always the source of truth.
