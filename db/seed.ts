import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import {
  users,
  caregiverProfiles,
  caregiverCareTypes,
  caregiverCertifications,
  caregiverLanguages,
  caregiverLocations,
} from './schema'

const client = postgres(process.env.DATABASE_URL!)
const db = drizzle(client)

// Must match CARE_TYPES keys in lib/constants.ts
const VALID_CARE_TYPES = ['personal-care', 'companionship', 'dementia-care', 'mobility-assistance', 'post-hospital-recovery'] as const

const CAREGIVERS: {
  name: string
  headline: string
  hourlyMin: number
  hourlyMax: number
  experience: string
  careTypes: string[]
  certifications: string[]
  languages: string[]
  city: string
  state: string
  zip: string
  address1: string
}[] = [
  {
    name: 'Margaret Collins',
    headline: 'Compassionate elder care specialist with 10+ years experience',
    hourlyMin: 22, hourlyMax: 30,
    experience: '10+ years',
    careTypes: ['personal-care', 'companionship'],
    certifications: ['CPR/AED', 'CNA'],
    languages: ['English'],
    city: 'Los Angeles', state: 'California', zip: '90026', address1: '1420 Sunset Blvd',
  },
  {
    name: 'James Rivera',
    headline: 'Certified nursing assistant specializing in post-hospital recovery',
    hourlyMin: 25, hourlyMax: 35,
    experience: '5-10 years',
    careTypes: ['post-hospital-recovery', 'personal-care'],
    certifications: ['CNA', 'First Aid', 'CPR/AED'],
    languages: ['English', 'Spanish'],
    city: 'Houston', state: 'Texas', zip: '77006', address1: '834 Westheimer Rd',
  },
  {
    name: 'Linda Chen',
    headline: 'Dementia care expert with gentle, patient approach',
    hourlyMin: 28, hourlyMax: 38,
    experience: '10+ years',
    careTypes: ['dementia-care', 'personal-care'],
    certifications: ['Dementia Care Specialist', 'CPR/AED'],
    languages: ['English', 'Mandarin'],
    city: 'San Francisco', state: 'California', zip: '94103', address1: '290 Valencia St',
  },
  {
    name: 'Robert Thompson',
    headline: 'Mobility assistance professional focused on independence',
    hourlyMin: 20, hourlyMax: 28,
    experience: '3-5 years',
    careTypes: ['mobility-assistance', 'personal-care'],
    certifications: ['First Aid', 'HHA'],
    languages: ['English'],
    city: 'Phoenix', state: 'Arizona', zip: '85007', address1: '1502 N 7th Ave',
  },
  {
    name: 'Maria Santos',
    headline: 'Home health aide with warm, family-centered care',
    hourlyMin: 18, hourlyMax: 25,
    experience: '5-10 years',
    careTypes: ['personal-care', 'companionship'],
    certifications: ['HHA', 'CPR/AED'],
    languages: ['English', 'Spanish', 'Tagalog'],
    city: 'Miami', state: 'Florida', zip: '33130', address1: '640 SW 8th St',
  },
  {
    name: 'David Kim',
    headline: 'Experienced caregiver specializing in Alzheimer\'s and dementia',
    hourlyMin: 30, hourlyMax: 42,
    experience: '10+ years',
    careTypes: ['dementia-care', 'companionship'],
    certifications: ['Dementia Care Specialist', 'CNA', 'CPR/AED'],
    languages: ['English', 'Mandarin'],
    city: 'Seattle', state: 'Washington', zip: '98102', address1: '412 Broadway E',
  },
  {
    name: 'Patricia Moore',
    headline: 'Caring and dependable personal care assistant',
    hourlyMin: 17, hourlyMax: 22,
    experience: '1-2 years',
    careTypes: ['personal-care', 'companionship'],
    certifications: ['First Aid', 'CPR/AED'],
    languages: ['English'],
    city: 'Chicago', state: 'Illinois', zip: '60614', address1: '2200 N Clark St',
  },
  {
    name: 'Carlos Mendez',
    headline: 'Bilingual caregiver with post-hospital and mobility care expertise',
    hourlyMin: 24, hourlyMax: 33,
    experience: '5-10 years',
    careTypes: ['post-hospital-recovery', 'mobility-assistance'],
    certifications: ['CNA', 'First Aid'],
    languages: ['English', 'Spanish'],
    city: 'San Antonio', state: 'Texas', zip: '78201', address1: '789 Fredericksburg Rd',
  },
  {
    name: 'Susan Walker',
    headline: 'Mobility and personal care specialist empowering independent living',
    hourlyMin: 21, hourlyMax: 29,
    experience: '3-5 years',
    careTypes: ['mobility-assistance', 'personal-care', 'companionship'],
    certifications: ['HHA', 'CPR/AED', 'First Aid'],
    languages: ['English', 'French'],
    city: 'New Orleans', state: 'Louisiana', zip: '70115', address1: '3310 Magazine St',
  },
  {
    name: 'Michael Johnson',
    headline: 'Patient and skilled personal care specialist',
    hourlyMin: 23, hourlyMax: 31,
    experience: '5-10 years',
    careTypes: ['personal-care', 'mobility-assistance'],
    certifications: ['CNA', 'CPR/AED'],
    languages: ['English'],
    city: 'Denver', state: 'Colorado', zip: '80202', address1: '1500 Blake St',
  },
  {
    name: 'Angela Reyes',
    headline: 'Compassionate companion for seniors and those needing mobility support',
    hourlyMin: 19, hourlyMax: 26,
    experience: '3-5 years',
    careTypes: ['companionship', 'mobility-assistance'],
    certifications: ['First Aid', 'CPR/AED'],
    languages: ['English', 'Spanish', 'Tagalog'],
    city: 'Las Vegas', state: 'Nevada', zip: '89109', address1: '2110 S Paradise Rd',
  },
  {
    name: 'Thomas Brown',
    headline: 'Post-hospital recovery specialist with clinical background',
    hourlyMin: 32, hourlyMax: 45,
    experience: '10+ years',
    careTypes: ['post-hospital-recovery', 'personal-care'],
    certifications: ['CNA', 'CPR/AED', 'First Aid', 'Dementia Care Specialist'],
    languages: ['English'],
    city: 'Boston', state: 'Massachusetts', zip: '02215', address1: '88 Brookline Ave',
  },
  {
    name: 'Grace Nakamura',
    headline: 'Gentle dementia care with strong family communication',
    hourlyMin: 26, hourlyMax: 36,
    experience: '5-10 years',
    careTypes: ['dementia-care', 'companionship'],
    certifications: ['Dementia Care Specialist', 'HHA'],
    languages: ['English', 'Mandarin'],
    city: 'Portland', state: 'Oregon', zip: '97210', address1: '405 NW 23rd Ave',
  },
  {
    name: 'Kevin Williams',
    headline: 'Reliable home health aide with flexible scheduling',
    hourlyMin: 16, hourlyMax: 21,
    experience: '1-2 years',
    careTypes: ['personal-care', 'companionship'],
    certifications: ['HHA', 'First Aid'],
    languages: ['English'],
    city: 'Atlanta', state: 'Georgia', zip: '30308', address1: '620 Peachtree St NE',
  },
  {
    name: 'Isabelle Dupont',
    headline: 'Multilingual caregiver with European personal care training',
    hourlyMin: 27, hourlyMax: 37,
    experience: '5-10 years',
    careTypes: ['personal-care', 'companionship'],
    certifications: ['CNA', 'CPR/AED', 'First Aid'],
    languages: ['English', 'French', 'Spanish'],
    city: 'New York', state: 'New York', zip: '10023', address1: '241 W 72nd St',
  },
  {
    name: 'Samuel Okafor',
    headline: 'Mobility and personal care advocate with 10 years in community care',
    hourlyMin: 22, hourlyMax: 30,
    experience: '10+ years',
    careTypes: ['mobility-assistance', 'personal-care', 'companionship'],
    certifications: ['HHA', 'CPR/AED', 'First Aid'],
    languages: ['English'],
    city: 'Philadelphia', state: 'Pennsylvania', zip: '19130', address1: '1501 Spring Garden St',
  },
  {
    name: 'Dorothy Harris',
    headline: 'Warm and experienced companion and personal care aide',
    hourlyMin: 20, hourlyMax: 27,
    experience: '3-5 years',
    careTypes: ['companionship', 'personal-care'],
    certifications: ['First Aid', 'CPR/AED'],
    languages: ['English'],
    city: 'Nashville', state: 'Tennessee', zip: '37209', address1: '2100 Charlotte Ave',
  },
  {
    name: 'Raj Patel',
    headline: 'Holistic caregiver with focus on wellness and dignity',
    hourlyMin: 24, hourlyMax: 34,
    experience: '5-10 years',
    careTypes: ['dementia-care', 'personal-care'],
    certifications: ['CNA', 'Dementia Care Specialist', 'CPR/AED'],
    languages: ['English'],
    city: 'Austin', state: 'Texas', zip: '78704', address1: '901 S Congress Ave',
  },
  {
    name: 'Nora Fitzgerald',
    headline: 'Post-hospital and companion care specialist',
    hourlyMin: 30, hourlyMax: 40,
    experience: '10+ years',
    careTypes: ['post-hospital-recovery', 'companionship'],
    certifications: ['CNA', 'CPR/AED', 'First Aid'],
    languages: ['English', 'French'],
    city: 'Minneapolis', state: 'Minnesota', zip: '55401', address1: '730 N Washington Ave',
  },
  {
    name: 'Elena Vasquez',
    headline: 'Personal care aide dedicated to comfort and quality of life',
    hourlyMin: 18, hourlyMax: 24,
    experience: '1-2 years',
    careTypes: ['personal-care', 'mobility-assistance'],
    certifications: ['HHA', 'First Aid'],
    languages: ['English', 'Spanish'],
    city: 'Albuquerque', state: 'New Mexico', zip: '87102', address1: '400 Gold Ave SW',
  },
]

