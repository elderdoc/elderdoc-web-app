export const CARE_TYPES = [
  { key: 'personal-care',          label: 'Personal Care' },
  { key: 'companionship',          label: 'Companionship' },
  { key: 'dementia-care',          label: 'Dementia Care' },
  { key: 'mobility-assistance',    label: 'Mobility Assistance' },
  { key: 'post-hospital-recovery', label: 'Post-Hospital Recovery' },
] as const

export type CareTypeKey = typeof CARE_TYPES[number]['key']

export const CERTIFICATIONS = [
  { key: 'cna',            label: 'Certified Nurse Assistant' },
  { key: 'hha',            label: 'Home Health Aide' },
  { key: 'medication-aide',label: 'Medication Aide' },
  { key: 'medical-asst',   label: 'Medical Assistant' },
  { key: 'lvn',            label: 'Licensed Vocational Nurse' },
  { key: 'rn',             label: 'Registered Nurse' },
  { key: 'retired-nurse',  label: 'Retired Nurse' },
] as const

export const LANGUAGES = [
  { key: 'english',    label: 'English' },
  { key: 'spanish',    label: 'Spanish' },
  { key: 'french',     label: 'French' },
  { key: 'mandarin',   label: 'Mandarin' },
  { key: 'cantonese',  label: 'Cantonese' },
  { key: 'tagalog',    label: 'Tagalog' },
  { key: 'vietnamese', label: 'Vietnamese' },
  { key: 'korean',     label: 'Korean' },
  { key: 'arabic',     label: 'Arabic' },
  { key: 'portuguese', label: 'Portuguese' },
  { key: 'russian',    label: 'Russian' },
  { key: 'hindi',      label: 'Hindi' },
] as const

export const EDUCATION_OPTIONS = [
  { key: 'high-school', label: 'High school diploma / GED' },
  { key: 'some-college',label: 'Some college' },
  { key: 'associates',  label: "Associate's degree" },
  { key: 'bachelors',   label: "Bachelor's degree" },
  { key: 'masters-plus',label: "Master's degree or higher" },
] as const

export const WORK_TYPES = [
  { key: 'full-time', label: 'Full-time' },
  { key: 'part-time', label: 'Part-time' },
  { key: 'flexible',  label: 'Flexible' },
  { key: 'live-in',   label: 'Live-in' },
] as const

