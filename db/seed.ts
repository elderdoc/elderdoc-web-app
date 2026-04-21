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
  clientLocations,
  careRecipients,
  careRequests,
  careRequestLocations,
  matches,
  jobs,
  shifts,
  carePlans,
  notifications,
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
// Caregivers (with lat/lng)
// ---------------------------------------------------------------------------

const CAREGIVERS = [
  { name: 'Margaret Collins',  headline: 'Compassionate elder care specialist with 10+ years experience',         hourlyMin: 22, hourlyMax: 30, experience: '10+ years',  careTypes: ['personal-care', 'companionship'],                     certifications: ['CPR/AED', 'CNA'],                                       languages: ['English'],                      city: 'Los Angeles',   state: 'California',    zip: '90026', address1: '1420 Sunset Blvd',        lat: 34.0522,  lng: -118.2437 },
  { name: 'James Rivera',      headline: 'Certified nursing assistant specializing in post-hospital recovery',    hourlyMin: 25, hourlyMax: 35, experience: '5-10 years', careTypes: ['post-hospital-recovery', 'personal-care'],            certifications: ['CNA', 'First Aid', 'CPR/AED'],                          languages: ['English', 'Spanish'],           city: 'Houston',       state: 'Texas',         zip: '77006', address1: '834 Westheimer Rd',        lat: 29.7604,  lng: -95.3698  },
  { name: 'Linda Chen',        headline: 'Dementia care expert with gentle, patient approach',                    hourlyMin: 28, hourlyMax: 38, experience: '10+ years',  careTypes: ['dementia-care', 'personal-care'],                     certifications: ['Dementia Care Specialist', 'CPR/AED'],                  languages: ['English', 'Mandarin'],          city: 'San Francisco', state: 'California',    zip: '94103', address1: '290 Valencia St',          lat: 37.7749,  lng: -122.4194 },
  { name: 'Robert Thompson',   headline: 'Mobility assistance professional focused on independence',               hourlyMin: 20, hourlyMax: 28, experience: '3-5 years',  careTypes: ['mobility-assistance', 'personal-care'],               certifications: ['First Aid', 'HHA'],                                     languages: ['English'],                      city: 'Phoenix',       state: 'Arizona',       zip: '85007', address1: '1502 N 7th Ave',           lat: 33.4484,  lng: -112.0740 },
  { name: 'Maria Santos',      headline: 'Home health aide with warm, family-centered care',                      hourlyMin: 18, hourlyMax: 25, experience: '5-10 years', careTypes: ['personal-care', 'companionship'],                     certifications: ['HHA', 'CPR/AED'],                                       languages: ['English', 'Spanish', 'Tagalog'], city: 'Miami',        state: 'Florida',       zip: '33130', address1: '640 SW 8th St',            lat: 25.7617,  lng: -80.1918  },
  { name: 'David Kim',         headline: "Experienced caregiver specializing in Alzheimer's and dementia",        hourlyMin: 30, hourlyMax: 42, experience: '10+ years',  careTypes: ['dementia-care', 'companionship'],                     certifications: ['Dementia Care Specialist', 'CNA', 'CPR/AED'],           languages: ['English', 'Mandarin'],          city: 'Seattle',       state: 'Washington',    zip: '98102', address1: '412 Broadway E',           lat: 47.6062,  lng: -122.3321 },
  { name: 'Patricia Moore',    headline: 'Caring and dependable personal care assistant',                         hourlyMin: 17, hourlyMax: 22, experience: '1-2 years',  careTypes: ['personal-care', 'companionship'],                     certifications: ['First Aid', 'CPR/AED'],                                 languages: ['English'],                      city: 'Chicago',       state: 'Illinois',      zip: '60614', address1: '2200 N Clark St',          lat: 41.8781,  lng: -87.6298  },
  { name: 'Carlos Mendez',     headline: 'Bilingual caregiver with post-hospital and mobility care expertise',    hourlyMin: 24, hourlyMax: 33, experience: '5-10 years', careTypes: ['post-hospital-recovery', 'mobility-assistance'],      certifications: ['CNA', 'First Aid'],                                     languages: ['English', 'Spanish'],           city: 'San Antonio',   state: 'Texas',         zip: '78201', address1: '789 Fredericksburg Rd',    lat: 29.4241,  lng: -98.4936  },
  { name: 'Susan Walker',      headline: 'Mobility and personal care specialist empowering independent living',   hourlyMin: 21, hourlyMax: 29, experience: '3-5 years',  careTypes: ['mobility-assistance', 'personal-care', 'companionship'], certifications: ['HHA', 'CPR/AED', 'First Aid'],                        languages: ['English', 'French'],            city: 'New Orleans',   state: 'Louisiana',     zip: '70115', address1: '3310 Magazine St',         lat: 29.9511,  lng: -90.0715  },
  { name: 'Michael Johnson',   headline: 'Patient and skilled personal care specialist',                          hourlyMin: 23, hourlyMax: 31, experience: '5-10 years', careTypes: ['personal-care', 'mobility-assistance'],               certifications: ['CNA', 'CPR/AED'],                                       languages: ['English'],                      city: 'Denver',        state: 'Colorado',      zip: '80202', address1: '1500 Blake St',            lat: 39.7392,  lng: -104.9903 },
  { name: 'Angela Reyes',      headline: 'Compassionate companion for seniors and those needing mobility support', hourlyMin: 19, hourlyMax: 26, experience: '3-5 years', careTypes: ['companionship', 'mobility-assistance'],               certifications: ['First Aid', 'CPR/AED'],                                 languages: ['English', 'Spanish', 'Tagalog'], city: 'Las Vegas',    state: 'Nevada',        zip: '89109', address1: '2110 S Paradise Rd',       lat: 36.1699,  lng: -115.1398 },
  { name: 'Thomas Brown',      headline: 'Post-hospital recovery specialist with clinical background',            hourlyMin: 32, hourlyMax: 45, experience: '10+ years',  careTypes: ['post-hospital-recovery', 'personal-care'],            certifications: ['CNA', 'CPR/AED', 'First Aid', 'Dementia Care Specialist'], languages: ['English'],                   city: 'Boston',        state: 'Massachusetts', zip: '02215', address1: '88 Brookline Ave',          lat: 42.3601,  lng: -71.0589  },
  { name: 'Grace Nakamura',    headline: 'Gentle dementia care with strong family communication',                 hourlyMin: 26, hourlyMax: 36, experience: '5-10 years', careTypes: ['dementia-care', 'companionship'],                     certifications: ['Dementia Care Specialist', 'HHA'],                      languages: ['English', 'Mandarin'],          city: 'Portland',      state: 'Oregon',        zip: '97210', address1: '405 NW 23rd Ave',          lat: 45.5051,  lng: -122.6750 },
  { name: 'Kevin Williams',    headline: 'Reliable home health aide with flexible scheduling',                    hourlyMin: 16, hourlyMax: 21, experience: '1-2 years',  careTypes: ['personal-care', 'companionship'],                     certifications: ['HHA', 'First Aid'],                                     languages: ['English'],                      city: 'Atlanta',       state: 'Georgia',       zip: '30308', address1: '620 Peachtree St NE',      lat: 33.7490,  lng: -84.3880  },
  { name: 'Isabelle Dupont',   headline: 'Multilingual caregiver with European personal care training',           hourlyMin: 27, hourlyMax: 37, experience: '5-10 years', careTypes: ['personal-care', 'companionship'],                     certifications: ['CNA', 'CPR/AED', 'First Aid'],                          languages: ['English', 'French', 'Spanish'], city: 'New York',      state: 'New York',      zip: '10023', address1: '241 W 72nd St',            lat: 40.7128,  lng: -74.0060  },
  { name: 'Samuel Okafor',     headline: 'Mobility and personal care advocate with 10 years in community care',  hourlyMin: 22, hourlyMax: 30, experience: '10+ years',  careTypes: ['mobility-assistance', 'personal-care', 'companionship'], certifications: ['HHA', 'CPR/AED', 'First Aid'],                        languages: ['English'],                      city: 'Philadelphia',  state: 'Pennsylvania',  zip: '19130', address1: '1501 Spring Garden St',    lat: 39.9526,  lng: -75.1652  },
  { name: 'Dorothy Harris',    headline: 'Warm and experienced companion and personal care aide',                 hourlyMin: 20, hourlyMax: 27, experience: '3-5 years',  careTypes: ['companionship', 'personal-care'],                     certifications: ['First Aid', 'CPR/AED'],                                 languages: ['English'],                      city: 'Nashville',     state: 'Tennessee',     zip: '37209', address1: '2100 Charlotte Ave',       lat: 36.1627,  lng: -86.7816  },
  { name: 'Raj Patel',         headline: 'Holistic caregiver with focus on wellness and dignity',                 hourlyMin: 24, hourlyMax: 34, experience: '5-10 years', careTypes: ['dementia-care', 'personal-care'],                     certifications: ['CNA', 'Dementia Care Specialist', 'CPR/AED'],           languages: ['English'],                      city: 'Austin',        state: 'Texas',         zip: '78704', address1: '901 S Congress Ave',       lat: 30.2672,  lng: -97.7431  },
  { name: 'Nora Fitzgerald',   headline: 'Post-hospital and companion care specialist',                           hourlyMin: 30, hourlyMax: 40, experience: '10+ years',  careTypes: ['post-hospital-recovery', 'companionship'],            certifications: ['CNA', 'CPR/AED', 'First Aid'],                          languages: ['English', 'French'],            city: 'Minneapolis',   state: 'Minnesota',     zip: '55401', address1: '730 N Washington Ave',     lat: 44.9778,  lng: -93.2650  },
  { name: 'Elena Vasquez',     headline: 'Personal care aide dedicated to comfort and quality of life',           hourlyMin: 18, hourlyMax: 24, experience: '1-2 years',  careTypes: ['personal-care', 'mobility-assistance'],               certifications: ['HHA', 'First Aid'],                                     languages: ['English', 'Spanish'],           city: 'Albuquerque',   state: 'New Mexico',    zip: '87102', address1: '400 Gold Ave SW',          lat: 35.0844,  lng: -106.6504 },
]

