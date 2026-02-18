import type { ZoneType, DomainStatus } from './api/assessments';

export const domainTitles: Record<string, string> = {
  grossMotor: 'Gross Motor',
  fineMotor: 'Fine Motor',
  speechLanguage: 'Speech & Language',
  socialEmotional: 'Social-Emotional',
  cognitiveLearning: 'Cognitive/Learning',
  adaptiveSelfCare: 'Adaptive/Self-Care',
  sensoryProcessing: 'Sensory Processing',
  visionHearing: 'Vision & Hearing',
};

export const domainIcons: Record<string, string> = {
  grossMotor: '🏃',
  fineMotor: '✋',
  speechLanguage: '🗣',
  socialEmotional: '🤝',
  cognitiveLearning: '🧠',
  adaptiveSelfCare: '🧹',
  sensoryProcessing: '🌀',
  visionHearing: '👁',
};

const domainNameToKey: Record<string, string> = {
  'gross motor': 'grossMotor',
  'fine motor': 'fineMotor',
  'speech & language': 'speechLanguage',
  'speech and language': 'speechLanguage',
  'social-emotional': 'socialEmotional',
  'social emotional': 'socialEmotional',
  'cognitive/learning': 'cognitiveLearning',
  'cognitive': 'cognitiveLearning',
  'adaptive/self-care': 'adaptiveSelfCare',
  'adaptive self-care': 'adaptiveSelfCare',
  'self-care': 'adaptiveSelfCare',
  'sensory processing': 'sensoryProcessing',
  'sensory': 'sensoryProcessing',
  'vision & hearing': 'visionHearing',
  'vision and hearing': 'visionHearing',
};

/** Resolve a domain ID or human-readable name to the canonical camelCase key */
export function resolveDomainKey(domainId?: string, domainName?: string): string {
  if (domainId && domainTitles[domainId]) return domainId;
  if (domainName && domainTitles[domainName]) return domainName;
  const normalized = (domainName || domainId || '').toLowerCase().trim();
  return domainNameToKey[normalized] || domainId || domainName || '';
}

export const zoneColors: Record<ZoneType, { bg: string; text: string; border: string; progress: string }> = {
  green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', progress: 'bg-green-500' },
  yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', progress: 'bg-yellow-500' },
  red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', progress: 'bg-red-500' },
};

export function calculateZone(riskIndex: number): ZoneType {
  if (riskIndex <= 0.29) return 'green';
  if (riskIndex <= 0.45) return 'yellow';
  return 'red';
}

export function statusToZone(status: DomainStatus): ZoneType {
  return status.toLowerCase() as ZoneType;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function calculateAge(dob: string | Date): { years: number; months: number } {
  const birth = new Date(dob);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (months < 0) {
    years--;
    months += 12;
  }
  return { years, months };
}

export function formatAge(dob: string | Date): string {
  const { years, months } = calculateAge(dob);
  if (years === 0) return `${months} month${months !== 1 ? 's' : ''}`;
  if (months === 0) return `${years} year${years !== 1 ? 's' : ''}`;
  return `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`;
}

export function getAgeGroup(dob: string | Date): string | null {
  const birth = new Date(dob);
  const now = new Date();
  const ageMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());

  if (ageMonths >= 12 && ageMonths <= 15) return '12-15-months';
  if (ageMonths >= 16 && ageMonths <= 24) return '16-24-months';
  if (ageMonths >= 25 && ageMonths <= 36) return '24-36-months';
  if (ageMonths >= 37 && ageMonths <= 48) return '3-4-years';
  if (ageMonths >= 49 && ageMonths <= 60) return '4-5-years';
  if (ageMonths >= 61 && ageMonths <= 72) return '5-6-years';
  if (ageMonths >= 73 && ageMonths <= 96) return '6-8-years';
  if (ageMonths >= 97 && ageMonths <= 120) return '8-10-years';
  return null;
}

export function formatAgeGroup(ageGroup: string | undefined | null): string {
  if (!ageGroup) return 'Unknown';
  return ageGroup
    .replace(/-/g, ' ')
    .replace(/(\d+)\s(\d+)\s(\w+)/, '$1-$2 $3')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getAnswerLabel(answer: string): string {
  switch (answer) {
    case 'YES': return 'Yes';
    case 'SOMETIMES': return 'Sometimes';
    case 'NOT_SURE': return 'Not Sure';
    case 'NO': return 'No';
    default: return answer;
  }
}

export function getAnswerColor(answer: string): string {
  switch (answer) {
    case 'YES': return 'text-green-600';
    case 'SOMETIMES': return 'text-yellow-600';
    case 'NOT_SURE': return 'text-orange-500';
    case 'NO': return 'text-red-600';
    default: return 'text-gray-600';
  }
}
