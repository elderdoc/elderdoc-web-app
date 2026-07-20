# Calendar Cancellation Notice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the shift cancellation confirmation modal in the client calendar to explicitly state the $50 late-cancellation fee.

**Architecture:** Single file change. The cancel confirmation modal in `components/calendar.tsx` already exists and already mentions the 4-hour window. Update the warning text to reference the $50 fee.

**Tech Stack:** Next.js 15, React, Tailwind CSS

---

## File Structure

| File | Change |
|------|--------|
| `components/calendar.tsx` | Update cancel modal text to mention $50 fee |

---

### Task 1: Update cancel confirmation modal text

**Files:**
- Modify: `components/calendar.tsx`

- [ ] **Step 1: Find the cancel modal text**

In `components/calendar.tsx`, find the cancel confirmation modal (around line 163). The current text reads:

```tsx
<p className="text-sm text-muted-foreground">
  If this shift starts within 4 hours, payment will still be charged. This cannot be undone.
</p>
```

- [ ] **Step 2: Update the text to mention $50 fee**

Replace it with:

```tsx
<p className="text-sm text-muted-foreground">
  Shifts cancelled with less than 4 hours notice will incur a <span className="font-medium text-foreground">$50 fee</span>. This cannot be undone.
</p>
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Manual test**

Start dev server. Navigate to `/client/dashboard/calendar`. Add a test shift scheduled within the next 4 hours (or trigger the cancel modal on any shift). Verify:
- The cancel modal appears when clicking "Cancel" on a shift
- The text reads "Shifts cancelled with less than 4 hours notice will incur a $50 fee. This cannot be undone."
- The $50 is visually distinct (bold)
- "Keep shift" and "Yes, cancel" buttons both work correctly

- [ ] **Step 5: Commit**

```bash
git add components/calendar.tsx
git commit -m "feat: update shift cancellation modal to display $50 late-cancellation fee warning"
```