// ---------------------------------------------------------------------------
// Clients — each with lat/lng and multiple care recipients
// ---------------------------------------------------------------------------

const CLIENTS = [
  {
    name: 'Susan Bradley',     city: 'Los Angeles',   state: 'California',    address1: '312 S Beaudry Ave',     lat: 34.0530,  lng: -118.2490,
    recipients: [
      { name: 'Eleanor Bradley',  relationship: 'parent',      dob: '03/15/1945', gender: 'female', phone: '(310) 555-0201', address: { address1: '4821 Sunset Blvd',       city: 'Los Angeles',   state: 'California',    zip: '90027' }, conditions: ['arthritis', 'vision-impairment'],  mobilityLevel: 'minimal-assistance',  notes: 'Enjoys crossword puzzles and afternoon tea. Prefers female caregivers.' },
      { name: 'Thomas Bradley',   relationship: 'parent',      dob: '08/22/1942', gender: 'male',   phone: '(310) 555-0202', address: { address1: '1120 W 6th St',          city: 'Los Angeles',   state: 'California',    zip: '90017' }, conditions: ['dementia'],                         mobilityLevel: 'moderate-assistance', notes: 'Early-stage dementia. Responds well to music therapy and familiar routines.' },
      { name: 'Olivia Bradley',   relationship: 'grandparent', dob: '11/03/1938', gender: 'female', phone: '(310) 555-0203', address: { address1: '2233 Griffith Park Blvd', city: 'Los Angeles',   state: 'California',    zip: '90039' }, conditions: ['heart-disease'],                   mobilityLevel: 'full-assistance',     notes: 'History of cardiac issues. Needs help with all daily activities. Very social personality.' },
    ],
  },
  {
    name: 'John Martinez',     city: 'Houston',       state: 'Texas',         address1: '1200 Main St',          lat: 29.7580,  lng: -95.3630,
    recipients: [
      { name: 'Rosa Martinez',    relationship: 'parent',      dob: '05/12/1948', gender: 'female', phone: '(713) 555-0301', address: { address1: '3402 Montrose Blvd',     city: 'Houston',       state: 'Texas',         zip: '77006' }, conditions: ['diabetes', 'heart-disease'],        mobilityLevel: 'minimal-assistance',  notes: 'Strict diabetic diet. Enjoys telenovelas in the afternoon.' },
      { name: 'Luis Martinez',    relationship: 'parent',      dob: '09/30/1944', gender: 'male',   phone: '(713) 555-0302', address: { address1: '718 Waugh Dr',           city: 'Houston',       state: 'Texas',         zip: '77019' }, conditions: ['copd', 'arthritis'],                mobilityLevel: 'moderate-assistance', notes: 'Requires oxygen support. No strenuous activity.' },
      { name: 'Ana Martinez',     relationship: 'grandparent', dob: '02/18/1936', gender: 'female', phone: '(713) 555-0303', address: { address1: '5510 Bellaire Blvd',     city: 'Houston',       state: 'Texas',         zip: '77401' }, conditions: ['dementia'],                         mobilityLevel: 'full-assistance',     notes: 'Mid-stage dementia. Prefers Spanish-speaking caregivers.' },
    ],
  },
  {
    name: 'Emily Wong',        city: 'San Francisco', state: 'California',    address1: '555 Mission St',        lat: 37.7860,  lng: -122.4000,
    recipients: [
      { name: 'Henry Wong',       relationship: 'grandparent', dob: '07/04/1934', gender: 'male',   phone: '(415) 555-0401', address: { address1: '840 Noe St',             city: 'San Francisco', state: 'California',    zip: '94110' }, conditions: ['dementia', 'alzheimers'],           mobilityLevel: 'full-assistance',     notes: "Advanced Alzheimer's. Needs calm environment and consistent routines." },
      { name: 'Grace Wong',       relationship: 'parent',      dob: '03/22/1950', gender: 'female', phone: '(415) 555-0402', address: { address1: '1470 Haight St',         city: 'San Francisco', state: 'California',    zip: '94110' }, conditions: ['arthritis', 'depression'],          mobilityLevel: 'minimal-assistance',  notes: 'Manages depression with medication. Enjoys gardening and light walks.' },
      { name: 'Martin Wong',      relationship: 'parent',      dob: '11/15/1947', gender: 'male',   phone: '(415) 555-0403', address: { address1: '255 Castro St',          city: 'San Francisco', state: 'California',    zip: '94110' }, conditions: ['copd', 'vision-impairment'],        mobilityLevel: 'moderate-assistance', notes: 'COPD requires indoor activities. Uses glasses and magnifying aids.' },
    ],
  },
  {
    name: 'Michael Ross',      city: 'Phoenix',       state: 'Arizona',       address1: '2020 N 24th St',        lat: 33.4600,  lng: -112.0600,
    recipients: [
      { name: 'George Ross',      relationship: 'parent',      dob: '06/01/1943', gender: 'male',   phone: '(602) 555-0501', address: { address1: '1601 N 7th Ave',         city: 'Phoenix',       state: 'Arizona',       zip: '85003' }, conditions: ['stroke'],                          mobilityLevel: 'moderate-assistance', notes: 'Recovering from stroke. Left-side weakness. Physical therapy ongoing.' },
      { name: 'Patricia Ross',    relationship: 'parent',      dob: '04/17/1946', gender: 'female', phone: '(602) 555-0502', address: { address1: '4830 N Central Ave',     city: 'Phoenix',       state: 'Arizona',       zip: '85003' }, conditions: ['arthritis', 'heart-disease'],       mobilityLevel: 'minimal-assistance',  notes: 'Joint pain limits mobility in mornings. Heart condition monitored.' },
      { name: 'William Ross',     relationship: 'spouse',      dob: '01/29/1948', gender: 'male',   phone: '(602) 555-0503', address: { address1: '3220 E Camelback Rd',    city: 'Phoenix',       state: 'Arizona',       zip: '85003' }, conditions: ['parkinsons'],                      mobilityLevel: 'moderate-assistance', notes: "Early Parkinson's. Medication timing is critical." },
    ],
  },
  {
    name: 'Jennifer Lopez',    city: 'Miami',         state: 'Florida',       address1: '801 Brickell Ave',      lat: 25.7650,  lng: -80.1900,
    recipients: [
      { name: 'Carmen Lopez',     relationship: 'parent',      dob: '08/06/1952', gender: 'female', phone: '(305) 555-0601', address: { address1: '2750 SW 28th Ln',        city: 'Miami',         state: 'Florida',       zip: '33130' }, conditions: ['arthritis', 'depression'],          mobilityLevel: 'minimal-assistance',  notes: 'Prefers Spanish-speaking caregivers. Enjoys music and conversation.' },
      { name: 'Ricardo Lopez',    relationship: 'parent',      dob: '12/14/1949', gender: 'male',   phone: '(305) 555-0602', address: { address1: '3430 Main Hwy',          city: 'Miami',         state: 'Florida',       zip: '33130' }, conditions: ['diabetes', 'heart-disease'],        mobilityLevel: 'moderate-assistance', notes: 'Insulin-dependent diabetic. Strict dietary requirements.' },
      { name: 'Maria Lopez',      relationship: 'grandparent', dob: '03/07/1940', gender: 'female', phone: '(305) 555-0603', address: { address1: '620 Alhambra Plaza',     city: 'Miami',         state: 'Florida',       zip: '33130' }, conditions: ['dementia', 'vision-impairment'],    mobilityLevel: 'full-assistance',     notes: 'Mid-stage dementia with poor vision. Needs patient, consistent care.' },
    ],
  },
  {
    name: 'David Park',        city: 'Seattle',       state: 'Washington',    address1: '1411 4th Ave',          lat: 47.6100,  lng: -122.3350,
    recipients: [
      { name: 'Young Park',       relationship: 'parent',      dob: '02/14/1945', gender: 'female', phone: '(206) 555-0701', address: { address1: '519 E Pine St',          city: 'Seattle',       state: 'Washington',    zip: '98101' }, conditions: ['dementia', 'parkinsons'],           mobilityLevel: 'full-assistance',     notes: "Combined dementia and Parkinson's. Complex medication schedule." },
      { name: 'Sun Park',         relationship: 'parent',      dob: '07/11/1948', gender: 'female', phone: '(206) 555-0702', address: { address1: '208 Queen Anne Ave N',   city: 'Seattle',       state: 'Washington',    zip: '98101' }, conditions: ['diabetes', 'arthritis'],            mobilityLevel: 'minimal-assistance',  notes: 'Active diabetic management. Enjoys Korean cooking shows.' },
      { name: 'James Park',       relationship: 'parent',      dob: '10/05/1944', gender: 'male',   phone: '(206) 555-0703', address: { address1: '3009 NE 55th St',        city: 'Seattle',       state: 'Washington',    zip: '98101' }, conditions: ['copd', 'hearing-impairment'],       mobilityLevel: 'moderate-assistance', notes: 'Uses hearing aids. COPD requires breathing exercises daily.' },
    ],
  },
  {
    name: 'Lisa Anderson',     city: 'Chicago',       state: 'Illinois',      address1: '900 N Michigan Ave',    lat: 41.8970,  lng: -87.6240,
    recipients: [
      { name: 'Ruth Anderson',    relationship: 'parent',      dob: '09/28/1943', gender: 'female', phone: '(312) 555-0801', address: { address1: '2441 N Clark St',        city: 'Chicago',       state: 'Illinois',      zip: '60614' }, conditions: ['copd', 'anxiety'],                  mobilityLevel: 'moderate-assistance', notes: 'Anxiety managed with medication. Prefers familiar routines and minimal surprises.' },
      { name: 'Harold Anderson',  relationship: 'parent',      dob: '05/03/1940', gender: 'male',   phone: '(312) 555-0802', address: { address1: '4200 N Sheridan Rd',     city: 'Chicago',       state: 'Illinois',      zip: '60614' }, conditions: ['dementia', 'stroke'],               mobilityLevel: 'full-assistance',     notes: 'Post-stroke dementia. Limited verbal communication.' },
      { name: 'Betty Anderson',   relationship: 'grandparent', dob: '01/19/1937', gender: 'female', phone: '(312) 555-0803', address: { address1: '1630 N Wells St',        city: 'Chicago',       state: 'Illinois',      zip: '60614' }, conditions: ['arthritis', 'depression'],          mobilityLevel: 'minimal-assistance',  notes: 'Enjoys card games and TV programs. Emotionally sensitive.' },
    ],
  },
  {
    name: 'Karen White',       city: 'San Antonio',   state: 'Texas',         address1: '433 N Loop 1604 W',     lat: 29.4300,  lng: -98.4900,
    recipients: [
      { name: 'Frank White',      relationship: 'spouse',      dob: '04/12/1946', gender: 'male',   phone: '(210) 555-0901', address: { address1: '218 E Commerce St',      city: 'San Antonio',   state: 'Texas',         zip: '77002' }, conditions: ['heart-disease', 'diabetes'],        mobilityLevel: 'moderate-assistance', notes: 'Cardiac monitoring required. Low sodium, diabetic diet.' },
      { name: 'Dorothy White',    relationship: 'parent',      dob: '07/25/1943', gender: 'female', phone: '(210) 555-0902', address: { address1: '1100 McCullough Ave',    city: 'San Antonio',   state: 'Texas',         zip: '77002' }, conditions: ['arthritis', 'vision-impairment'],   mobilityLevel: 'minimal-assistance',  notes: 'Uses walker for balance. Reading glasses required for all activities.' },
      { name: 'Richard White',    relationship: 'parent',      dob: '11/08/1941', gender: 'male',   phone: '(210) 555-0903', address: { address1: '2812 N St. Mary\'s St', city: 'San Antonio',   state: 'Texas',         zip: '77002' }, conditions: ['parkinsons'],                      mobilityLevel: 'moderate-assistance', notes: "Parkinson's with significant tremors. Requires assistance with fine motor tasks." },
    ],
  },
  {
    name: 'Mark Taylor',       city: 'New Orleans',   state: 'Louisiana',     address1: '600 Canal St',          lat: 29.9540,  lng: -90.0700,
    recipients: [
      { name: 'Mabel Taylor',     relationship: 'parent',      dob: '06/16/1944', gender: 'female', phone: '(504) 555-1001', address: { address1: '2800 Magazine St',       city: 'New Orleans',   state: 'Louisiana',     zip: '70115' }, conditions: ['arthritis', 'hearing-impairment'],  mobilityLevel: 'minimal-assistance',  notes: 'Hard of hearing. Speak loudly and clearly near her right side.' },
      { name: 'Earl Taylor',      relationship: 'parent',      dob: '03/09/1941', gender: 'male',   phone: '(504) 555-1002', address: { address1: '1621 Bourbon St',        city: 'New Orleans',   state: 'Louisiana',     zip: '70115' }, conditions: ['stroke', 'copd'],                  mobilityLevel: 'moderate-assistance', notes: 'Post-stroke recovery. Breathing exercises essential.' },
      { name: 'Beatrice Taylor',  relationship: 'grandparent', dob: '08/22/1936', gender: 'female', phone: '(504) 555-1003', address: { address1: '4501 St. Charles Ave',   city: 'New Orleans',   state: 'Louisiana',     zip: '70115' }, conditions: ['dementia', 'depression'],           mobilityLevel: 'full-assistance',     notes: 'Memory care needed. History of seasonal depression.' },
    ],
  },
  {
    name: 'Nancy Green',       city: 'Denver',        state: 'Colorado',      address1: '1700 Lincoln St',       lat: 39.7450,  lng: -104.9870,
    recipients: [
      { name: 'Arthur Green',     relationship: 'parent',      dob: '10/30/1942', gender: 'male',   phone: '(720) 555-1101', address: { address1: '1290 Gaylord St',        city: 'Denver',        state: 'Colorado',      zip: '80202' }, conditions: ['parkinsons'],                      mobilityLevel: 'moderate-assistance', notes: "Parkinson's medication critical. Loves classical music and gardening." },
      { name: 'Mildred Green',    relationship: 'parent',      dob: '05/21/1945', gender: 'female', phone: '(720) 555-1102', address: { address1: '450 E 7th Ave',          city: 'Denver',        state: 'Colorado',      zip: '80202' }, conditions: ['dementia', 'anxiety'],              mobilityLevel: 'full-assistance',     notes: 'Anxiety peaks in evenings (sundowning). Needs calm evening routine.' },
      { name: 'Herbert Green',    relationship: 'spouse',      dob: '01/14/1943', gender: 'male',   phone: '(720) 555-1103', address: { address1: '3100 E Colfax Ave',      city: 'Denver',        state: 'Colorado',      zip: '80202' }, conditions: ['copd', 'heart-disease'],            mobilityLevel: 'moderate-assistance', notes: 'Oxygen tank required. Cardiac checkups monthly.' },
    ],
  },
  {
    name: 'Steven Clark',      city: 'Las Vegas',     state: 'Nevada',        address1: '3750 S Las Vegas Blvd', lat: 36.1750,  lng: -115.1350,
    recipients: [
      { name: 'Evelyn Clark',     relationship: 'parent',      dob: '04/08/1939', gender: 'female', phone: '(702) 555-1201', address: { address1: '1840 E Sahara Ave',      city: 'Las Vegas',     state: 'Nevada',        zip: '89101' }, conditions: ['alzheimers', 'vision-impairment'],  mobilityLevel: 'full-assistance',     notes: "Advanced Alzheimer's. Limited vision adds to disorientation." },
      { name: 'Raymond Clark',    relationship: 'parent',      dob: '09/17/1947', gender: 'male',   phone: '(702) 555-1202', address: { address1: '621 N Lamb Blvd',        city: 'Las Vegas',     state: 'Nevada',        zip: '89101' }, conditions: ['diabetes', 'arthritis'],            mobilityLevel: 'minimal-assistance',  notes: 'Manages diabetes well. Arthritis worse in cold weather.' },
    ],
  },
  {
    name: 'Dorothy Lewis',     city: 'Boston',        state: 'Massachusetts', address1: '290 Congress St',       lat: 42.3570,  lng: -71.0550,
    recipients: [
      { name: 'Howard Lewis',     relationship: 'spouse',      dob: '12/03/1942', gender: 'male',   phone: '(617) 555-1301', address: { address1: '45 Marlborough St',      city: 'Boston',        state: 'Massachusetts', zip: '02215' }, conditions: ['stroke', 'depression'],             mobilityLevel: 'moderate-assistance', notes: 'Post-stroke depression. Speech therapy ongoing. Responds to encouragement.' },
      { name: 'Shirley Lewis',    relationship: 'parent',      dob: '07/29/1938', gender: 'female', phone: '(617) 555-1302', address: { address1: '172 Tremont St',         city: 'Boston',        state: 'Massachusetts', zip: '02215' }, conditions: ['dementia', 'hearing-impairment'],   mobilityLevel: 'full-assistance',     notes: 'Dementia with hearing loss. Uses written communication boards.' },
    ],
  },
  {
    name: 'Paul Walker',       city: 'Portland',      state: 'Oregon',        address1: '115 SW Ash St',         lat: 45.5200,  lng: -122.6700,
    recipients: [
      { name: 'Marjorie Walker',  relationship: 'parent',      dob: '03/14/1944', gender: 'female', phone: '(503) 555-1401', address: { address1: '2310 NW Kearney St',     city: 'Portland',      state: 'Oregon',        zip: '97201' }, conditions: ['dementia', 'copd'],                 mobilityLevel: 'full-assistance',     notes: 'COPD with dementia. Needs calm, oxygen-safe environment.' },
      { name: 'Eugene Walker',    relationship: 'parent',      dob: '10/07/1941', gender: 'male',   phone: '(503) 555-1402', address: { address1: '1427 SE Hawthorne Blvd', city: 'Portland',      state: 'Oregon',        zip: '97201' }, conditions: ['parkinsons', 'arthritis'],          mobilityLevel: 'moderate-assistance', notes: "Parkinson's with arthritic pain. OT exercises three times weekly." },
    ],
  },
  {
    name: 'Sandra Hill',       city: 'Atlanta',       state: 'Georgia',       address1: '191 Peachtree St',      lat: 33.7560,  lng: -84.3860,
    recipients: [
      { name: 'Charles Hill',     relationship: 'parent',      dob: '06/19/1946', gender: 'male',   phone: '(404) 555-1501', address: { address1: '855 W Peachtree St NW',  city: 'Atlanta',       state: 'Georgia',       zip: '30308' }, conditions: ['diabetes', 'heart-disease'],        mobilityLevel: 'minimal-assistance',  notes: 'Mostly independent. Requires reminders for insulin and medication.' },
      { name: 'Virginia Hill',    relationship: 'parent',      dob: '02/27/1943', gender: 'female', phone: '(404) 555-1502', address: { address1: '2110 Piedmont Rd NE',    city: 'Atlanta',       state: 'Georgia',       zip: '30308' }, conditions: ['alzheimers', 'anxiety'],            mobilityLevel: 'full-assistance',     notes: "Anxiety triggered by changes in routine. Early Alzheimer's." },
      { name: 'Floyd Hill',       relationship: 'grandparent', dob: '11/11/1937', gender: 'male',   phone: '(404) 555-1503', address: { address1: '3720 Roswell Rd NE',     city: 'Atlanta',       state: 'Georgia',       zip: '30308' }, conditions: ['stroke'],                          mobilityLevel: 'moderate-assistance', notes: 'Post-stroke mobility impairment. Left-side weakness.' },
    ],
  },
  {
    name: 'James Harris',      city: 'New York',      state: 'New York',      address1: '350 5th Ave',           lat: 40.7480,  lng: -73.9860,
    recipients: [
      { name: 'Bertha Harris',    relationship: 'parent',      dob: '08/14/1945', gender: 'female', phone: '(212) 555-1601', address: { address1: '211 W 71st St',          city: 'New York',      state: 'New York',      zip: '10023' }, conditions: ['arthritis', 'anxiety'],             mobilityLevel: 'minimal-assistance',  notes: 'Manages anxiety with therapy. Arthritis in hands and knees.' },
      { name: 'Frederick Harris', relationship: 'parent',      dob: '04/05/1942', gender: 'male',   phone: '(212) 555-1602', address: { address1: '424 W 43rd St',          city: 'New York',      state: 'New York',      zip: '10023' }, conditions: ['dementia', 'copd'],                 mobilityLevel: 'moderate-assistance', notes: 'COPD with cognitive decline. Requires careful medication management.' },
    ],
  },
  {
    name: 'Barbara Young',     city: 'Philadelphia',  state: 'Pennsylvania',  address1: '1500 Market St',        lat: 39.9530,  lng: -75.1660,
    recipients: [
      { name: 'Walter Young',     relationship: 'spouse',      dob: '09/22/1940', gender: 'male',   phone: '(215) 555-1701', address: { address1: '822 Pine St',            city: 'Philadelphia',  state: 'Pennsylvania',  zip: '19103' }, conditions: ['parkinsons', 'depression'],         mobilityLevel: 'moderate-assistance', notes: "Parkinson's and depression. Social engagement important for mood." },
      { name: 'Irene Young',      relationship: 'parent',      dob: '01/31/1947', gender: 'female', phone: '(215) 555-1702', address: { address1: '2001 Fairmount Ave',     city: 'Philadelphia',  state: 'Pennsylvania',  zip: '19103' }, conditions: ['diabetes', 'heart-disease'],        mobilityLevel: 'minimal-assistance',  notes: 'Well-managed diabetes. Cardiac monitoring required monthly.' },
    ],
  },
  {
    name: 'Christopher Adams', city: 'Nashville',     state: 'Tennessee',     address1: '333 Commerce St',       lat: 36.1660,  lng: -86.7800,
    recipients: [
      { name: 'Florence Adams',   relationship: 'parent',      dob: '05/26/1943', gender: 'female', phone: '(615) 555-1801', address: { address1: '1112 Fatherland St',     city: 'Nashville',     state: 'Tennessee',     zip: '37203' }, conditions: ['copd', 'hearing-impairment'],       mobilityLevel: 'moderate-assistance', notes: 'COPD with hearing aids. Speak loudly and clearly.' },
      { name: 'Clarence Adams',   relationship: 'parent',      dob: '08/14/1940', gender: 'male',   phone: '(615) 555-1802', address: { address1: '408 Gallatin Ave',       city: 'Nashville',     state: 'Tennessee',     zip: '37203' }, conditions: ['arthritis'],                       mobilityLevel: 'minimal-assistance',  notes: 'Arthritis in spine and hips. Needs help with bending tasks.' },
      { name: 'Norma Adams',      relationship: 'grandparent', dob: '03/07/1935', gender: 'female', phone: '(615) 555-1803', address: { address1: '2703 Granny White Pike', city: 'Nashville',     state: 'Tennessee',     zip: '37203' }, conditions: ['dementia'],                         mobilityLevel: 'full-assistance',     notes: 'Advanced dementia. Needs full-time supervision.' },
    ],
  },
  {
    name: 'Jessica Nelson',    city: 'Austin',        state: 'Texas',         address1: '210 W 6th St',          lat: 30.2700,  lng: -97.7450,
    recipients: [
      { name: 'Lawrence Nelson',  relationship: 'parent',      dob: '02/20/1944', gender: 'male',   phone: '(512) 555-1901', address: { address1: '1800 Lavaca St',         city: 'Austin',        state: 'Texas',         zip: '77002' }, conditions: ['dementia', 'diabetes'],             mobilityLevel: 'moderate-assistance', notes: 'Dementia with diabetic management. Two caregivers coordinate shifts.' },
      { name: 'Gladys Nelson',    relationship: 'parent',      dob: '07/03/1947', gender: 'female', phone: '(512) 555-1902', address: { address1: '3401 S Congress Ave',    city: 'Austin',        state: 'Texas',         zip: '77002' }, conditions: ['heart-disease', 'arthritis'],       mobilityLevel: 'minimal-assistance',  notes: 'Heart condition stable on medication. Active with modifications.' },
    ],
  },
  {
    name: 'Matthew Carter',    city: 'Minneapolis',   state: 'Minnesota',     address1: '800 Nicollet Mall',     lat: 44.9800,  lng: -93.2700,
    recipients: [
      { name: 'Lillian Carter',   relationship: 'parent',      dob: '11/28/1942', gender: 'female', phone: '(612) 555-2001', address: { address1: '2808 Hennepin Ave',      city: 'Minneapolis',   state: 'Minnesota',     zip: '55401' }, conditions: ['stroke'],                          mobilityLevel: 'moderate-assistance', notes: 'Post-stroke recovery. Right-side weakness. Speech improving.' },
      { name: 'Wilbur Carter',    relationship: 'parent',      dob: '06/15/1939', gender: 'male',   phone: '(612) 555-2002', address: { address1: '1525 W Lake St',         city: 'Minneapolis',   state: 'Minnesota',     zip: '55401' }, conditions: ['parkinsons', 'copd'],               mobilityLevel: 'full-assistance',     notes: "Combined Parkinson's and COPD. Complex care needs." },
    ],
  },
  {
    name: 'Ashley Mitchell',   city: 'Albuquerque',   state: 'New Mexico',    address1: '505 Marquette Ave',     lat: 35.0870,  lng: -106.6480,
    recipients: [
      { name: 'Donald Mitchell',  relationship: 'grandparent', dob: '04/01/1936', gender: 'male',   phone: '(505) 555-2101', address: { address1: '3401 Central Ave NE',    city: 'Albuquerque',   state: 'New Mexico',    zip: '87102' }, conditions: ['alzheimers', 'arthritis'],          mobilityLevel: 'full-assistance',     notes: "Advanced Alzheimer's with arthritic pain. Memory care specialist preferred." },
      { name: 'Pauline Mitchell', relationship: 'parent',      dob: '10/19/1949', gender: 'female', phone: '(505) 555-2102', address: { address1: '820 Rio Grande Blvd NW', city: 'Albuquerque',   state: 'New Mexico',    zip: '87102' }, conditions: ['diabetes', 'depression'],           mobilityLevel: 'minimal-assistance',  notes: 'Managed depression and diabetes. Enjoys art therapy and light walking.' },
    ],
  },
]

