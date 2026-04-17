import { requireRole } from '@/domains/auth/session'

export default async function CaregiverDashboardLayout({ children }: { children: React.ReactNode }) {
  await requireRole('caregiver')
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Sidebar — Phase 6</p>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
