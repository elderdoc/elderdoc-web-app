# Calendar Cancellation Notice Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show a $50 late-cancellation fee warning when a client attempts to cancel a shift within 4 hours of its start time, requiring explicit confirmation before proceeding.

**Architecture:** The 4-hour late-cancellation detection already exists in `domains/clients/calendar.ts`. This change adds a UI confirmation step only — no backend logic changes needed.

**Tech Stack:** Next.js 15, React, Tailwind CSS

---

## Section 1: Warning Flow

When the client clicks "Cancel shift":

1. Check if the shift start time is within 4 hours from now (client-side, same logic as server)
2. **If within 4 hours:** Show a confirmation dialog/modal with the message:
   > "Shifts cancelled with less than 4 hours notice will incur a $50 fee. Are you sure you want to cancel?"
   
   Two buttons: "Go back" (dismisses) and "Cancel shift" (proceeds with cancellation)

3. **If more than 4 hours away:** Proceed directly with cancellation (existing behaviour) or show a simple "Are you sure?" confirmation

## Section 2: Implementation Detail

The client-side check:
```typescript
function isLateCancellation(date: string, startTime: string): boolean {
  const [h, m] = startTime.split(':').map(Number)
  const shiftStart = new Date(`${date}T${startTime}`)
  return (shiftStart.getTime() - Date.now()) < 4 * 60 * 60 * 1000
}
```

The warning is purely informational — it does not block the cancellation or automatically charge the $50 fee (fee collection is a separate business process).

## Files Touched
- The client calendar shift component where the cancel button lives (find via the shift cancel UI in `app/(client)/client/dashboard/calendar/`)
