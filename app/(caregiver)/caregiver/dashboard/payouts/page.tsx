import { requireRole } from "@/domains/auth/session";
import { db } from "@/services/db";
import { caregiverProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCaregiverPayments, getUnbilledShiftsForCaregiver } from "@/domains/payments/queries";
import { calculateShiftHours } from "@/lib/shift-utils";

const statCard = (label: string, amount: number, sub?: string, muted?: boolean) => (
  <div className="rounded-xl border border-border bg-card px-5 py-4 flex-1">
    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
    <p className={`text-3xl font-bold ${muted ? 'text-muted-foreground' : ''}`}>
      ${amount.toFixed(2)}
    </p>
    {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
  </div>
)

export default async function CaregiverPayoutsPage() {
  const session = await requireRole("caregiver");
  const userId = session.user.id!;

  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, userId),
  });

  if (!profile) {
    return (
      <div className="p-4 lg:p-8 text-muted-foreground text-sm">
        Complete your profile to view payouts.
      </div>
    );
  }

  const [paymentRows, unbilledShifts] = await Promise.all([
    getCaregiverPayments(profile.id),
    getUnbilledShiftsForCaregiver(profile.id),
  ])

  const totalUpcoming = unbilledShifts.reduce(
    (sum, s) => sum + calculateShiftHours(s.startTime, s.endTime) * s.hourlyRate,
    0
  )

  const totalPending = paymentRows
    .filter((r) => r.status === "completed" && !r.releasedAt)
    .reduce((sum, r) => sum + r.amount, 0);

  const totalReleased = paymentRows
    .filter((r) => r.status === "completed" && r.releasedAt)
    .reduce((sum, r) => sum + r.amount, 0);

  const totalOverall = totalUpcoming + totalPending + totalReleased;

  return (
    <div className="p-4 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Payouts</h1>
          <p className="text-sm text-muted-foreground">
            Your earnings from completed shifts.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
        {statCard('Upcoming', totalUpcoming, 'Completed, not yet billed', true)}
        {statCard('Pending Release', totalPending, 'Billed, in 7-day hold', true)}
        {statCard('Released', totalReleased, 'Paid out to you')}
        {statCard('Total Overall', totalOverall, 'Lifetime earnings')}
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Payment History
        </p>
        {paymentRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No payments received yet.
          </p>
        ) : (
          <div className="space-y-2">
            {paymentRows.map((row) => (
              <div
                key={row.paymentId}
                className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium capitalize">{row.careType.replace(/-/g, ' ')}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.clientName} · {row.method} ·{" "}
                    {row.createdAt.toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">
                    ${row.amount.toFixed(2)}
                  </p>
                  <div className="flex gap-1 justify-end mt-1 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      row.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {row.status}
                    </span>
                    {row.status === "completed" && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        row.releasedAt
                          ? "bg-blue-100 text-blue-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {row.releasedAt ? "Released" : "Pending release"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
