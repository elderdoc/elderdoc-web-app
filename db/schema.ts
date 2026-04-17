import {
  pgTable, uuid, text, timestamp, boolean,
  integer, numeric, jsonb, primaryKey, check,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

export const users = pgTable('users', {
  id:        uuid('id').defaultRandom().primaryKey(),
  email:     text('email').notNull().unique(),
  name:      text('name'),
  image:     text('image'),
  phone:     text('phone'),
  role:      text('role', { enum: ['client', 'caregiver'] }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const caregiverProfiles = pgTable('caregiver_profiles', {
  id:            uuid('id').defaultRandom().primaryKey(),
  userId:        uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  headline:      text('headline'),
  about:         text('about'),
  photoUrl:      text('photo_url'),
  hourlyMin:     numeric('hourly_min', { precision: 10, scale: 2 }),
  hourlyMax:     numeric('hourly_max', { precision: 10, scale: 2 }),
  experience:    text('experience'),
  education:     text('education'),
  relocatable:   boolean('relocatable').default(false),
  status:        text('status', { enum: ['pending', 'active', 'inactive'] }).default('pending'),
  completedStep: integer('completed_step').default(0),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
})

export const caregiverCareTypes = pgTable('caregiver_care_types', {
  caregiverId: uuid('caregiver_id').notNull().references(() => caregiverProfiles.id, { onDelete: 'cascade' }),
  careType:    text('care_type').notNull(),
}, (t) => [primaryKey({ columns: [t.caregiverId, t.careType] })])

export const caregiverCertifications = pgTable('caregiver_certifications', {
  caregiverId:   uuid('caregiver_id').notNull().references(() => caregiverProfiles.id, { onDelete: 'cascade' }),
  certification: text('certification').notNull(),
}, (t) => [primaryKey({ columns: [t.caregiverId, t.certification] })])

export const caregiverLanguages = pgTable('caregiver_languages', {
  caregiverId: uuid('caregiver_id').notNull().references(() => caregiverProfiles.id, { onDelete: 'cascade' }),
  language:    text('language').notNull(),
}, (t) => [primaryKey({ columns: [t.caregiverId, t.language] })])

export const caregiverWorkPrefs = pgTable('caregiver_work_prefs', {
  id:                  uuid('id').defaultRandom().primaryKey(),
  caregiverId:         uuid('caregiver_id').notNull().references(() => caregiverProfiles.id, { onDelete: 'cascade' }),
  workType:            text('work_type'),
  shift:               text('shift'),
  day:                 text('day'),
  travelDistanceMiles: integer('travel_distance_miles'),
  startAvailability:   text('start_availability'),
})

export const caregiverLocations = pgTable('caregiver_locations', {
  id:          uuid('id').defaultRandom().primaryKey(),
  caregiverId: uuid('caregiver_id').notNull().unique().references(() => caregiverProfiles.id, { onDelete: 'cascade' }),
  address1:    text('address1'),
  address2:    text('address2'),
  city:        text('city'),
  state:       text('state'),
  lat:         numeric('lat', { precision: 10, scale: 7 }),
  lng:         numeric('lng', { precision: 10, scale: 7 }),
})

export const careRecipients = pgTable('care_recipients', {
  id:           uuid('id').defaultRandom().primaryKey(),
  clientId:     uuid('client_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  relationship: text('relationship'),
  name:         text('name').notNull(),
  dob:          text('dob'),
  phone:        text('phone'),
  gender:       text('gender'),
  photoUrl:     text('photo_url'),
  address:      jsonb('address').$type<{
    address1?: string; address2?: string; city?: string; state?: string
  }>(),
  conditions:   text('conditions').array(),
  mobilityLevel:text('mobility_level'),
  notes:        text('notes'),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
})

export const careRequests = pgTable('care_requests', {
  id:           uuid('id').defaultRandom().primaryKey(),
  clientId:     uuid('client_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  recipientId:  uuid('recipient_id').references(() => careRecipients.id, { onDelete: 'set null' }),
  title:        text('title'),
  description:  text('description'),
  careType:     text('care_type').notNull(),
  frequency:    text('frequency'),
  days:         text('days').array(),
  shifts:       text('shifts').array(),
  startDate:    text('start_date'),
  durationHours:integer('duration_hours'),
  genderPref:   text('gender_pref'),
  languagePref: text('language_pref').array(),
  budgetType:   text('budget_type'),
  budgetAmount: numeric('budget_amount', { precision: 10, scale: 2 }),
  status:       text('status', { enum: ['draft', 'active', 'matched', 'filled', 'cancelled'] }).default('draft'),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
})

export const careRequestLocations = pgTable('care_request_locations', {
  id:        uuid('id').defaultRandom().primaryKey(),
  requestId: uuid('request_id').notNull().unique().references(() => careRequests.id, { onDelete: 'cascade' }),
  address1:  text('address1'),
  address2:  text('address2'),
  city:      text('city'),
  state:     text('state'),
  lat:       numeric('lat', { precision: 10, scale: 7 }),
  lng:       numeric('lng', { precision: 10, scale: 7 }),
})

export const matches = pgTable('matches', {
  id:          uuid('id').defaultRandom().primaryKey(),
  requestId:   uuid('request_id').notNull().references(() => careRequests.id, { onDelete: 'cascade' }),
  caregiverId: uuid('caregiver_id').notNull().references(() => caregiverProfiles.id, { onDelete: 'cascade' }),
  score:       integer('score').notNull(),
  reason:      text('reason').notNull(),
  status:      text('status', { enum: ['pending', 'accepted', 'declined'] }).default('pending'),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
})

export const jobApplications = pgTable('job_applications', {
  id:          uuid('id').defaultRandom().primaryKey(),
  requestId:   uuid('request_id').notNull().references(() => careRequests.id, { onDelete: 'cascade' }),
  caregiverId: uuid('caregiver_id').notNull().references(() => caregiverProfiles.id, { onDelete: 'cascade' }),
  coverNote:   text('cover_note'),
  status:      text('status', { enum: ['pending', 'accepted', 'declined'] }).default('pending'),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
})

export const jobs = pgTable('jobs', {
  id:            uuid('id').defaultRandom().primaryKey(),
  matchId:       uuid('match_id').references(() => matches.id),
  applicationId: uuid('application_id').references(() => jobApplications.id),
  requestId:     uuid('request_id').notNull().references(() => careRequests.id),
  caregiverId:   uuid('caregiver_id').notNull().references(() => caregiverProfiles.id),
  clientId:      uuid('client_id').notNull().references(() => users.id),
  status:        text('status', { enum: ['active', 'completed', 'cancelled'] }).default('active'),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  check('jobs_source_check',
    sql`(${t.matchId} IS NOT NULL)::int + (${t.applicationId} IS NOT NULL)::int = 1`),
])

export const shifts = pgTable('shifts', {
  id:        uuid('id').defaultRandom().primaryKey(),
  jobId:     uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  date:      text('date').notNull(),
  startTime: text('start_time').notNull(),
  endTime:   text('end_time').notNull(),
  status:    text('status', { enum: ['scheduled', 'completed', 'cancelled'] }).default('scheduled'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const carePlans = pgTable('care_plans', {
  id:                  uuid('id').defaultRandom().primaryKey(),
  jobId:               uuid('job_id').notNull().unique().references(() => jobs.id, { onDelete: 'cascade' }),
  dailySchedule:       jsonb('daily_schedule').$type<Array<{ time: string; activity: string }>>(),
  medications:         jsonb('medications').$type<Array<{
    name: string; dosage: string; frequency: string; notes?: string
  }>>(),
  dietaryRestrictions: text('dietary_restrictions').array(),
  emergencyContacts:   jsonb('emergency_contacts').$type<Array<{
    name: string; relationship: string; phone: string
  }>>(),
  specialInstructions: text('special_instructions'),
  updatedAt:           timestamp('updated_at').defaultNow().notNull(),
})

export const messages = pgTable('messages', {
  id:        uuid('id').defaultRandom().primaryKey(),
  jobId:     uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  senderId:  uuid('sender_id').notNull().references(() => users.id),
  body:      text('body').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const notifications = pgTable('notifications', {
  id:        uuid('id').defaultRandom().primaryKey(),
  userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type:      text('type').notNull(),
  payload:   jsonb('payload').notNull(),
  read:      boolean('read').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const payments = pgTable('payments', {
  id:                    uuid('id').defaultRandom().primaryKey(),
  jobId:                 uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  amount:                numeric('amount', { precision: 10, scale: 2 }).notNull(),
  method:                text('method', { enum: ['stripe', 'cash'] }).notNull(),
  status:                text('status', { enum: ['pending', 'completed', 'failed'] }).default('pending'),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  createdAt:             timestamp('created_at').defaultNow().notNull(),
})

// --- Relations ---

export const usersRelations = relations(users, ({ many, one }) => ({
  caregiverProfile: one(caregiverProfiles, { fields: [users.id], references: [caregiverProfiles.userId] }),
  careRecipients:   many(careRecipients),
  careRequests:     many(careRequests),
  notifications:    many(notifications),
  sentMessages:     many(messages),
}))

export const caregiverProfilesRelations = relations(caregiverProfiles, ({ one, many }) => ({
  user:           one(users, { fields: [caregiverProfiles.userId], references: [users.id] }),
  careTypes:      many(caregiverCareTypes),
  certifications: many(caregiverCertifications),
  languages:      many(caregiverLanguages),
  workPrefs:      many(caregiverWorkPrefs),
  location:       one(caregiverLocations, { fields: [caregiverProfiles.id], references: [caregiverLocations.caregiverId] }),
  matches:        many(matches),
}))

export const careRecipientsRelations = relations(careRecipients, ({ one, many }) => ({
  client:       one(users, { fields: [careRecipients.clientId], references: [users.id] }),
  careRequests: many(careRequests),
}))

export const careRequestsRelations = relations(careRequests, ({ one, many }) => ({
  client:    one(users, { fields: [careRequests.clientId], references: [users.id] }),
  recipient: one(careRecipients, { fields: [careRequests.recipientId], references: [careRecipients.id] }),
  location:  one(careRequestLocations, { fields: [careRequests.id], references: [careRequestLocations.requestId] }),
  matches:   many(matches),
  applications: many(jobApplications),
  jobs:      many(jobs),
}))

export const matchesRelations = relations(matches, ({ one }) => ({
  request:   one(careRequests, { fields: [matches.requestId], references: [careRequests.id] }),
  caregiver: one(caregiverProfiles, { fields: [matches.caregiverId], references: [caregiverProfiles.id] }),
}))

export const jobApplicationsRelations = relations(jobApplications, ({ one }) => ({
  request:   one(careRequests, { fields: [jobApplications.requestId], references: [careRequests.id] }),
  caregiver: one(caregiverProfiles, { fields: [jobApplications.caregiverId], references: [caregiverProfiles.id] }),
}))

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  request:     one(careRequests, { fields: [jobs.requestId], references: [careRequests.id] }),
  caregiver:   one(caregiverProfiles, { fields: [jobs.caregiverId], references: [caregiverProfiles.id] }),
  client:      one(users, { fields: [jobs.clientId], references: [users.id] }),
  match:       one(matches, { fields: [jobs.matchId], references: [matches.id] }),
  application: one(jobApplications, { fields: [jobs.applicationId], references: [jobApplications.id] }),
  shifts:      many(shifts),
  carePlan:    one(carePlans, { fields: [jobs.id], references: [carePlans.jobId] }),
  messages:    many(messages),
  payments:    many(payments),
}))

export const shiftsRelations = relations(shifts, ({ one }) => ({
  job: one(jobs, { fields: [shifts.jobId], references: [jobs.id] }),
}))

export const carePlansRelations = relations(carePlans, ({ one }) => ({
  job: one(jobs, { fields: [carePlans.jobId], references: [jobs.id] }),
}))

export const messagesRelations = relations(messages, ({ one }) => ({
  job:    one(jobs, { fields: [messages.jobId], references: [jobs.id] }),
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
}))

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}))

export const paymentsRelations = relations(payments, ({ one }) => ({
  job: one(jobs, { fields: [payments.jobId], references: [jobs.id] }),
}))
