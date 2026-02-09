export const DEVELOPMENTAL_DOMAINS = {
  MOTOR: {
    label: 'Motor Skills',
    description: 'Fine and gross motor development',
    subDomains: ['FINE_MOTOR', 'GROSS_MOTOR'],
  },
  LANGUAGE: {
    label: 'Language & Communication',
    description: 'Speech, language comprehension, and expressive communication',
    subDomains: ['RECEPTIVE_LANGUAGE', 'EXPRESSIVE_LANGUAGE', 'PRAGMATICS'],
  },
  SOCIAL: {
    label: 'Social Skills',
    description: 'Social interaction, emotional regulation, and relationships',
    subDomains: ['SOCIAL_INTERACTION', 'EMOTIONAL_REGULATION', 'PLAY_SKILLS'],
  },
  COGNITIVE: {
    label: 'Cognitive Skills',
    description: 'Problem-solving, memory, attention, and executive function',
    subDomains: ['ATTENTION', 'MEMORY', 'PROBLEM_SOLVING', 'EXECUTIVE_FUNCTION'],
  },
  SENSORY: {
    label: 'Sensory Processing',
    description: 'Sensory regulation and integration',
    subDomains: ['SENSORY_SEEKING', 'SENSORY_AVOIDING', 'SENSORY_REGULATION'],
  },
  ADAPTIVE: {
    label: 'Adaptive / Daily Living',
    description: 'Self-care, routines, and independence skills',
    subDomains: ['SELF_CARE', 'ROUTINES', 'SAFETY_AWARENESS'],
  },
} as const;

export type DevelopmentalDomain = keyof typeof DEVELOPMENTAL_DOMAINS;

export const VALID_DOMAINS = Object.keys(DEVELOPMENTAL_DOMAINS) as DevelopmentalDomain[];
