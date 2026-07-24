// Shared clinical-department taxonomy.
//
// Single source of truth for the department → specializations / services / licensing
// map used by BOTH the org admin's Add Therapist wizard (Basic Info → Credentials → Fees)
// and the therapist's own Hub (Session Types & Pricing). Per the Care/Org handoff docs,
// these two surfaces MUST read the same map — never duplicate it per app.

export type DepartmentKey =
  | 'psychology'
  | 'speech'
  | 'ot'
  | 'aba'
  | 'physio'
  | 'specialed';

export interface DepartmentService {
  key: string;
  label: string;
}

export interface Department {
  label: string;
  /** Noun used to build the India RCI registration label, e.g. "RCI registration number (Speech-Language Pathology)". */
  licenseNoun: string;
  specializations: string[];
  services: DepartmentService[];
}

export const DEPARTMENTS: Record<DepartmentKey, Department> = {
  psychology: {
    label: 'Clinical Psychology / Counseling',
    licenseNoun: 'Clinical / Counselling Psychology',
    specializations: [
      'Anxiety',
      'Depression',
      'Couples Therapy',
      'Trauma & PTSD',
      'CBT',
      'Child & Adolescent',
      'Addiction',
      'Grief Counseling',
    ],
    services: [
      { key: 'consultation', label: 'Initial Consultation' },
      { key: 'assessment', label: 'Psychological Assessment' },
      { key: 'individual', label: 'Individual Therapy' },
      { key: 'child', label: 'Child & Adolescent Therapy' },
      { key: 'couples', label: 'Couples Therapy' },
      { key: 'family', label: 'Family Therapy' },
      { key: 'group', label: 'Group Therapy' },
    ],
  },
  speech: {
    label: 'Speech & Language Therapy',
    licenseNoun: 'Speech-Language Pathology',
    specializations: [
      'Articulation Disorders',
      'Stuttering & Fluency',
      'Language Delay',
      'Voice Disorders',
      'AAC & Assistive Tech',
      'Dysphagia (Swallowing)',
    ],
    services: [
      { key: 'assessment', label: 'Initial Assessment' },
      { key: 'languageAssessment', label: 'Language Assessment' },
      { key: 'individual', label: 'Individual Session' },
      { key: 'group', label: 'Group Session' },
      { key: 'voiceTherapy', label: 'Voice Therapy' },
      { key: 'fluencyTherapy', label: 'Fluency Therapy' },
      { key: 'feedingTherapy', label: 'Feeding & Swallowing Therapy' },
      { key: 'parentTraining', label: 'Parent Training' },
    ],
  },
  ot: {
    label: 'Occupational Therapy',
    licenseNoun: 'Occupational Therapy',
    specializations: [
      'Sensory Integration',
      'Fine Motor Skills',
      'ADL Training',
      'Handwriting Skills',
      'Autism Support',
      'Developmental Delay',
    ],
    services: [
      { key: 'assessment', label: 'Initial Assessment' },
      { key: 'individual', label: 'Individual Session' },
      { key: 'group', label: 'Group Session' },
      { key: 'sensoryIntegration', label: 'Sensory Integration Therapy' },
      { key: 'handwriting', label: 'Handwriting Skills Session' },
      { key: 'adlTraining', label: 'ADL Training Session' },
      { key: 'homeProgram', label: 'Home Program Review' },
    ],
  },
  aba: {
    label: 'Behavioural Therapy (ABA)',
    licenseNoun: 'Applied Behaviour Analysis',
    specializations: [
      'Applied Behaviour Analysis',
      'Functional Behaviour Assessment',
      'Social Skills Training',
      'Verbal Behaviour Training',
      'Parent Training',
      'Autism Spectrum Disorder',
    ],
    services: [
      { key: 'assessment', label: 'ABA Assessment' },
      { key: 'fba', label: 'Functional Behaviour Assessment' },
      { key: 'abaSession', label: '1:1 ABA Session' },
      { key: 'groupSession', label: 'Group ABA Session' },
      { key: 'socialSkills', label: 'Social Skills Group' },
      { key: 'parentCoaching', label: 'Parent Coaching' },
    ],
  },
  physio: {
    label: 'Physiotherapy',
    licenseNoun: 'Physiotherapy',
    specializations: [
      'Neuro Rehabilitation',
      'Orthopedic Rehab',
      'Pediatric Physiotherapy',
      'Sports Injury',
      'Post-Surgical Rehab',
      'Geriatric Care',
    ],
    services: [
      { key: 'assessment', label: 'Initial Assessment' },
      { key: 'individual', label: 'Individual Session' },
      { key: 'neuroRehab', label: 'Neuro Rehab Session' },
      { key: 'sportsRehab', label: 'Sports Rehab Session' },
      { key: 'groupExercise', label: 'Group Exercise Session' },
      { key: 'homeVisit', label: 'Home Visit' },
    ],
  },
  specialed: {
    label: 'Special Education',
    licenseNoun: 'Special Education',
    specializations: [
      'Learning Disabilities',
      'IEP Planning',
      'Autism Support',
      'ADHD Support',
      'Life Skills Training',
      'Sensory Processing',
    ],
    services: [
      { key: 'assessment', label: 'Initial Assessment' },
      { key: 'individual', label: 'Individual Session' },
      { key: 'group', label: 'Group Session' },
      { key: 'iepPlanning', label: 'IEP Planning Session' },
      { key: 'lifeSkills', label: 'Life Skills Training' },
      { key: 'parentConsultation', label: 'Parent Consultation' },
    ],
  },
};

export const DEPARTMENT_OPTIONS = (
  Object.keys(DEPARTMENTS) as DepartmentKey[]
).map((key) => ({ value: key, label: DEPARTMENTS[key].label }));

// Session durations. `standard` limits to 30/45/60; `extended` adds 90/120.
// The Add Therapist Fees step + therapist Hub Session Types must offer the same set.
export const DURATION_PRESETS = {
  standard: [30, 45, 60],
  extended: [30, 45, 60, 90, 120],
} as const;

export type DurationPreset = keyof typeof DURATION_PRESETS;

// India-specific credential fields shown when country === 'India'.
// ABA additionally shows a BCBA/RBT field (see wizard logic).
// UAE-specific fields shown when country === 'UAE'.
export const LICENSE_AUTHORITIES_UAE = [
  { value: 'DHA', label: 'DHA (Dubai)' },
  { value: 'MOHAP', label: 'MOHAP' },
  { value: 'DOH', label: 'DOH (Abu Dhabi)' },
] as const;
