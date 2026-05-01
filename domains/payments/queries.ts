import { db } from '@/services/db'
import { payments, jobs, careRequests, users, caregiverProfiles, disputes, shifts } from '@/db/schema'
import { eq, and, desc, isNull } from 'drizzle-orm'

export interface PaymentRow {
  paymentId: string
  jobId: string
  careType: string
  caregiverName: string | null
  clientName: string | null
  amount: number
  fee: number
  method: 'stripe'
  status: 'pending' | 'completed' | 'failed'
  stripePaymentIntentId: string | null
  stripeInvoiceId: string | null
  createdAt: Date
  releasedAt: Date | null
}

export interface DisputeRow {
  disputeId: string
  jobId: string
  paymentId: string | null
  reason: string
  status: 'open' | 'resolved' | 'withdrawn'
  createdAt: Date
}

export interface UnbilledShiftRow {
  shiftId: string
  jobId: string
  careType: string
  caregiverName: string | null
  date: string
  startTime: string
  endTime: string
  hourlyRate: number
}

export async function getClientPayments(clientId: string): Promise<PaymentRow[]> {
  const rows = await db
    .select({
      paymentId: payments.id,
      jobId: payments.jobId,
      careType: careRequests.careType,
      caregiverName: users.name,
      amount: payments.amount,
      fee: payments.fee,
      method: payments.method,
      status: payments.status,
      stripePaymentIntentId: payments.stripePaymentIntentId,
      stripeInvoiceId: payments.stripeInvoiceId,
      createdAt: payments.createdAt,
      releasedAt: payments.releasedAt,
    })
    .from(payments)
    .innerJoin(jobs, eq(payments.jobId, jobs.id))
    .innerJoin(careRequests, eq(jobs.requestId, careRequests.id))
    .innerJoin(caregiverProfiles, eq(jobs.caregiverId, caregiverProfiles.id))
    .innerJoin(users, eq(caregiverProfiles.userId, users.id))
    .where(eq(jobs.clientId, clientId))
    .orderBy(desc(payments.createdAt))
    .limit(100)
    .offset(0)

  return rows.map((r) => ({
    paymentId: r.paymentId,
    jobId: r.jobId,
    careType: r.careType,
    caregiverName: r.caregiverName ?? null,
    clientName: null,
    amount: Number(r.amount),
    fee: Number(r.fee),
    method: r.method,
    status: (r.status ?? 'pending') as 'pending' | 'completed' | 'failed',
    stripePaymentIntentId: r.stripePaymentIntentId ?? null,
    stripeInvoiceId: r.stripeInvoiceId ?? null,
    createdAt: r.createdAt,
    releasedAt: r.releasedAt ?? null,
  }))
}

export async function getCaregiverPayments(caregiverId: string): Promise<PaymentRow[]> {
  const rows = await db
    .select({
      paymentId: payments.id,
      jobId: payments.jobId,
      careType: careRequests.careType,
      clientName: users.name,
      amount: payments.amount,
      fee: payments.fee,
      method: payments.method,
      status: payments.status,
      stripePaymentIntentId: payments.stripePaymentIntentId,
      stripeInvoiceId: payments.stripeInvoiceId,
      createdAt: payments.createdAt,
      releasedAt: payments.releasedAt,
    })
    .from(payments)
    .innerJoin(jobs, eq(payments.jobId, jobs.id))
    .innerJoin(careRequests, eq(jobs.requestId, careRequests.id))
    .innerJoin(users, eq(jobs.clientId, users.id))
    .where(eq(jobs.caregiverId, caregiverId))
    .orderBy(desc(payments.createdAt))
    .limit(100)
    .offset(0)

  return rows.map((r) => ({
    paymentId: r.paymentId,
    jobId: r.jobId,
    careType: r.careType,
    caregiverName: null,
    clientName: r.clientName ?? null,
    amount: Number(r.amount),
    fee: Number(r.fee),
    method: r.method,
    status: (r.status ?? 'pending') as 'pending' | 'completed' | 'failed',
    stripePaymentIntentId: r.stripePaymentIntentId ?? null,
    stripeInvoiceId: r.stripeInvoiceId ?? null,
    createdAt: r.createdAt,
    releasedAt: r.releasedAt ?? null,
  }))
}

export async function getOpenDisputesForClient(clientId: string): Promise<DisputeRow[]> {
  const rows = await db
    .select({
      disputeId: disputes.id,
      jobId: disputes.jobId,
      paymentId: disputes.paymentId,
      reason: disputes.reason,
      status: disputes.status,
      createdAt: disputes.createdAt,
    })
    .from(disputes)
    .where(and(eq(disputes.clientId, clientId), eq(disputes.status, 'open')))
    .orderBy(desc(disputes.createdAt))
    .limit(100)

  return rows.map((r) => ({
    disputeId: r.disputeId,
    jobId: r.jobId,
    paymentId: r.paymentId ?? null,
    reason: r.reason,
    status: r.status,
    createdAt: r.createdAt,
  }))
}

export async function getUnbilledShiftsForCaregiver(caregiverId: string): Promise<UnbilledShiftRow[]> {
  const rows = await db
    .select({
      shiftId: shifts.id,
      jobId: shifts.jobId,
      careType: careRequests.careType,
      caregiverName: users.name,
      date: shifts.date,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      hourlyRate: careRequests.budgetMin,
    })
    .from(shifts)
    .innerJoin(jobs, eq(shifts.jobId, jobs.id))
    .innerJoin(careRequests, eq(jobs.requestId, careRequests.id))
    .innerJoin(caregiverProfiles, eq(jobs.caregiverId, caregiverProfiles.id))
    .innerJoin(users, eq(caregiverProfiles.userId, users.id))
    .where(
      and(
        eq(jobs.caregiverId, caregiverId),
        eq(shifts.status, 'completed'),
        isNull(shifts.billedAt),
      )
    )
    .orderBy(shifts.date, shifts.startTime)
    .limit(500)

  return rows.map((r) => ({
    shiftId: r.shiftId,
    jobId: r.jobId,
    careType: r.careType,
    caregiverName: r.caregiverName ?? null,
    date: r.date,
    startTime: r.startTime,
    endTime: r.endTime,
    hourlyRate: Number(r.hourlyRate ?? 0),
  }))
}

export async function getUnbilledShiftsForClient(clientId: string): Promise<UnbilledShiftRow[]> {
  const rows = await db
    .select({
      shiftId: shifts.id,
      jobId: shifts.jobId,
      careType: careRequests.careType,
      caregiverName: users.name,
      date: shifts.date,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      hourlyRate: careRequests.budgetMin,
    })
    .from(shifts)
    .innerJoin(jobs, eq(shifts.jobId, jobs.id))
    .innerJoin(careRequests, eq(jobs.requestId, careRequests.id))
    .innerJoin(caregiverProfiles, eq(jobs.caregiverId, caregiverProfiles.id))
    .innerJoin(users, eq(caregiverProfiles.userId, users.id))
    .where(
      and(
        eq(jobs.clientId, clientId),
        eq(shifts.status, 'completed'),
        isNull(shifts.billedAt),
      )
    )
    .orderBy(shifts.date, shifts.startTime)
    .limit(500)

  return rows.map((r) => ({
    shiftId: r.shiftId,
    jobId: r.jobId,
    careType: r.careType,
    caregiverName: r.caregiverName ?? null,
    date: r.date,
    startTime: r.startTime,
    endTime: r.endTime,
    hourlyRate: Number(r.hourlyRate ?? 0),
  }))
}
