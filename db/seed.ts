import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq, inArray } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import {
  users,
  caregiverProfiles,
  caregiverCareTypes,
  caregiverCertifications,
  caregiverLanguages,
  caregiverLocations,
  careRecipients,
  careRequests,
  careRequestLocations,
  matches,
  jobs,
  shifts,
  carePlans,
  notifications,
  payments,
} from './schema'

const client = postgres(process.env.DATABASE_URL!)
const db = drizzle(client)

const SEED_PASSWORD = 'Password123!'
let hashedPassword: string

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addDays(base: string, n: number): string {
  const d = new Date(base)
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

const TODAY = '2026-04-19'

function pastShiftDates(count: number): string[] {
  return [-18, -14, -11, -7, -4, -1].slice(0, count).map(n => addDays(TODAY, n))
}

function futureShiftDates(count: number): string[] {
  return [2, 5, 9, 12, 16, 19, 23, 26].slice(0, count).map(n => addDays(TODAY, n))
}

// ---------------------------------------------------------------------------
// Caregivers
// ---------------------------------------------------------------------------

const CAREGIVERS = [
  { name: 'Margaret Collins',  headline: 'Compassionate elder care specialist with 10+ years experience', hourlyMin: 22, hourlyMax: 30, experience: '10+ years', careTypes: ['personal-care', 'companionship'], certifications: ['CPR/AED', 'CNA'], languages: ['English'], city: 'Los Angeles', state: 'California', zip: '90026', address1: '1420 Sunset Blvd' },
  { name: 'James Rivera',      headline: 'Certified nursing assistant specializing in post-hospital recovery', hourlyMin: 25, hourlyMax: 35, experience: '5-10 years', careTypes: ['post-hospital-recovery', 'personal-care'], certifications: ['CNA', 'First Aid', 'CPR/AED'], languages: ['English', 'Spanish'], city: 'Houston', state: 'Texas', zip: '77006', address1: '834 Westheimer Rd' },
  { name: 'Linda Chen',        headline: 'Dementia care expert with gentle, patient approach', hourlyMin: 28, hourlyMax: 38, experience: '10+ years', careTypes: ['dementia-care', 'personal-care'], certifications: ['Dementia Care Specialist', 'CPR/AED'], languages: ['English', 'Mandarin'], city: 'San Francisco', state: 'California', zip: '94103', address1: '290 Valencia St' },
  { name: 'Robert Thompson',   headline: 'Mobility assistance professional focused on independence', hourlyMin: 20, hourlyMax: 28, experience: '3-5 years', careTypes: ['mobility-assistance', 'personal-care'], certifications: ['First Aid', 'HHA'], languages: ['English'], city: 'Phoenix', state: 'Arizona', zip: '85007', address1: '1502 N 7th Ave' },
  { name: 'Maria Santos',      headline: 'Home health aide with warm, family-centered care', hourlyMin: 18, hourlyMax: 25, experience: '5-10 years', careTypes: ['personal-care', 'companionship'], certifications: ['HHA', 'CPR/AED'], languages: ['English', 'Spanish', 'Tagalog'], city: 'Miami', state: 'Florida', zip: '33130', address1: '640 SW 8th St' },
  { name: 'David Kim',         headline: "Experienced caregiver specializing in Alzheimer's and dementia", hourlyMin: 30, hourlyMax: 42, experience: '10+ years', careTypes: ['dementia-care', 'companionship'], certifications: ['Dementia Care Specialist', 'CNA', 'CPR/AED'], languages: ['English', 'Mandarin'], city: 'Seattle', state: 'Washington', zip: '98102', address1: '412 Broadway E' },
  { name: 'Patricia Moore',    headline: 'Caring and dependable personal care assistant', hourlyMin: 17, hourlyMax: 22, experience: '1-2 years', careTypes: ['personal-care', 'companionship'], certifications: ['First Aid', 'CPR/AED'], languages: ['English'], city: 'Chicago', state: 'Illinois', zip: '60614', address1: '2200 N Clark St' },
  { name: 'Carlos Mendez',     headline: 'Bilingual caregiver with post-hospital and mobility care expertise', hourlyMin: 24, hourlyMax: 33, experience: '5-10 years', careTypes: ['post-hospital-recovery', 'mobility-assistance'], certifications: ['CNA', 'First Aid'], languages: ['English', 'Spanish'], city: 'San Antonio', state: 'Texas', zip: '78201', address1: '789 Fredericksburg Rd' },
  { name: 'Susan Walker',      headline: 'Mobility and personal care specialist empowering independent living', hourlyMin: 21, hourlyMax: 29, experience: '3-5 years', careTypes: ['mobility-assistance', 'personal-care', 'companionship'], certifications: ['HHA', 'CPR/AED', 'First Aid'], languages: ['English', 'French'], city: 'New Orleans', state: 'Louisiana', zip: '70115', address1: '3310 Magazine St' },
  { name: 'Michael Johnson',   headline: 'Patient and skilled personal care specialist', hourlyMin: 23, hourlyMax: 31, experience: '5-10 years', careTypes: ['personal-care', 'mobility-assistance'], certifications: ['CNA', 'CPR/AED'], languages: ['English'], city: 'Denver', state: 'Colorado', zip: '80202', address1: '1500 Blake St' },
  { name: 'Angela Reyes',      headline: 'Compassionate companion for seniors and those needing mobility support', hourlyMin: 19, hourlyMax: 26, experience: '3-5 years', careTypes: ['companionship', 'mobility-assistance'], certifications: ['First Aid', 'CPR/AED'], languages: ['English', 'Spanish', 'Tagalog'], city: 'Las Vegas', state: 'Nevada', zip: '89109', address1: '2110 S Paradise Rd' },
  { name: 'Thomas Brown',      headline: 'Post-hospital recovery specialist with clinical background', hourlyMin: 32, hourlyMax: 45, experience: '10+ years', careTypes: ['post-hospital-recovery', 'personal-care'], certifications: ['CNA', 'CPR/AED', 'First Aid', 'Dementia Care Specialist'], languages: ['English'], city: 'Boston', state: 'Massachusetts', zip: '02215', address1: '88 Brookline Ave' },
  { name: 'Grace Nakamura',    headline: 'Gentle dementia care with strong family communication', hourlyMin: 26, hourlyMax: 36, experience: '5-10 years', careTypes: ['dementia-care', 'companionship'], certifications: ['Dementia Care Specialist', 'HHA'], languages: ['English', 'Mandarin'], city: 'Portland', state: 'Oregon', zip: '97210', address1: '405 NW 23rd Ave' },
  { name: 'Kevin Williams',    headline: 'Reliable home health aide with flexible scheduling', hourlyMin: 16, hourlyMax: 21, experience: '1-2 years', careTypes: ['personal-care', 'companionship'], certifications: ['HHA', 'First Aid'], languages: ['English'], city: 'Atlanta', state: 'Georgia', zip: '30308', address1: '620 Peachtree St NE' },
  { name: 'Isabelle Dupont',   headline: 'Multilingual caregiver with European personal care training', hourlyMin: 27, hourlyMax: 37, experience: '5-10 years', careTypes: ['personal-care', 'companionship'], certifications: ['CNA', 'CPR/AED', 'First Aid'], languages: ['English', 'French', 'Spanish'], city: 'New York', state: 'New York', zip: '10023', address1: '241 W 72nd St' },
  { name: 'Samuel Okafor',     headline: 'Mobility and personal care advocate with 10 years in community care', hourlyMin: 22, hourlyMax: 30, experience: '10+ years', careTypes: ['mobility-assistance', 'personal-care', 'companionship'], certifications: ['HHA', 'CPR/AED', 'First Aid'], languages: ['English'], city: 'Philadelphia', state: 'Pennsylvania', zip: '19130', address1: '1501 Spring Garden St' },
  { name: 'Dorothy Harris',    headline: 'Warm and experienced companion and personal care aide', hourlyMin: 20, hourlyMax: 27, experience: '3-5 years', careTypes: ['companionship', 'personal-care'], certifications: ['First Aid', 'CPR/AED'], languages: ['English'], city: 'Nashville', state: 'Tennessee', zip: '37209', address1: '2100 Charlotte Ave' },
  { name: 'Raj Patel',         headline: 'Holistic caregiver with focus on wellness and dignity', hourlyMin: 24, hourlyMax: 34, experience: '5-10 years', careTypes: ['dementia-care', 'personal-care'], certifications: ['CNA', 'Dementia Care Specialist', 'CPR/AED'], languages: ['English'], city: 'Austin', state: 'Texas', zip: '78704', address1: '901 S Congress Ave' },
  { name: 'Nora Fitzgerald',   headline: 'Post-hospital and companion care specialist', hourlyMin: 30, hourlyMax: 40, experience: '10+ years', careTypes: ['post-hospital-recovery', 'companionship'], certifications: ['CNA', 'CPR/AED', 'First Aid'], languages: ['English', 'French'], city: 'Minneapolis', state: 'Minnesota', zip: '55401', address1: '730 N Washington Ave' },
  { name: 'Elena Vasquez',     headline: 'Personal care aide dedicated to comfort and quality of life', hourlyMin: 18, hourlyMax: 24, experience: '1-2 years', careTypes: ['personal-care', 'mobility-assistance'], certifications: ['HHA', 'First Aid'], languages: ['English', 'Spanish'], city: 'Albuquerque', state: 'New Mexico', zip: '87102', address1: '400 Gold Ave SW' },
]

// ---------------------------------------------------------------------------
// Clients — first 10 will get active jobs, last 10 pending requests
// ---------------------------------------------------------------------------

const CLIENTS = [
  { name: 'Susan Bradley',      city: 'Los Angeles',   state: 'California',    address1: '312 S Beaudry Ave',  recipient: { name: 'Eleanor Bradley',   relationship: 'parent',    conditions: ['arthritis', 'vision-impairment'] } },
  { name: 'John Martinez',      city: 'Houston',       state: 'Texas',         address1: '1200 Main St',       recipient: { name: 'Rosa Martinez',     relationship: 'parent',    conditions: ['diabetes', 'heart-disease'] } },
  { name: 'Emily Wong',         city: 'San Francisco', state: 'California',    address1: '555 Mission St',     recipient: { name: 'Henry Wong',        relationship: 'grandparent',conditions: ['dementia', 'alzheimers'] } },
  { name: 'Michael Ross',       city: 'Phoenix',       state: 'Arizona',       address1: '2020 N 24th St',     recipient: { name: 'George Ross',       relationship: 'parent',    conditions: ['stroke', 'mobility-assistance'] } },
  { name: 'Jennifer Lopez',     city: 'Miami',         state: 'Florida',       address1: '801 Brickell Ave',   recipient: { name: 'Carmen Lopez',      relationship: 'parent',    conditions: ['arthritis', 'depression'] } },
  { name: 'David Park',         city: 'Seattle',       state: 'Washington',    address1: '1411 4th Ave',       recipient: { name: 'Young Park',        relationship: 'parent',    conditions: ['dementia', 'parkinsons'] } },
  { name: 'Lisa Anderson',      city: 'Chicago',       state: 'Illinois',      address1: '900 N Michigan Ave', recipient: { name: 'Ruth Anderson',     relationship: 'parent',    conditions: ['copd', 'anxiety'] } },
  { name: 'Karen White',        city: 'San Antonio',   state: 'Texas',         address1: '433 N Loop 1604 W',  recipient: { name: 'Frank White',       relationship: 'spouse',    conditions: ['heart-disease', 'diabetes'] } },
  { name: 'Mark Taylor',        city: 'New Orleans',   state: 'Louisiana',     address1: '600 Canal St',       recipient: { name: 'Mabel Taylor',      relationship: 'parent',    conditions: ['arthritis', 'hearing-impairment'] } },
  { name: 'Nancy Green',        city: 'Denver',        state: 'Colorado',      address1: '1700 Lincoln St',    recipient: { name: 'Arthur Green',      relationship: 'parent',    conditions: ['parkinsons', 'mobility-assistance'] } },
  { name: 'Steven Clark',       city: 'Las Vegas',     state: 'Nevada',        address1: '3750 S Las Vegas Blvd', recipient: { name: 'Evelyn Clark',   relationship: 'parent',    conditions: ['alzheimers', 'vision-impairment'] } },
  { name: 'Dorothy Lewis',      city: 'Boston',        state: 'Massachusetts', address1: '290 Congress St',    recipient: { name: 'Howard Lewis',      relationship: 'spouse',    conditions: ['stroke', 'depression'] } },
  { name: 'Paul Walker',        city: 'Portland',      state: 'Oregon',        address1: '115 SW Ash St',      recipient: { name: 'Marjorie Walker',   relationship: 'parent',    conditions: ['dementia', 'copd'] } },
  { name: 'Sandra Hill',        city: 'Atlanta',       state: 'Georgia',       address1: '191 Peachtree St',   recipient: { name: 'Charles Hill',      relationship: 'parent',    conditions: ['diabetes', 'heart-disease'] } },
  { name: 'James Harris',       city: 'New York',      state: 'New York',      address1: '350 5th Ave',        recipient: { name: 'Bertha Harris',     relationship: 'parent',    conditions: ['arthritis', 'anxiety'] } },
  { name: 'Barbara Young',      city: 'Philadelphia',  state: 'Pennsylvania',  address1: '1500 Market St',     recipient: { name: 'Walter Young',      relationship: 'spouse',    conditions: ['parkinsons', 'depression'] } },
  { name: 'Christopher Adams',  city: 'Nashville',     state: 'Tennessee',     address1: '333 Commerce St',    recipient: { name: 'Florence Adams',    relationship: 'parent',    conditions: ['copd', 'hearing-impairment'] } },
  { name: 'Jessica Nelson',     city: 'Austin',        state: 'Texas',         address1: '210 W 6th St',       recipient: { name: 'Lawrence Nelson',   relationship: 'parent',    conditions: ['dementia', 'diabetes'] } },
  { name: 'Matthew Carter',     city: 'Minneapolis',   state: 'Minnesota',     address1: '800 Nicollet Mall',  recipient: { name: 'Lillian Carter',    relationship: 'parent',    conditions: ['stroke', 'mobility-assistance'] } },
  { name: 'Ashley Mitchell',    city: 'Albuquerque',   state: 'New Mexico',    address1: '505 Marquette Ave',  recipient: { name: 'Donald Mitchell',   relationship: 'grandparent',conditions: ['alzheimers', 'arthritis'] } },
]

// Care request templates per client — first 10 get an active job from request[0]
const REQUEST_TEMPLATES = [
  [{ careType: 'personal-care',          title: 'Daily morning personal care for mother',          frequency: 'daily',    shifts: ['morning'],   days: ['monday','tuesday','wednesday','thursday','friday'], durationHours: 4, budgetType: 'hourly',  budgetAmount: '25' }, { careType: 'companionship',           title: 'Weekend companion visits',                        frequency: 'weekly',   shifts: ['afternoon'], days: ['saturday','sunday'],                              durationHours: 2, budgetType: 'hourly',  budgetAmount: '20' }],
  [{ careType: 'post-hospital-recovery', title: 'Post-surgery home recovery assistance',           frequency: 'daily',    shifts: ['morning'],   days: ['monday','wednesday','friday'],                    durationHours: 6, budgetType: 'hourly',  budgetAmount: '30' }, { careType: 'personal-care',           title: 'Evening personal care for father',                frequency: 'weekly',   shifts: ['evening'],   days: ['tuesday','thursday'],                             durationHours: 3, budgetType: 'hourly',  budgetAmount: '22' }],
  [{ careType: 'dementia-care',          title: 'Specialized dementia care for grandfather',       frequency: 'daily',    shifts: ['morning'],   days: ['monday','tuesday','wednesday','thursday','friday'], durationHours: 8, budgetType: 'hourly',  budgetAmount: '35' }, { careType: 'companionship',           title: 'Daily companionship and activities',              frequency: 'daily',    shifts: ['afternoon'], days: ['monday','wednesday','friday'],                    durationHours: 2, budgetType: 'hourly',  budgetAmount: '22' }],
  [{ careType: 'mobility-assistance',    title: 'Mobility and physical therapy support for dad',   frequency: 'bi-weekly',shifts: ['morning'],   days: ['monday','thursday'],                              durationHours: 4, budgetType: 'hourly',  budgetAmount: '24' }, { careType: 'personal-care',           title: 'Daily personal care routine',                     frequency: 'daily',    shifts: ['morning'],   days: ['tuesday','wednesday','friday'],                    durationHours: 3, budgetType: 'hourly',  budgetAmount: '21' }],
  [{ careType: 'personal-care',          title: 'Comprehensive personal care for mother',          frequency: 'daily',    shifts: ['morning'],   days: ['monday','tuesday','wednesday','thursday','friday'], durationHours: 4, budgetType: 'hourly',  budgetAmount: '22' }, { careType: 'companionship',           title: 'Social visits and light activities',              frequency: 'weekly',   shifts: ['afternoon'], days: ['saturday'],                                       durationHours: 3, budgetType: 'hourly',  budgetAmount: '20' }],
  [{ careType: 'dementia-care',          title: 'Dementia and Parkinson\'s daily support',         frequency: 'daily',    shifts: ['morning'],   days: ['monday','tuesday','wednesday','thursday','friday'], durationHours: 6, budgetType: 'hourly',  budgetAmount: '38' }, { careType: 'companionship',           title: 'Evening check-ins and companionship',             frequency: 'daily',    shifts: ['evening'],   days: ['monday','wednesday','friday'],                    durationHours: 2, budgetType: 'hourly',  budgetAmount: '25' }],
  [{ careType: 'personal-care',          title: 'Morning personal care and medication reminders',  frequency: 'daily',    shifts: ['morning'],   days: ['monday','tuesday','wednesday','thursday','friday'], durationHours: 3, budgetType: 'hourly',  budgetAmount: '20' }, { careType: 'companionship',           title: 'Weekend social engagement visits',                frequency: 'weekly',   shifts: ['afternoon'], days: ['saturday','sunday'],                              durationHours: 2, budgetType: 'hourly',  budgetAmount: '18' }],
  [{ careType: 'post-hospital-recovery', title: 'At-home recovery care after cardiac procedure',   frequency: 'daily',    shifts: ['morning'],   days: ['monday','tuesday','wednesday','thursday','friday'], durationHours: 5, budgetType: 'hourly',  budgetAmount: '28' }, { careType: 'mobility-assistance',     title: 'Mobility and exercise support',                   frequency: 'bi-weekly',shifts: ['afternoon'], days: ['tuesday','thursday'],                             durationHours: 3, budgetType: 'hourly',  budgetAmount: '26' }],
  [{ careType: 'mobility-assistance',    title: 'Mobility assistance and fall prevention for mom', frequency: 'daily',    shifts: ['morning'],   days: ['monday','wednesday','friday'],                    durationHours: 3, budgetType: 'hourly',  budgetAmount: '22' }, { careType: 'companionship',           title: 'Afternoon social visits',                         frequency: 'weekly',   shifts: ['afternoon'], days: ['saturday'],                                       durationHours: 2, budgetType: 'hourly',  budgetAmount: '20' }],
  [{ careType: 'personal-care',          title: 'Full personal care assistance for father',        frequency: 'daily',    shifts: ['morning'],   days: ['monday','tuesday','wednesday','thursday','friday'], durationHours: 4, budgetType: 'hourly',  budgetAmount: '26' }, { careType: 'mobility-assistance',     title: 'Evening mobility support',                        frequency: 'weekly',   shifts: ['evening'],   days: ['tuesday','thursday'],                             durationHours: 2, budgetType: 'hourly',  budgetAmount: '23' }],
  // Clients 10-19 (pending only)
  [{ careType: 'companionship',          title: 'Daily companionship for mother with Alzheimer\'s', frequency: 'daily',   shifts: ['morning'],   days: ['monday','tuesday','wednesday','thursday','friday'], durationHours: 4, budgetType: 'hourly',  budgetAmount: '24' }, { careType: 'mobility-assistance',     title: 'Physical mobility support',                       frequency: 'weekly',   shifts: ['afternoon'], days: ['saturday'],                                       durationHours: 3, budgetType: 'hourly',  budgetAmount: '22' }],
  [{ careType: 'post-hospital-recovery', title: 'Stroke recovery home assistance',                 frequency: 'daily',    shifts: ['morning'],   days: ['monday','tuesday','wednesday','thursday','friday'], durationHours: 5, budgetType: 'hourly',  budgetAmount: '35' }, { careType: 'personal-care',           title: 'Evening personal care',                           frequency: 'weekly',   shifts: ['evening'],   days: ['tuesday','thursday'],                             durationHours: 3, budgetType: 'hourly',  budgetAmount: '30' }],
  [{ careType: 'dementia-care',          title: 'Specialized dementia care for mother',            frequency: 'daily',    shifts: ['morning'],   days: ['monday','wednesday','friday'],                    durationHours: 6, budgetType: 'hourly',  budgetAmount: '32' }, { careType: 'companionship',           title: 'Social engagement and activities',                frequency: 'weekly',   shifts: ['afternoon'], days: ['saturday','sunday'],                              durationHours: 2, budgetType: 'hourly',  budgetAmount: '26' }],
  [{ careType: 'personal-care',          title: 'Daily personal care for diabetic father',         frequency: 'daily',    shifts: ['morning'],   days: ['monday','tuesday','wednesday','thursday','friday'], durationHours: 3, budgetType: 'hourly',  budgetAmount: '20' }, { careType: 'companionship',           title: 'Weekend visits and outings',                      frequency: 'weekly',   shifts: ['afternoon'], days: ['saturday','sunday'],                              durationHours: 3, budgetType: 'hourly',  budgetAmount: '18' }],
  [{ careType: 'personal-care',          title: 'Daily personal care in NYC apartment',            frequency: 'daily',    shifts: ['morning'],   days: ['monday','tuesday','wednesday','thursday','friday'], durationHours: 4, budgetType: 'hourly',  budgetAmount: '40' }, { careType: 'companionship',           title: 'Afternoon companionship and activities',          frequency: 'weekly',   shifts: ['afternoon'], days: ['wednesday','friday'],                             durationHours: 2, budgetType: 'hourly',  budgetAmount: '35' }],
  [{ careType: 'mobility-assistance',    title: 'Parkinson\'s mobility and daily living support',  frequency: 'daily',    shifts: ['morning'],   days: ['monday','tuesday','wednesday','thursday','friday'], durationHours: 4, budgetType: 'hourly',  budgetAmount: '25' }, { careType: 'personal-care',           title: 'Evening care routine',                            frequency: 'weekly',   shifts: ['evening'],   days: ['tuesday','thursday'],                             durationHours: 2, budgetType: 'hourly',  budgetAmount: '22' }],
  [{ careType: 'companionship',          title: 'Daily companionship for mother with COPD',        frequency: 'daily',    shifts: ['morning'],   days: ['monday','wednesday','friday'],                    durationHours: 3, budgetType: 'hourly',  budgetAmount: '22' }, { careType: 'personal-care',           title: 'Personal care assistance',                        frequency: 'weekly',   shifts: ['afternoon'], days: ['saturday'],                                       durationHours: 2, budgetType: 'hourly',  budgetAmount: '20' }],
  [{ careType: 'dementia-care',          title: 'Dementia care and daily monitoring for father',   frequency: 'daily',    shifts: ['morning'],   days: ['monday','tuesday','wednesday','thursday','friday'], durationHours: 6, budgetType: 'hourly',  budgetAmount: '30' }, { careType: 'companionship',           title: 'Weekend social visits',                           frequency: 'weekly',   shifts: ['afternoon'], days: ['saturday','sunday'],                              durationHours: 2, budgetType: 'hourly',  budgetAmount: '25' }],
  [{ careType: 'post-hospital-recovery', title: 'Post-stroke recovery care for mother',            frequency: 'daily',    shifts: ['morning'],   days: ['monday','tuesday','wednesday','thursday','friday'], durationHours: 5, budgetType: 'hourly',  budgetAmount: '32' }, { careType: 'mobility-assistance',     title: 'Mobility support and exercises',                  frequency: 'bi-weekly',shifts: ['afternoon'], days: ['tuesday','thursday'],                             durationHours: 3, budgetType: 'hourly',  budgetAmount: '28' }],
  [{ careType: 'personal-care',          title: 'Comprehensive care for grandfather with Alzheimer\'s', frequency: 'daily', shifts: ['morning'], days: ['monday','tuesday','wednesday','thursday','friday'], durationHours: 6, budgetType: 'hourly',  budgetAmount: '22' }, { careType: 'companionship',           title: 'Afternoon visits and memory activities',          frequency: 'weekly',   shifts: ['afternoon'], days: ['wednesday','friday'],                             durationHours: 2, budgetType: 'hourly',  budgetAmount: '18' }],
]

const CARE_PLAN_TEMPLATES = [
  { dailySchedule: [{ time: '7:00 AM', activity: 'Wake up, hygiene, medication' }, { time: '9:00 AM', activity: 'Breakfast and light exercise' }, { time: '12:00 PM', activity: 'Lunch and rest' }, { time: '3:00 PM', activity: 'Afternoon activities' }], medications: [{ name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily with breakfast', notes: 'Monitor blood pressure' }, { name: 'Aspirin', dosage: '81mg', frequency: 'Once daily', notes: '' }], dietaryRestrictions: ['Low sodium', 'No grapefruit'], emergencyContacts: [{ name: 'Sarah Bradley', relationship: 'Daughter', phone: '(310) 555-0101' }], specialInstructions: 'Prefers morning showers. Allergic to penicillin. Walker required at all times.' },
  { dailySchedule: [{ time: '8:00 AM', activity: 'Morning care and medications' }, { time: '10:00 AM', activity: 'Physical therapy exercises' }, { time: '1:00 PM', activity: 'Lunch and rest period' }, { time: '4:00 PM', activity: 'Walk and fresh air' }], medications: [{ name: 'Metformin', dosage: '500mg', frequency: 'Twice daily with meals', notes: 'Monitor blood sugar levels' }, { name: 'Atorvastatin', dosage: '20mg', frequency: 'Once at bedtime', notes: '' }], dietaryRestrictions: ['Diabetic diet', 'Low carbohydrate'], emergencyContacts: [{ name: 'Maria Martinez', relationship: 'Daughter', phone: '(713) 555-0202' }], specialInstructions: 'Recovering from hip replacement. Physical therapy exercises must be completed daily.' },
  { dailySchedule: [{ time: '7:30 AM', activity: 'Wake, hygiene, breakfast' }, { time: '10:00 AM', activity: 'Memory activities and puzzles' }, { time: '12:30 PM', activity: 'Lunch' }, { time: '3:00 PM', activity: 'Gentle walk or sensory activities' }, { time: '5:00 PM', activity: 'Dinner preparation and meal' }], medications: [{ name: 'Donepezil', dosage: '10mg', frequency: 'Once at bedtime', notes: 'May cause vivid dreams' }, { name: 'Memantine', dosage: '10mg', frequency: 'Twice daily', notes: 'Take with or without food' }], dietaryRestrictions: ['Soft foods only', 'Ensure supplement twice daily'], emergencyContacts: [{ name: 'Amy Wong', relationship: 'Granddaughter', phone: '(415) 555-0303' }], specialInstructions: 'Keep environment calm and familiar. Use simple, short sentences. Redirect if agitated.' },
  { dailySchedule: [{ time: '8:00 AM', activity: 'Morning routine and stretches' }, { time: '10:00 AM', activity: 'Mobility exercises with walker' }, { time: '12:00 PM', activity: 'Lunch' }, { time: '2:00 PM', activity: 'Rest then light activities' }], medications: [{ name: 'Baclofen', dosage: '10mg', frequency: 'Three times daily', notes: 'Muscle relaxant — may cause drowsiness' }], dietaryRestrictions: ['High protein diet', 'Adequate hydration (2L/day)'], emergencyContacts: [{ name: 'Diane Ross', relationship: 'Daughter', phone: '(602) 555-0404' }], specialInstructions: 'Use gait belt when assisting. Patient is determined to regain independence — encourage but don\'t rush.' },
  { dailySchedule: [{ time: '7:00 AM', activity: 'Morning hygiene and medications' }, { time: '9:00 AM', activity: 'Light breakfast, newspaper time' }, { time: '12:00 PM', activity: 'Lunch and TV' }, { time: '4:00 PM', activity: 'Gentle exercise and walk' }], medications: [{ name: 'Sertraline', dosage: '50mg', frequency: 'Once daily with breakfast', notes: 'Monitor mood changes' }, { name: 'Naproxen', dosage: '220mg', frequency: 'As needed for pain', notes: 'Max 2x/day' }], dietaryRestrictions: ['Anti-inflammatory diet', 'Limit alcohol'], emergencyContacts: [{ name: 'Marco Lopez', relationship: 'Son', phone: '(305) 555-0505' }], specialInstructions: 'Enjoys Spanish-language TV in the afternoons. Prefers female caregivers.' },
  { dailySchedule: [{ time: '7:00 AM', activity: 'Morning care, medications' }, { time: '9:00 AM', activity: 'Memory exercises and music therapy' }, { time: '12:00 PM', activity: 'Lunch' }, { time: '3:00 PM', activity: 'Gentle walk' }, { time: '6:00 PM', activity: 'Dinner, wind-down routine' }], medications: [{ name: 'Carbidopa/Levodopa', dosage: '25/100mg', frequency: 'Three times daily', notes: 'On empty stomach or 30 min before meals' }, { name: 'Rivastigmine', dosage: '4.6mg/24hr patch', frequency: 'Daily patch change', notes: 'Rotate patch location' }], dietaryRestrictions: ['High protein spread throughout day', 'Avoid large protein meals near medication times'], emergencyContacts: [{ name: 'Ji-hoon Park', relationship: 'Son', phone: '(206) 555-0606' }], specialInstructions: 'Very private. Knock before entering. Allow extra time for all tasks.' },
  { dailySchedule: [{ time: '8:00 AM', activity: 'Morning personal care, medications' }, { time: '10:00 AM', activity: 'Light activities, reading' }, { time: '12:30 PM', activity: 'Lunch' }, { time: '3:00 PM', activity: 'Social time, TV, or games' }], medications: [{ name: 'Albuterol inhaler', dosage: '2 puffs', frequency: 'As needed for shortness of breath', notes: 'Shake well before use' }, { name: 'Escitalopram', dosage: '10mg', frequency: 'Once daily', notes: '' }], dietaryRestrictions: ['Soft foods', 'Avoid gas-producing foods'], emergencyContacts: [{ name: 'Tom Anderson', relationship: 'Son', phone: '(312) 555-0707' }], specialInstructions: 'Pulse ox should be above 92%. Call family if below 90%.' },
  { dailySchedule: [{ time: '7:30 AM', activity: 'Morning care and cardiac medications' }, { time: '9:00 AM', activity: 'Light breakfast, vital signs check' }, { time: '12:00 PM', activity: 'Lunch — heart-healthy meal' }, { time: '3:00 PM', activity: 'Supervised short walk' }], medications: [{ name: 'Carvedilol', dosage: '6.25mg', frequency: 'Twice daily with food', notes: 'Check pulse before giving' }, { name: 'Furosemide', dosage: '20mg', frequency: 'Once in morning', notes: 'Monitor for ankle swelling' }, { name: 'Warfarin', dosage: '5mg', frequency: 'Once daily', notes: 'Consistent vitamin K intake' }], dietaryRestrictions: ['Low sodium (< 2g/day)', 'Low potassium foods', 'Consistent vitamin K'], emergencyContacts: [{ name: 'Lisa White', relationship: 'Daughter', phone: '(210) 555-0808' }], specialInstructions: 'Weigh daily — notify family if weight increases >2 lbs in a day. No strenuous activity.' },
  { dailySchedule: [{ time: '8:00 AM', activity: 'Morning care, balance exercises' }, { time: '10:00 AM', activity: 'Light housekeeping assistance' }, { time: '12:00 PM', activity: 'Lunch' }, { time: '3:00 PM', activity: 'Walk around block with support' }], medications: [{ name: 'Calcium + Vitamin D', dosage: '600mg/400IU', frequency: 'Twice daily', notes: 'Important for bone density' }], dietaryRestrictions: ['High calcium foods', 'Avoid rugs and slippery surfaces'], emergencyContacts: [{ name: 'Chris Taylor', relationship: 'Son', phone: '(504) 555-0909' }], specialInstructions: 'Fall risk — always keep one hand free to assist. Remove obstacles in pathways.' },
  { dailySchedule: [{ time: '7:00 AM', activity: 'Morning hygiene, medications, breakfast' }, { time: '9:30 AM', activity: 'Physical therapy stretches' }, { time: '12:00 PM', activity: 'Lunch' }, { time: '2:00 PM', activity: 'Rest' }, { time: '4:00 PM', activity: 'Light walk and social time' }], medications: [{ name: 'Levodopa/Carbidopa', dosage: '100/25mg', frequency: 'Four times daily', notes: 'Set reminders — critical timing' }, { name: 'Ropinirole', dosage: '2mg', frequency: 'Three times daily', notes: '' }], dietaryRestrictions: ['Adequate fiber', 'Good hydration'], emergencyContacts: [{ name: 'Patricia Green', relationship: 'Daughter', phone: '(720) 555-1010' }], specialInstructions: 'Medication timing is critical for Parkinson\'s — never skip or delay doses.' },
]

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function seed() {
  console.log('\n🌱 Starting full database seed...\n')

  hashedPassword = await bcrypt.hash(SEED_PASSWORD, 12)
  console.log(`🔑 Password for all seed accounts: ${SEED_PASSWORD}\n`)

  // ── 1. Seed caregivers ──────────────────────────────────────────────────
  console.log('👩‍⚕️  Seeding 20 caregivers...')
  const caregiverProfileIds: string[] = []

  for (const cg of CAREGIVERS) {
    const email = `${cg.name.toLowerCase().replace(/\s+/g, '.')}@example.com`

    const [user] = await db
      .insert(users)
      .values({ email, name: cg.name, role: 'caregiver', password: hashedPassword })
      .onConflictDoUpdate({ target: users.email, set: { name: cg.name, role: 'caregiver', password: hashedPassword } })
      .returning({ id: users.id })

    const [profile] = await db
      .insert(caregiverProfiles)
      .values({ userId: user.id, headline: cg.headline, about: `${cg.name} is a ${cg.experience} caregiver focused on providing excellent care.`, hourlyMin: String(cg.hourlyMin), hourlyMax: String(cg.hourlyMax), experience: cg.experience, status: 'active', completedStep: 5 })
      .onConflictDoUpdate({ target: caregiverProfiles.userId, set: { headline: cg.headline, status: 'active', hourlyMin: String(cg.hourlyMin), hourlyMax: String(cg.hourlyMax) } })
      .returning({ id: caregiverProfiles.id })

    caregiverProfileIds.push(profile.id)

    await db.delete(caregiverCareTypes).where(eq(caregiverCareTypes.caregiverId, profile.id))
    for (const careType of cg.careTypes) await db.insert(caregiverCareTypes).values({ caregiverId: profile.id, careType }).onConflictDoNothing()
    for (const certification of cg.certifications) await db.insert(caregiverCertifications).values({ caregiverId: profile.id, certification }).onConflictDoNothing()
    for (const language of cg.languages) await db.insert(caregiverLanguages).values({ caregiverId: profile.id, language }).onConflictDoNothing()

    await db.insert(caregiverLocations)
      .values({ caregiverId: profile.id, address1: cg.address1, city: cg.city, state: cg.state })
      .onConflictDoUpdate({ target: caregiverLocations.caregiverId, set: { address1: cg.address1, city: cg.city, state: cg.state } })

    console.log(`  ✓ ${cg.name} (${cg.city}, ${cg.state})`)
  }

  // ── 2. Clean up existing client seed data ───────────────────────────────
  console.log('\n🧹 Cleaning up old client seed data...')
  const existingClientEmails = CLIENTS.map(c => `${c.name.toLowerCase().replace(/\s+/g, '.')}@client.example.com`)
  const existingClients = await db.select({ id: users.id }).from(users).where(inArray(users.email, existingClientEmails))
  if (existingClients.length > 0) {
    const clientIds = existingClients.map(u => u.id)
    // Delete jobs first (no cascade from clients), then requests cascade the rest
    await db.delete(jobs).where(inArray(jobs.clientId, clientIds))
    const existingRequests = await db.select({ id: careRequests.id }).from(careRequests).where(inArray(careRequests.clientId, clientIds))
    if (existingRequests.length > 0) {
      const reqIds = existingRequests.map(r => r.id)
      await db.delete(careRequests).where(inArray(careRequests.id, reqIds))
    }
    await db.delete(careRecipients).where(inArray(careRecipients.clientId, clientIds))
    await db.delete(notifications).where(inArray(notifications.userId, clientIds))
    await db.delete(users).where(inArray(users.id, clientIds))
  }
  console.log('  ✓ Done')

  // ── 3. Seed clients ─────────────────────────────────────────────────────
  console.log('\n👨‍👩‍👧  Seeding 20 clients...')

  for (let i = 0; i < CLIENTS.length; i++) {
    const cl = CLIENTS[i]
    const reqs = REQUEST_TEMPLATES[i]
    const email = `${cl.name.toLowerCase().replace(/\s+/g, '.')}@client.example.com`

    const [clientUser] = await db
      .insert(users)
      .values({ email, name: cl.name, role: 'client', password: hashedPassword })
      .returning({ id: users.id })

    // Care recipient
    const [recipient] = await db
      .insert(careRecipients)
      .values({ clientId: clientUser.id, name: cl.recipient.name, relationship: cl.recipient.relationship, conditions: cl.recipient.conditions })
      .returning({ id: careRecipients.id })

    // Care requests
    const requestIds: string[] = []
    for (const req of reqs) {
      const [request] = await db
        .insert(careRequests)
        .values({ clientId: clientUser.id, recipientId: recipient.id, careType: req.careType, title: req.title, frequency: req.frequency, shifts: req.shifts, days: req.days, durationHours: req.durationHours, budgetType: req.budgetType, budgetAmount: req.budgetAmount, status: 'active', languagePref: [] })
        .returning({ id: careRequests.id })

      await db.insert(careRequestLocations).values({ requestId: request.id, address1: cl.address1, city: cl.city, state: cl.state })
      requestIds.push(request.id)
    }

    const cgProfileId = caregiverProfileIds[i]  // pair each client with the same-index caregiver

    // Clients 0–9: create accepted match → job → shifts → care plan → payments
    if (i < 10) {
      const [match] = await db
        .insert(matches)
        .values({ requestId: requestIds[0], caregiverId: cgProfileId, score: 85 + i, reason: 'Strong skill match and availability alignment', status: 'accepted' })
        .returning({ id: matches.id })

      const [job] = await db
        .insert(jobs)
        .values({ matchId: match.id, requestId: requestIds[0], caregiverId: cgProfileId, clientId: clientUser.id, status: 'active' })
        .returning({ id: jobs.id })

      // Past shifts (completed) + future shifts (scheduled)
      const pastDates = pastShiftDates(3)
      const futureDates = futureShiftDates(4)

      for (const date of pastDates) {
        await db.insert(shifts).values({ jobId: job.id, date, startTime: '08:00', endTime: '12:00', status: 'completed' })
      }
      for (const date of futureDates) {
        await db.insert(shifts).values({ jobId: job.id, date, startTime: '08:00', endTime: '12:00', status: 'scheduled' })
      }

      // Care plan
      const planTemplate = CARE_PLAN_TEMPLATES[i]
      await db.insert(carePlans).values({
        recipientId: recipient.id,
        jobId: job.id,
        dailySchedule: planTemplate.dailySchedule,
        medications: planTemplate.medications,
        dietaryRestrictions: planTemplate.dietaryRestrictions,
        emergencyContacts: planTemplate.emergencyContacts,
        specialInstructions: planTemplate.specialInstructions,
      })

      // Payments for completed shifts
      for (const date of pastDates) {
        const amount = (reqs[0].durationHours * 24 + i).toFixed(2)
        await db.insert(payments).values({ jobId: job.id, amount, method: 'cash', status: 'completed' })
      }

      // Mark request as filled
      await db.update(careRequests).set({ status: 'filled' }).where(eq(careRequests.id, requestIds[0]))

      // Pending match on 2nd request from a different caregiver
      const altCgIdx = (i + 10) % 20
      await db.insert(matches).values({ requestId: requestIds[1], caregiverId: caregiverProfileIds[altCgIdx], score: 70 + i, reason: 'Good availability and care type match', status: 'pending' })

      // Notifications
      const caregiverUsers = await db.select({ userId: caregiverProfiles.userId }).from(caregiverProfiles).where(eq(caregiverProfiles.id, cgProfileId))
      if (caregiverUsers[0]) {
        await db.insert(notifications).values({ userId: caregiverUsers[0].userId, type: 'job_started', payload: { jobId: job.id, clientName: cl.name }, read: false })
      }
      await db.insert(notifications).values({ userId: clientUser.id, type: 'match_found', payload: { jobId: job.id, caregiverProfileId: cgProfileId }, read: false })

    } else {
      // Clients 10–19: pending matches on both requests
      const cgIdx1 = i % 20
      const cgIdx2 = (i + 5) % 20
      await db.insert(matches).values({ requestId: requestIds[0], caregiverId: caregiverProfileIds[cgIdx1], score: 72 + (i - 10) * 2, reason: 'Great care type alignment and local availability', status: 'pending' })
      await db.insert(matches).values({ requestId: requestIds[1], caregiverId: caregiverProfileIds[cgIdx2], score: 68 + (i - 10) * 2, reason: 'Strong experience match', status: 'pending' })

      await db.insert(notifications).values({ userId: clientUser.id, type: 'offer_received', payload: { requestId: requestIds[0] }, read: false })
    }

    const jobLabel = i < 10 ? '(active job + care plan + shifts)' : '(pending matches)'
    console.log(`  ✓ ${cl.name} — ${cl.recipient.name} ${jobLabel}`)
  }

  console.log('\n✅ Seed complete!\n')
  await client.end()
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
