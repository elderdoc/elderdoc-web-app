import { requireRole } from "@/domains/auth/session";
import { db } from "@/services/db";
import { caregiverProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCaregiverPayments } from "@/domains/payments/queries";
// import { SetupStripeConnectButton } from './_components/setup-stripe-connect-button'

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

  const paymentRows = await getCaregiverPayments(profile.id);

  const totalReleased = paymentRows
    .filter((r) => r.status === "completed" && r.releasedAt)
    .reduce((sum, r) => sum + r.amount, 0);

  const totalPending = paymentRows
    .filter((r) => r.status === "completed" && !r.releasedAt)
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="p-4 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Payouts</h1>
          <p className="text-sm text-muted-foreground">
            Your received payments from clients.
          </p>
        </div>
        {/* <SetupStripeConnectButton /> */}
      </div>

      <div className="flex gap-4 mb-8">
        <div className="rounded-xl border border-border bg-card px-5 py-4 flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Released</p>
          <p className="text-3xl font-bold">${(totalReleased / 100).toFixed(2)}</p>
        </div>
        {totalPending > 0 && (
          <div className="rounded-xl border border-border bg-card px-5 py-4 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Pending Release</p>
            <p className="text-3xl font-bold text-muted-foreground">${(totalPending / 100).toFixed(2)}</p>
          </div>
        )}
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
                  <p className="text-sm font-medium">{row.careType}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.clientName} · {row.method} ·{" "}
                    {row.createdAt.toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    ${(row.amount / 100).toFixed(2)}
                  </p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      row.status === "completed"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                    }`}
                  >
                    {row.status}
                  </span>
                  {row.status === "completed" && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      row.releasedAt
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                    }`}>
                      {row.releasedAt ? "Released" : "Pending release"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
