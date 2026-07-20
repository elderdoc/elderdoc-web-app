# Find Caregivers Filter Changes Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Simplify the Find Caregivers filter panel by hiding the certification filter behind a toggle and removing the languages filter entirely.

**Architecture:** Changes are isolated to the filter form component and the `searchCaregivers` domain function. No DB changes needed.

**Tech Stack:** Next.js 15, React, Drizzle ORM, Tailwind CSS

---

## Section 1: Certification Filter

### Current state
Multi-checkbox list of certifications, always visible.

### New behaviour
- Hidden by default
- A checkbox labeled "Special certifications needed" appears in its place
- When checked, a single `<select>` dropdown appears below it
- Dropdown options: None (default), CNA, HHA, Medication Aide, Medical Assistant, LVN, RN, Retired Nurse
- Default selected value: "None" (no filter applied)
- When "None" is selected, no certification filter is applied to the search query
- When unchecked, the dropdown is hidden and the filter is cleared

### Filter behaviour
Single-select: filters for caregivers who have that specific certification. When "None" or unchecked, no certification filter is applied.

## Section 2: Languages Filter

Remove the languages filter section entirely:
- Remove the multi-checkbox language list from `filter-form.tsx`
- Remove the `languages` parameter from the filter state and form submission
- Remove the language SQL filter from `searchCaregivers()` in `domains/clients/find-caregivers.ts`

## Files Touched
- `app/(client)/client/dashboard/find-caregivers/_components/filter-form.tsx` — replace certification checkboxes with toggle + dropdown, remove language checkboxes
- `domains/clients/find-caregivers.ts` — update `searchCaregivers` to accept single certification string (or null), remove language filter