// Care request templates per client
const REQUEST_TEMPLATES = [
  [{ careType: 'personal-care',          title: 'Daily morning personal care for mother',                    frequency: 'daily',    schedule: [{ day: 'monday', startTime: '09:00', endTime: '13:00' }, { day: 'tuesday', startTime: '09:00', endTime: '13:00' }, { day: 'wednesday', startTime: '09:00', endTime: '13:00' }, { day: 'thursday', startTime: '09:00', endTime: '13:00' }, { day: 'friday', startTime: '09:00', endTime: '13:00' }], budgetType: 'hourly', budgetAmount: '25' }, { careType: 'companionship',           title: 'Weekend companion visits',                                    frequency: 'weekly',   schedule: [{ day: 'saturday', startTime: '09:00', endTime: '11:00' }, { day: 'sunday', startTime: '09:00', endTime: '11:00' }], budgetType: 'hourly', budgetAmount: '20' }],
  [{ careType: 'post-hospital-recovery', title: 'Post-surgery home recovery assistance',                     frequency: 'daily',    schedule: [{ day: 'monday', startTime: '09:00', endTime: '15:00' }, { day: 'wednesday', startTime: '09:00', endTime: '15:00' }, { day: 'friday', startTime: '09:00', endTime: '15:00' }], budgetType: 'hourly', budgetAmount: '30' }, { careType: 'personal-care',           title: 'Evening personal care for father',                            frequency: 'weekly',   schedule: [{ day: 'tuesday', startTime: '09:00', endTime: '12:00' }, { day: 'thursday', startTime: '09:00', endTime: '12:00' }], budgetType: 'hourly', budgetAmount: '22' }],
  [{ careType: 'dementia-care',          title: 'Specialized dementia care for grandfather',                 frequency: 'daily',    schedule: [{ day: 'monday', startTime: '09:00', endTime: '17:00' }, { day: 'tuesday', startTime: '09:00', endTime: '17:00' }, { day: 'wednesday', startTime: '09:00', endTime: '17:00' }, { day: 'thursday', startTime: '09:00', endTime: '17:00' }, { day: 'friday', startTime: '09:00', endTime: '17:00' }], budgetType: 'hourly', budgetAmount: '35' }, { careType: 'companionship',           title: 'Daily companionship and activities',                          frequency: 'daily',    schedule: [{ day: 'monday', startTime: '09:00', endTime: '11:00' }, { day: 'wednesday', startTime: '09:00', endTime: '11:00' }, { day: 'friday', startTime: '09:00', endTime: '11:00' }], budgetType: 'hourly', budgetAmount: '22' }],
  [{ careType: 'mobility-assistance',    title: 'Mobility and physical therapy support for dad',             frequency: 'bi-weekly',schedule: [{ day: 'monday', startTime: '09:00', endTime: '13:00' }, { day: 'thursday', startTime: '09:00', endTime: '13:00' }], budgetType: 'hourly', budgetAmount: '24' }, { careType: 'personal-care',           title: 'Daily personal care routine',                                 frequency: 'daily',    schedule: [{ day: 'tuesday', startTime: '09:00', endTime: '12:00' }, { day: 'wednesday', startTime: '09:00', endTime: '12:00' }, { day: 'friday', startTime: '09:00', endTime: '12:00' }], budgetType: 'hourly', budgetAmount: '21' }],
  [{ careType: 'personal-care',          title: 'Comprehensive personal care for mother',                    frequency: 'daily',    schedule: [{ day: 'monday', startTime: '09:00', endTime: '13:00' }, { day: 'tuesday', startTime: '09:00', endTime: '13:00' }, { day: 'wednesday', startTime: '09:00', endTime: '13:00' }, { day: 'thursday', startTime: '09:00', endTime: '13:00' }, { day: 'friday', startTime: '09:00', endTime: '13:00' }], budgetType: 'hourly', budgetAmount: '22' }, { careType: 'companionship',           title: 'Social visits and light activities',                          frequency: 'weekly',   schedule: [{ day: 'saturday', startTime: '09:00', endTime: '12:00' }], budgetType: 'hourly', budgetAmount: '20' }],
  [{ careType: 'dementia-care',          title: "Dementia and Parkinson's daily support",                    frequency: 'daily',    schedule: [{ day: 'monday', startTime: '09:00', endTime: '15:00' }, { day: 'tuesday', startTime: '09:00', endTime: '15:00' }, { day: 'wednesday', startTime: '09:00', endTime: '15:00' }, { day: 'thursday', startTime: '09:00', endTime: '15:00' }, { day: 'friday', startTime: '09:00', endTime: '15:00' }], budgetType: 'hourly', budgetAmount: '38' }, { careType: 'companionship',           title: 'Evening check-ins and companionship',                         frequency: 'daily',    schedule: [{ day: 'monday', startTime: '09:00', endTime: '11:00' }, { day: 'wednesday', startTime: '09:00', endTime: '11:00' }, { day: 'friday', startTime: '09:00', endTime: '11:00' }], budgetType: 'hourly', budgetAmount: '25' }],
  [{ careType: 'personal-care',          title: 'Morning personal care and medication reminders',            frequency: 'daily',    schedule: [{ day: 'monday', startTime: '09:00', endTime: '12:00' }, { day: 'tuesday', startTime: '09:00', endTime: '12:00' }, { day: 'wednesday', startTime: '09:00', endTime: '12:00' }, { day: 'thursday', startTime: '09:00', endTime: '12:00' }, { day: 'friday', startTime: '09:00', endTime: '12:00' }], budgetType: 'hourly', budgetAmount: '20' }, { careType: 'companionship',           title: 'Weekend social engagement visits',                            frequency: 'weekly',   schedule: [{ day: 'saturday', startTime: '09:00', endTime: '11:00' }, { day: 'sunday', startTime: '09:00', endTime: '11:00' }], budgetType: 'hourly', budgetAmount: '18' }],
  [{ careType: 'post-hospital-recovery', title: 'At-home recovery care after cardiac procedure',             frequency: 'daily',    schedule: [{ day: 'monday', startTime: '09:00', endTime: '14:00' }, { day: 'tuesday', startTime: '09:00', endTime: '14:00' }, { day: 'wednesday', startTime: '09:00', endTime: '14:00' }, { day: 'thursday', startTime: '09:00', endTime: '14:00' }, { day: 'friday', startTime: '09:00', endTime: '14:00' }], budgetType: 'hourly', budgetAmount: '28' }, { careType: 'mobility-assistance',     title: 'Mobility and exercise support',                               frequency: 'bi-weekly',schedule: [{ day: 'tuesday', startTime: '09:00', endTime: '12:00' }, { day: 'thursday', startTime: '09:00', endTime: '12:00' }], budgetType: 'hourly', budgetAmount: '26' }],
  [{ careType: 'mobility-assistance',    title: 'Mobility assistance and fall prevention for mom',           frequency: 'daily',    schedule: [{ day: 'monday', startTime: '09:00', endTime: '12:00' }, { day: 'wednesday', startTime: '09:00', endTime: '12:00' }, { day: 'friday', startTime: '09:00', endTime: '12:00' }], budgetType: 'hourly', budgetAmount: '22' }, { careType: 'companionship',           title: 'Afternoon social visits',                                     frequency: 'weekly',   schedule: [{ day: 'saturday', startTime: '09:00', endTime: '11:00' }], budgetType: 'hourly', budgetAmount: '20' }],
  [{ careType: 'personal-care',          title: 'Full personal care assistance for father',                  frequency: 'daily',    schedule: [{ day: 'monday', startTime: '09:00', endTime: '13:00' }, { day: 'tuesday', startTime: '09:00', endTime: '13:00' }, { day: 'wednesday', startTime: '09:00', endTime: '13:00' }, { day: 'thursday', startTime: '09:00', endTime: '13:00' }, { day: 'friday', startTime: '09:00', endTime: '13:00' }], budgetType: 'hourly', budgetAmount: '26' }, { careType: 'mobility-assistance',     title: 'Evening mobility support',                                    frequency: 'weekly',   schedule: [{ day: 'tuesday', startTime: '09:00', endTime: '11:00' }, { day: 'thursday', startTime: '09:00', endTime: '11:00' }], budgetType: 'hourly', budgetAmount: '23' }],
  [{ careType: 'companionship',          title: "Daily companionship for mother with Alzheimer's",           frequency: 'daily',    schedule: [{ day: 'monday', startTime: '09:00', endTime: '13:00' }, { day: 'tuesday', startTime: '09:00', endTime: '13:00' }, { day: 'wednesday', startTime: '09:00', endTime: '13:00' }, { day: 'thursday', startTime: '09:00', endTime: '13:00' }, { day: 'friday', startTime: '09:00', endTime: '13:00' }], budgetType: 'hourly', budgetAmount: '24' }, { careType: 'mobility-assistance',     title: 'Physical mobility support',                                   frequency: 'weekly',   schedule: [{ day: 'saturday', startTime: '09:00', endTime: '12:00' }], budgetType: 'hourly', budgetAmount: '22' }],
  [{ careType: 'post-hospital-recovery', title: 'Stroke recovery home assistance',                           frequency: 'daily',    schedule: [{ day: 'monday', startTime: '09:00', endTime: '14:00' }, { day: 'tuesday', startTime: '09:00', endTime: '14:00' }, { day: 'wednesday', startTime: '09:00', endTime: '14:00' }, { day: 'thursday', startTime: '09:00', endTime: '14:00' }, { day: 'friday', startTime: '09:00', endTime: '14:00' }], budgetType: 'hourly', budgetAmount: '35' }, { careType: 'personal-care',           title: 'Evening personal care',                                       frequency: 'weekly',   schedule: [{ day: 'tuesday', startTime: '09:00', endTime: '12:00' }, { day: 'thursday', startTime: '09:00', endTime: '12:00' }], budgetType: 'hourly', budgetAmount: '30' }],
  [{ careType: 'dementia-care',          title: 'Specialized dementia care for mother',                      frequency: 'daily',    schedule: [{ day: 'monday', startTime: '09:00', endTime: '15:00' }, { day: 'wednesday', startTime: '09:00', endTime: '15:00' }, { day: 'friday', startTime: '09:00', endTime: '15:00' }], budgetType: 'hourly', budgetAmount: '32' }, { careType: 'companionship',           title: 'Social engagement and activities',                            frequency: 'weekly',   schedule: [{ day: 'saturday', startTime: '09:00', endTime: '11:00' }, { day: 'sunday', startTime: '09:00', endTime: '11:00' }], budgetType: 'hourly', budgetAmount: '26' }],
  [{ careType: 'personal-care',          title: 'Daily personal care for diabetic father',                   frequency: 'daily',    schedule: [{ day: 'monday', startTime: '09:00', endTime: '12:00' }, { day: 'tuesday', startTime: '09:00', endTime: '12:00' }, { day: 'wednesday', startTime: '09:00', endTime: '12:00' }, { day: 'thursday', startTime: '09:00', endTime: '12:00' }, { day: 'friday', startTime: '09:00', endTime: '12:00' }], budgetType: 'hourly', budgetAmount: '20' }, { careType: 'companionship',           title: 'Weekend visits and outings',                                  frequency: 'weekly',   schedule: [{ day: 'saturday', startTime: '09:00', endTime: '12:00' }, { day: 'sunday', startTime: '09:00', endTime: '12:00' }], budgetType: 'hourly', budgetAmount: '18' }],
  [{ careType: 'personal-care',          title: 'Daily personal care in NYC apartment',                      frequency: 'daily',    schedule: [{ day: 'monday', startTime: '09:00', endTime: '13:00' }, { day: 'tuesday', startTime: '09:00', endTime: '13:00' }, { day: 'wednesday', startTime: '09:00', endTime: '13:00' }, { day: 'thursday', startTime: '09:00', endTime: '13:00' }, { day: 'friday', startTime: '09:00', endTime: '13:00' }], budgetType: 'hourly', budgetAmount: '40' }, { careType: 'companionship',           title: 'Afternoon companionship and activities',                      frequency: 'weekly',   schedule: [{ day: 'wednesday', startTime: '09:00', endTime: '11:00' }, { day: 'friday', startTime: '09:00', endTime: '11:00' }], budgetType: 'hourly', budgetAmount: '35' }],
  [{ careType: 'mobility-assistance',    title: "Parkinson's mobility and daily living support",             frequency: 'daily',    schedule: [{ day: 'monday', startTime: '09:00', endTime: '13:00' }, { day: 'tuesday', startTime: '09:00', endTime: '13:00' }, { day: 'wednesday', startTime: '09:00', endTime: '13:00' }, { day: 'thursday', startTime: '09:00', endTime: '13:00' }, { day: 'friday', startTime: '09:00', endTime: '13:00' }], budgetType: 'hourly', budgetAmount: '25' }, { careType: 'personal-care',           title: 'Evening care routine',                                        frequency: 'weekly',   schedule: [{ day: 'tuesday', startTime: '09:00', endTime: '11:00' }, { day: 'thursday', startTime: '09:00', endTime: '11:00' }], budgetType: 'hourly', budgetAmount: '22' }],
  [{ careType: 'companionship',          title: 'Daily companionship for mother with COPD',                  frequency: 'daily',    schedule: [{ day: 'monday', startTime: '09:00', endTime: '12:00' }, { day: 'wednesday', startTime: '09:00', endTime: '12:00' }, { day: 'friday', startTime: '09:00', endTime: '12:00' }], budgetType: 'hourly', budgetAmount: '22' }, { careType: 'personal-care',           title: 'Personal care assistance',                                    frequency: 'weekly',   schedule: [{ day: 'saturday', startTime: '09:00', endTime: '11:00' }], budgetType: 'hourly', budgetAmount: '20' }],
  [{ careType: 'dementia-care',          title: 'Dementia care and daily monitoring for father',             frequency: 'daily',    schedule: [{ day: 'monday', startTime: '09:00', endTime: '15:00' }, { day: 'tuesday', startTime: '09:00', endTime: '15:00' }, { day: 'wednesday', startTime: '09:00', endTime: '15:00' }, { day: 'thursday', startTime: '09:00', endTime: '15:00' }, { day: 'friday', startTime: '09:00', endTime: '15:00' }], budgetType: 'hourly', budgetAmount: '30' }, { careType: 'companionship',           title: 'Weekend social visits',                                       frequency: 'weekly',   schedule: [{ day: 'saturday', startTime: '09:00', endTime: '11:00' }, { day: 'sunday', startTime: '09:00', endTime: '11:00' }], budgetType: 'hourly', budgetAmount: '25' }],
  [{ careType: 'post-hospital-recovery', title: 'Post-stroke recovery care for mother',                      frequency: 'daily',    schedule: [{ day: 'monday', startTime: '09:00', endTime: '14:00' }, { day: 'tuesday', startTime: '09:00', endTime: '14:00' }, { day: 'wednesday', startTime: '09:00', endTime: '14:00' }, { day: 'thursday', startTime: '09:00', endTime: '14:00' }, { day: 'friday', startTime: '09:00', endTime: '14:00' }], budgetType: 'hourly', budgetAmount: '32' }, { careType: 'mobility-assistance',     title: 'Mobility support and exercises',                              frequency: 'bi-weekly',schedule: [{ day: 'tuesday', startTime: '09:00', endTime: '12:00' }, { day: 'thursday', startTime: '09:00', endTime: '12:00' }], budgetType: 'hourly', budgetAmount: '28' }],
  [{ careType: 'personal-care',          title: "Comprehensive care for grandfather with Alzheimer's",       frequency: 'daily',    schedule: [{ day: 'monday', startTime: '09:00', endTime: '15:00' }, { day: 'tuesday', startTime: '09:00', endTime: '15:00' }, { day: 'wednesday', startTime: '09:00', endTime: '15:00' }, { day: 'thursday', startTime: '09:00', endTime: '15:00' }, { day: 'friday', startTime: '09:00', endTime: '15:00' }], budgetType: 'hourly', budgetAmount: '22' }, { careType: 'companionship',           title: 'Afternoon visits and memory activities',                      frequency: 'weekly',   schedule: [{ day: 'wednesday', startTime: '09:00', endTime: '11:00' }, { day: 'friday', startTime: '09:00', endTime: '11:00' }], budgetType: 'hourly', budgetAmount: '18' }],
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
      .values({ userId: user.id, headline: cg.headline, about: `${cg.name} is a ${cg.experience} caregiver focused on providing excellent care.`, hourlyMin: String(cg.hourlyMin), hourlyMax: String(cg.hourlyMax), experience: cg.experience, status: 'active', completedStep: 5, availability: [{ day: 'monday', startTime: '08:00', endTime: '17:00' }, { day: 'tuesday', startTime: '08:00', endTime: '17:00' }, { day: 'wednesday', startTime: '08:00', endTime: '17:00' }, { day: 'thursday', startTime: '08:00', endTime: '17:00' }, { day: 'friday', startTime: '08:00', endTime: '17:00' }] })
      .onConflictDoUpdate({ target: caregiverProfiles.userId, set: { headline: cg.headline, status: 'active', hourlyMin: String(cg.hourlyMin), hourlyMax: String(cg.hourlyMax), availability: [{ day: 'monday', startTime: '08:00', endTime: '17:00' }, { day: 'tuesday', startTime: '08:00', endTime: '17:00' }, { day: 'wednesday', startTime: '08:00', endTime: '17:00' }, { day: 'thursday', startTime: '08:00', endTime: '17:00' }, { day: 'friday', startTime: '08:00', endTime: '17:00' }] } })
      .returning({ id: caregiverProfiles.id })

    caregiverProfileIds.push(profile.id)

    await db.delete(caregiverCareTypes).where(eq(caregiverCareTypes.caregiverId, profile.id))
    for (const careType of cg.careTypes) await db.insert(caregiverCareTypes).values({ caregiverId: profile.id, careType }).onConflictDoNothing()
    for (const certification of cg.certifications) await db.insert(caregiverCertifications).values({ caregiverId: profile.id, certification }).onConflictDoNothing()
    for (const language of cg.languages) await db.insert(caregiverLanguages).values({ caregiverId: profile.id, language }).onConflictDoNothing()

    await db.insert(caregiverLocations)
      .values({ caregiverId: profile.id, address1: cg.address1, city: cg.city, state: cg.state, lat: String(cg.lat), lng: String(cg.lng) })
      .onConflictDoUpdate({ target: caregiverLocations.caregiverId, set: { address1: cg.address1, city: cg.city, state: cg.state, lat: String(cg.lat), lng: String(cg.lng) } })

    console.log(`  ✓ ${cg.name} (${cg.city}, ${cg.state} — ${cg.lat}, ${cg.lng})`)
  }

  // ── 2. Clean up existing client seed data ───────────────────────────────
  console.log('\n🧹 Cleaning up old client seed data...')
  const existingClientEmails = CLIENTS.map(c => `${c.name.toLowerCase().replace(/\s+/g, '.')}@client.example.com`)
  const existingClients = await db.select({ id: users.id }).from(users).where(inArray(users.email, existingClientEmails))
  if (existingClients.length > 0) {
    const clientIds = existingClients.map(u => u.id)
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
  console.log('\n👨‍👩‍👧  Seeding 20 clients with multiple recipients...')

  for (let i = 0; i < CLIENTS.length; i++) {
    const cl = CLIENTS[i]
    const reqs = REQUEST_TEMPLATES[i]
    const email = `${cl.name.toLowerCase().replace(/\s+/g, '.')}@client.example.com`

    const [clientUser] = await db
      .insert(users)
      .values({ email, name: cl.name, role: 'client', password: hashedPassword })
      .returning({ id: users.id })

    // Client location with lat/lng
    await db.insert(clientLocations)
      .values({ clientId: clientUser.id, address1: cl.address1, city: cl.city, state: cl.state, lat: String(cl.lat), lng: String(cl.lng) })
      .onConflictDoUpdate({ target: clientLocations.clientId, set: { address1: cl.address1, city: cl.city, state: cl.state, lat: String(cl.lat), lng: String(cl.lng) } })

    // Multiple care recipients — first one is primary (used in care requests)
    const recipientIds: string[] = []
    for (const rec of cl.recipients) {
      const [recipient] = await db
        .insert(careRecipients)
        .values({ clientId: clientUser.id, name: rec.name, relationship: rec.relationship, dob: rec.dob, gender: rec.gender, phone: rec.phone, address: rec.address, conditions: rec.conditions, mobilityLevel: rec.mobilityLevel, notes: rec.notes })
        .returning({ id: careRecipients.id })
      recipientIds.push(recipient.id)
    }
    const primaryRecipientId = recipientIds[0]

    // Care requests (use primary recipient)
    const requestIds: string[] = []
    for (const req of reqs) {
      const [request] = await db
        .insert(careRequests)
        .values({ clientId: clientUser.id, recipientId: primaryRecipientId, careType: req.careType, title: req.title, frequency: req.frequency, schedule: req.schedule, budgetType: req.budgetType, budgetAmount: req.budgetAmount, status: 'active', languagePref: [] })
        .returning({ id: careRequests.id })

      await db.insert(careRequestLocations).values({ requestId: request.id, address1: cl.address1, city: cl.city, state: cl.state, lat: String(cl.lat), lng: String(cl.lng) })
      requestIds.push(request.id)
    }

    const cgProfileId = caregiverProfileIds[i]

    if (i < 10) {
      const [match] = await db
        .insert(matches)
        .values({ requestId: requestIds[0], caregiverId: cgProfileId, score: 85 + i, reason: 'Strong skill match and availability alignment', status: 'accepted' })
        .returning({ id: matches.id })

      const [job] = await db
        .insert(jobs)
        .values({ matchId: match.id, requestId: requestIds[0], caregiverId: cgProfileId, clientId: clientUser.id, status: 'active' })
        .returning({ id: jobs.id })

      const pastDates = pastShiftDates(3)
      const futureDates = futureShiftDates(4)

      for (const date of pastDates) {
        await db.insert(shifts).values({ jobId: job.id, date, startTime: '08:00', endTime: '12:00', status: 'completed' })
      }
      for (const date of futureDates) {
        await db.insert(shifts).values({ jobId: job.id, date, startTime: '08:00', endTime: '12:00', status: 'scheduled' })
      }

      await db.insert(carePlans).values({
        requestId: requestIds[0],
        recipientId: primaryRecipientId,
      })

      await db.update(careRequests).set({ status: 'filled' }).where(eq(careRequests.id, requestIds[0]))

      const altCgIdx = (i + 10) % 20
      await db.insert(matches).values({ requestId: requestIds[1], caregiverId: caregiverProfileIds[altCgIdx], score: 70 + i, reason: 'Good availability and care type match', status: 'pending' })

      const caregiverUsers = await db.select({ userId: caregiverProfiles.userId }).from(caregiverProfiles).where(eq(caregiverProfiles.id, cgProfileId))
      if (caregiverUsers[0]) {
        await db.insert(notifications).values({ userId: caregiverUsers[0].userId, type: 'job_started', payload: { jobId: job.id, clientName: cl.name }, read: false })
      }
      await db.insert(notifications).values({ userId: clientUser.id, type: 'match_found', payload: { jobId: job.id, caregiverProfileId: cgProfileId }, read: false })

    } else {
      const cgIdx1 = i % 20
      const cgIdx2 = (i + 5) % 20
      await db.insert(matches).values({ requestId: requestIds[0], caregiverId: caregiverProfileIds[cgIdx1], score: 72 + (i - 10) * 2, reason: 'Great care type alignment and local availability', status: 'pending' })
      await db.insert(matches).values({ requestId: requestIds[1], caregiverId: caregiverProfileIds[cgIdx2], score: 68 + (i - 10) * 2, reason: 'Strong experience match', status: 'pending' })
      await db.insert(notifications).values({ userId: clientUser.id, type: 'offer_received', payload: { requestId: requestIds[0] }, read: false })
    }

    const recipientNames = cl.recipients.map(r => r.name).join(', ')
    const jobLabel = i < 10 ? '(active job + care plan + shifts)' : '(pending matches)'
    console.log(`  ✓ ${cl.name} — ${recipientNames} ${jobLabel}`)
  }

  console.log('\n✅ Seed complete!\n')
  await client.end()
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
