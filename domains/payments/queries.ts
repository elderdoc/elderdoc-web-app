import { db } from '@/services/db'
import { payments, jobs, careRequests, users, caregiverProfiles } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'

export interface PaymentRow {
  paymentId: string
  jobId: string
  careType: string
  caregiverName: string | null
  clientName: string | null
  amount: number
  method: string
  status: string
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
      method: payments.method,
      status: payments.status,
      createdAt: payments.createdAt,
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
    method: r.method,
    status: r.status ?? '',
    createdAt: r.createdAt,
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
      method: payments.method,
      status: payments.status,
      createdAt: payments.createdAt,
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
    method: r.method,
    status: r.status ?? '',
    createdAt: r.createdAt,
  }))
}
