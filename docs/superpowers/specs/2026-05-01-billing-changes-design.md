# Billing Changes Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the single 1% Trust & Support fee with two line items (8% Convenience fee + 3% Trust & Support fee = 11% total), and reduce the dispute auto-resolution window from 14 days to 7 days.

**Architecture:** Fee changes touch billing calculations, display labels, and the FeeInfoPopover. Dispute window change is a single constant in the cron route. No DB schema changes needed — the `fee` column already stores the total fee amount.

**Tech Stack:** Next.js 15, React, Drizzle ORM, Tailwind CSS

---

## Section 1: Fee Restructure

### New fee structure
| Line item | Rate | 
|-----------|------|
| Convenience fee | 8% |
| Trust & Support fee | 3% |
| **Total** | **11%** |

### Billing display
The upcoming charges section shows two fee line items instead of one:
```
Subtotal                        $X.XX
Convenience fee (8%)            $X.XX
Trust & Support fee (3%)        $X.XX
─────────────────────────────────────
Total due Sunday                $X.XX
```

### Calculation changes
- Old: `fee = subtotal * 0.01`, `total = subtotal * 1.01`
- New: `fee = subtotal * 0.11`, `total = subtotal * 1.11`
- The `fee` column in payments stores the combined fee (11% of subtotal)
- `totalUpcoming` calculation: `hours * rate * 1.11`

### FeeInfoPopover update
Update the popover content to reflect the two-fee structure:
- "Eldcare applies an 8% Convenience fee and a 3% Trust & Support fee to all invoices as separate line items."
- Update the checklist items and description accordingly

### Files touched
- `app/(client)/client/dashboard/billing/_components/billing-client.tsx` — fee line items, calculations, popover content
- `domains/payments/actions.ts` — update `recordInvoicePayment` fee calculation if hardcoded there

## Section 2: Dispute Window — 14 Days → 7 Days

Change the auto-resolution cutoff from 14 days to 7 days:

```typescript
// app/api/cron/resolve-disputes/route.ts
// Old:
const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
// New:
const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
```

Also update any UI copy that references the 14-day window (e.g., in `PaymentHistoryCard` or `DisputeModal`) to say 7 days.

## Files Touched
- `app/(client)/client/dashboard/billing/_components/billing-client.tsx`
- `domains/payments/actions.ts`
- `app/api/cron/resolve-disputes/route.ts`
- `app/(client)/client/dashboard/billing/_components/dispute-modal.tsx` (if it mentions day count)
- `app/(client)/client/dashboard/billing/_components/payment-history-card.tsx` (if it mentions day count)
