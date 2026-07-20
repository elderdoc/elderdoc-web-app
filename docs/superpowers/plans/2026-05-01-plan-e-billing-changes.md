# Billing Changes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 1% Trust & Support fee with two line items — 8% Convenience fee + 3% Trust & Support fee (11% total) — and reduce the dispute auto-resolution window from 14 days to 7 days.

**Architecture:** Fee constants are inlined in three places: `billing-client.tsx` (display + upcoming calc), `weekly-billing/route.ts` (actual charge), and `payment-history-card.tsx` (label). All three are updated. The dispute window is a single constant in `resolve-disputes/route.ts`.

**Tech Stack:** Next.js 15, React, Drizzle ORM, Tailwind CSS

---

## File Structure

| File | Change |
|------|--------|
| `app/(client)/client/dashboard/billing/_components/billing-client.tsx` | Update fee calc, display two line items, update FeeInfoPopover |
| `app/(client)/client/dashboard/billing/_components/payment-history-card.tsx` | Update fee label text |
| `app/api/cron/weekly-billing/route.ts` | Update fee from 0.01 to 0.11 |
| `app/api/cron/resolve-disputes/route.ts` | Change 14 to 7 days |

---

### Task 1: Update billing-client.tsx — calculations and display

**Files:**
- Modify: `app/(client)/client/dashboard/billing/_components/billing-client.tsx`

- [ ] **Step 1: Update totalUpcoming calculation**

Find (around line 88):
```typescript
const totalUpcoming = unbilledShifts.reduce(
  (sum, s) => sum + calculateShiftHours(s.startTime, s.endTime) * s.hourlyRate * 1.01,
  0
)
```

Replace with:
```typescript
const totalUpcoming = unbilledShifts.reduce(
  (sum, s) => sum + calculateShiftHours(s.startTime, s.endTime) * s.hourlyRate * 1.11,
  0
)
```

- [ ] **Step 2: Update the upcoming charge card breakdown — add two fee line items**

Find the upcoming charges section (around line 146) where per-job subtotal and fee are computed:
```typescript
const subtotal = jobShifts.reduce(
  (sum, s) => sum + calculateShiftHours(s.startTime, s.endTime) * s.hourlyRate,
  0
)
const fee = subtotal * 0.01
const total = subtotal + fee
```

Replace with:
```typescript
const subtotal = jobShifts.reduce(
  (sum, s) => sum + calculateShiftHours(s.startTime, s.endTime) * s.hourlyRate,
  0
)
const convenienceFee = subtotal * 0.08
const trustFee = subtotal * 0.03
const total = subtotal + convenienceFee + trustFee
```

- [ ] **Step 3: Update the fee display rows to show two line items**

Find the fee row in the JSX (around line 178):
```tsx
<div className="flex justify-between text-muted-foreground">
  <span className="flex items-center">
    Trust &amp; Support fee (1%)
    <FeeInfoPopover />
  </span>
  <span>${fee.toFixed(2)}</span>
</div>
```

Replace with:
```tsx
<div className="flex justify-between text-muted-foreground">
  <span>Convenience fee (8%)</span>
  <span>${convenienceFee.toFixed(2)}</span>
</div>
<div className="flex justify-between text-muted-foreground">
  <span className="flex items-center">
    Trust &amp; Support fee (3%)
    <FeeInfoPopover />
  </span>
  <span>${trustFee.toFixed(2)}</span>
</div>
```

- [ ] **Step 4: Update FeeInfoPopover content**

Find the `FeeInfoPopover` component (lines ~10-68). Update the content text to reflect the two-fee structure:

```tsx
<div className="bg-primary/5 border-b border-border px-4 py-3">
  <p className="text-sm font-semibold">What are Eldcare's fees?</p>
</div>
<div className="px-4 py-3 space-y-3 text-xs text-muted-foreground leading-relaxed">
  <p>
    Eldcare applies an <span className="font-medium text-foreground">8% Convenience fee</span> and a <span className="font-medium text-foreground">3% Trust &amp; Support fee</span> to all invoices as separate line items. Expenses and reimbursements are not subject to these fees.
  </p>
  <div>
    <p className="font-medium text-foreground mb-1.5">The Trust &amp; Support fee helps fund:</p>
    <ul className="space-y-1 list-none">
      {[
        'The Eldcare Pledge',
        'Operational and safety measures to protect users',
        'Investment in our Customer Support Team',
        'Tools, team training, and channels to help you get care completed',
      ].map(item => (
        <li key={item} className="flex items-start gap-1.5">
          <span className="mt-0.5 text-primary">✓</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </div>
  <p className="border-t border-border pt-2.5">
    These fees <span className="font-medium text-foreground">don't affect what a caregiver is paid</span>. All expenses and tips go directly to your caregiver.
  </p>
</div>
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/\(client\)/client/dashboard/billing/_components/billing-client.tsx
git commit -m "feat: update billing to 8% convenience fee + 3% trust fee, update fee popover"
```

---

### Task 2: Update payment-history-card.tsx fee label

**Files:**
- Modify: `app/(client)/client/dashboard/billing/_components/payment-history-card.tsx`

- [ ] **Step 1: Find the fee label text**

In `payment-history-card.tsx` (around line 60):
```tsx
{fee > 0 && (
  <p className="text-[10px] text-muted-foreground">
    incl. ${fee.toFixed(2)} Trust &amp; Support fee
  </p>
)}
```

- [ ] **Step 2: Update the label**

Replace with:
```tsx
{fee > 0 && (
  <p className="text-[10px] text-muted-foreground">
    incl. ${fee.toFixed(2)} fees (11%)
  </p>
)}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(client\)/client/dashboard/billing/_components/payment-history-card.tsx
git commit -m "feat: update payment history card fee label to reflect 11% total fee"
```

---

### Task 3: Update weekly billing cron — fee rate

**Files:**
- Modify: `app/api/cron/weekly-billing/route.ts`

- [ ] **Step 1: Find the fee calculation**

In `weekly-billing/route.ts` (around line 74):
```typescript
const feeCents = Math.round(subtotalCents * 0.01)
```

- [ ] **Step 2: Update to 11%**

Replace with:
```typescript
const feeCents = Math.round(subtotalCents * 0.11)
```

- [ ] **Step 3: Commit**

```bash
git add app/api/cron/weekly-billing/route.ts
git commit -m "feat: update weekly billing cron fee from 1% to 11% (8% convenience + 3% trust)"
```

---

### Task 4: Update dispute auto-resolution — 14 days to 7 days

**Files:**
- Modify: `app/api/cron/resolve-disputes/route.ts`

- [ ] **Step 1: Find the cutoff constant**

In `resolve-disputes/route.ts` (line 12):
```typescript
const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
```

- [ ] **Step 2: Change to 7 days**

Replace with:
```typescript
const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
```

- [ ] **Step 3: Commit**

```bash
git add app/api/cron/resolve-disputes/route.ts
git commit -m "feat: reduce dispute auto-resolution window from 14 days to 7 days"
```

---

### Task 5: Build verification

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 2: Build**

```bash
npm run build
```
Expected: build completes successfully with no errors.

- [ ] **Step 3: Manual verification**

Start dev server. Navigate to `/client/dashboard/billing`. Verify:
- The upcoming charge breakdown shows two fee rows: "Convenience fee (8%)" and "Trust & Support fee (3%)"
- Clicking the info icon on Trust & Support fee opens the updated popover mentioning both fees
- Payment history cards show "incl. $X.XX fees (11%)" on each row
- The stat cards correctly calculate upcoming amounts using 1.11 multiplier
