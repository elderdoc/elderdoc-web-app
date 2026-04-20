import { db } from '@/services/db'
import { payments, jobs, careRequests, users, caregiverProfiles, disputes } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'

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