async function seed() {
  console.log('Seeding 20 caregivers...')

  for (const cg of CAREGIVERS) {
    const email = `${cg.name.toLowerCase().replace(/\s+/g, '.')}@example.com`

    const [user] = await db
      .insert(users)
      .values({ email, name: cg.name, role: 'caregiver' })
      .onConflictDoUpdate({ target: users.email, set: { name: cg.name, role: 'caregiver' } })
      .returning({ id: users.id })

    const [profile] = await db
      .insert(caregiverProfiles)
      .values({
        userId: user.id,
        headline: cg.headline,
        about: `${cg.name} is a ${cg.experience} caregiver focused on providing excellent care.`,
        hourlyMin: String(cg.hourlyMin),
        hourlyMax: String(cg.hourlyMax),
        experience: cg.experience,
        status: 'active',
        completedStep: 5,
      })
      .onConflictDoUpdate({
        target: caregiverProfiles.userId,
        set: { headline: cg.headline, status: 'active', hourlyMin: String(cg.hourlyMin), hourlyMax: String(cg.hourlyMax) },
      })
      .returning({ id: caregiverProfiles.id })

    // Clear old care types so re-seeding stays clean
    await db.delete(caregiverCareTypes).where(
      (await import('drizzle-orm')).eq(caregiverCareTypes.caregiverId, profile.id)
    )

    for (const careType of cg.careTypes) {
      await db
        .insert(caregiverCareTypes)
        .values({ caregiverId: profile.id, careType })
        .onConflictDoNothing()
    }

    for (const certification of cg.certifications) {
      await db
        .insert(caregiverCertifications)
        .values({ caregiverId: profile.id, certification })
        .onConflictDoNothing()
    }

    for (const language of cg.languages) {
      await db
        .insert(caregiverLanguages)
        .values({ caregiverId: profile.id, language })
        .onConflictDoNothing()
    }

    await db
      .insert(caregiverLocations)
      .values({ caregiverId: profile.id, address1: cg.address1, city: cg.city, state: cg.state })
      .onConflictDoUpdate({
        target: caregiverLocations.caregiverId,
        set: { address1: cg.address1, city: cg.city, state: cg.state },
      })

    console.log(`  ✓ ${cg.name} (${cg.city}, ${cg.state})`)
  }

  console.log('Done.')
  await client.end()
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