export const DAYS_OF_WEEK = [
  { key: 'monday',    label: 'Monday' },
  { key: 'tuesday',   label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday',  label: 'Thursday' },
  { key: 'friday',    label: 'Friday' },
  { key: 'saturday',  label: 'Saturday' },
  { key: 'sunday',    label: 'Sunday' },
] as const

export const SHIFTS = [
  { key: 'morning',   label: 'Morning',   time: '6am–12pm' },
  { key: 'afternoon', label: 'Afternoon', time: '12pm–6pm' },
  { key: 'evening',   label: 'Evening',   time: '6pm–10pm' },
  { key: 'overnight', label: 'Overnight', time: '10pm–6am' },
] as const

export const START_AVAILABILITY = [
  { key: 'immediately',    label: 'Immediately' },
  { key: 'within-a-week',  label: 'Within a week' },
  { key: 'within-a-month', label: 'Within a month' },
] as const

export const TRAVEL_DISTANCES = [
  { key: '5',    label: '5 miles',  miles: 5 },
  { key: '10',   label: '10 miles', miles: 10 },
  { key: '15',   label: '15 miles', miles: 15 },
  { key: '20',   label: '20 miles', miles: 20 },
  { key: '25',   label: '25 miles', miles: 25 },
  { key: '30',   label: '30+ miles',miles: 30 },
] as const

export const RELATIONSHIPS = [
  { key: 'myself',           label: 'Myself' },
  { key: 'parent',           label: 'Parent' },
  { key: 'spouse',           label: 'Spouse' },
  { key: 'grandparent',      label: 'Grandparent' },
  { key: 'sibling',          label: 'Sibling' },
  { key: 'other-family',     label: 'Other family member' },
] as const

export const CONDITIONS = [
  { key: 'alzheimers',         label: "Alzheimer's" },
  { key: 'dementia',           label: 'Dementia' },
  { key: 'parkinsons',         label: "Parkinson's" },
  { key: 'diabetes',           label: 'Diabetes' },
  { key: 'heart-disease',      label: 'Heart disease' },
  { key: 'stroke',             label: 'Stroke' },
  { key: 'copd',               label: 'COPD' },
  { key: 'arthritis',          label: 'Arthritis' },
  { key: 'depression',         label: 'Depression' },
  { key: 'anxiety',            label: 'Anxiety' },
  { key: 'vision-impairment',  label: 'Vision impairment' },
  { key: 'hearing-impairment', label: 'Hearing impairment' },
  { key: 'other',              label: 'Other' },
] as const

export const CLIENT_STATUS_GROUPS = [
  {
    label: 'Living Situation',
    items: [
      { key: 'livesAlone',      label: 'Lives alone' },
      { key: 'livesWith',       label: 'Lives with other' },
      { key: 'aloneDuringDay',  label: 'Alone during the day' },
    ],
  },
  {
    label: 'Mobility / Activity',
    items: [
      { key: 'bedBound',        label: 'Bed bound' },
      { key: 'upAsTolerated',   label: 'Up as tolerated' },
    ],
  },
  {
    label: 'Communication & Senses',
    items: [
      { key: 'speechProblems',    label: 'Speech problems' },
      { key: 'glassesOrContacts', label: 'Glasses or contacts' },
      { key: 'visionProblem',     label: 'Vision problem' },
      { key: 'hardOfHearing',     label: 'Hard of hearing / hearing aid' },
    ],
  },
  {
    label: 'Physical',
    items: [
      { key: 'amputee',         label: 'Amputee (specify below if checked)' },
      { key: 'denturesUpper',   label: 'Dentures — upper' },
      { key: 'denturesLower',   label: 'Dentures — lower' },
      { key: 'denturesPartial', label: 'Dentures — partial' },
    ],
  },
  {
    label: 'Cognitive',
    items: [
      { key: 'orientedAlert', label: 'Oriented / alert' },
      { key: 'forgetful',     label: 'Forgetful' },
      { key: 'confused',      label: 'Confused' },
    ],
  },
  {
    label: 'Medical Equipment',
    items: [
      { key: 'urinaryCath', label: 'Urinary cath' },
      { key: 'feedingTube', label: 'Feeding tube' },
    ],
  },
  {
    label: 'Diet',
    items: [
      { key: 'diabetic', label: 'Diabetic' },
    ],
  },
] as const

export const CARE_PLAN_SECTIONS = [
  {
    key: 'activityMobilitySafety',
    label: 'Activity, Mobility & Safety',
    items: [
      { key: 'companionship',  label: 'Companionship' },
      { key: 'rom',            label: 'ROM (Range of Motion)' },
      { key: 'repositioning',  label: 'Repositioning' },
      { key: 'transfers',      label: 'Transfers' },
      { key: 'walkerCane',     label: 'Walker / Cane' },
      { key: 'transportation', label: 'Transportation' },
      { key: 'escort',         label: 'Escort' },
      { key: 'wheelchair',     label: 'Wheelchair' },
    ],
  },
  {
    key: 'hygieneElimination',
    label: 'Hygiene & Elimination',
    items: [
      { key: 'bathShower',        label: 'Bath / Shower' },
      { key: 'bedBath',           label: 'Bed Bath' },
      { key: 'oralHygiene',       label: 'Oral Hygiene' },
      { key: 'hairCare',          label: 'Hair Care' },
      { key: 'shaving',           label: 'Shaving' },
      { key: 'nailCare',          label: 'Nail Care / File Only' },
      { key: 'dressing',          label: 'Dressing' },
      { key: 'toiletBsc',         label: 'Toilet / BSC' },
      { key: 'diaperIncontinent', label: 'Diaper / Incontinent' },
      { key: 'hygieneOther',      label: 'Other' },
    ],
  },
  {
    key: 'homeManagement',
    label: 'Home Management',
    items: [
      { key: 'vacuumSweep',     label: 'Vacuum / Sweep' },
      { key: 'mopFloors',       label: 'Mop Floors' },
      { key: 'dusting',         label: 'Dusting' },
      { key: 'cleanKitchen',    label: 'Clean Kitchen' },
      { key: 'emptyGarbage',    label: 'Empty Garbage' },
      { key: 'washDishes',      label: 'Wash Dishes' },
      { key: 'cleanBedroom',    label: 'Clean Bedroom' },
      { key: 'makeBed',         label: 'Make Bed' },
      { key: 'changeLinens',    label: 'Change Linens' },
      { key: 'laundry',         label: 'Laundry' },
      { key: 'cleanBathroom',   label: 'Clean Bathroom' },
      { key: 'errandsShopping', label: 'Errands / Shopping' },
    ],
  },
  {
    key: 'hydrationNutrition',
    label: 'Hydration & Nutrition',
    items: [
      { key: 'assistFeeding',   label: 'Assist w/ Feeding' },
      { key: 'encourageEating', label: 'Encouraged Eating' },
      { key: 'encourageFluids', label: 'Encouraged Fluids' },
      { key: 'preparedMeals',   label: 'Prepared Meals' },
      { key: 'prepBreakfast',   label: 'Prep Breakfast' },
      { key: 'prepLunch',       label: 'Prep Lunch' },
      { key: 'prepDinner',      label: 'Prep Dinner' },
      { key: 'prepSnacks',      label: 'Prep Snacks' },
      { key: 'npo',             label: 'NPO (Nothing by Mouth)' },
    ],
  },
  {
    key: 'medicationReminders',
    label: 'Medication Reminders',
    items: [
      { key: 'medMorning',   label: 'Morning' },
      { key: 'medAfternoon', label: 'Afternoon' },
      { key: 'medEvening',   label: 'Evening' },
      { key: 'medBedtime',   label: 'Bed Time' },
      { key: 'medSnackTime', label: 'Snack Time' },
    ],
  },
] as const

export const INFECTION_CONTROL_ITEMS = [
  { key: 'gloves',        label: 'Gloves' },
  { key: 'handWashing',   label: 'Hand washing' },
  { key: 'wasteDisposal', label: 'Waste disposal' },
] as const

export const SAFETY_MEASURE_ITEMS = [
  { key: 'clearPathways', label: 'Clear pathways' },
  { key: 'electricCords', label: 'Electric cords' },
  { key: 'pets',          label: 'Pets' },
] as const

export const MOBILITY_LEVELS = [
  { key: 'independent',          label: 'Independent' },
  { key: 'minimal-assistance',   label: 'Minimal assistance' },
  { key: 'moderate-assistance',  label: 'Moderate assistance' },
  { key: 'full-assistance',      label: 'Full assistance' },
] as const

export const GENDER_OPTIONS = [
  { key: 'male',              label: 'Male' },
  { key: 'female',            label: 'Female' },
  { key: 'non-binary',        label: 'Non-binary' },
  { key: 'prefer-not-to-say', label: 'Prefer not to say' },
] as const

export const GENDER_PREFERENCES = [
  { key: 'male',         label: 'Male' },
  { key: 'female',       label: 'Female' },
  { key: 'no-preference',label: 'No preference' },
] as const

export const CARE_FREQUENCIES = [
  { key: 'one-time',  label: 'One-time visit' },
  { key: 'weekly',    label: 'Weekly' },
  { key: 'bi-weekly', label: 'Bi-weekly' },
  { key: 'daily',     label: 'Daily' },
  { key: 'as-needed', label: 'As needed' },
] as const

export const CARE_DURATIONS = [
  { key: '2',  label: '2 hours',  hours: 2 },
  { key: '4',  label: '4 hours',  hours: 4 },
  { key: '6',  label: '6 hours',  hours: 6 },
  { key: '8',  label: '8 hours',  hours: 8 },
  { key: '12', label: '12 hours', hours: 12 },
] as const

export const BUDGET_TYPES = [
  { key: 'hourly',  label: 'Hourly rate' },
  { key: 'weekly',  label: 'Fixed weekly' },
] as const

export const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
  'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
  'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
  'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
  'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming',
] as const

export const NOTIFICATION_TYPES = [
  'offer_received',
  'offer_accepted',
  'offer_declined',
  'match_found',
  'job_started',
  'shift_scheduled',
  'message_received',
] as const

export type NotificationType = typeof NOTIFICATION_TYPES[number]

export const HEADLINE_TEMPLATES = [
  'Compassionate caregiver dedicated to improving quality of life for seniors.',
  'Experienced care professional bringing dignity, warmth, and expert support.',
  "Trusted companion and care expert committed to your loved one's well-being.",
] as const
