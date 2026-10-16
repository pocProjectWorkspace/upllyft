// Display helpers for the Clinic Portal.

/** Per-clinic colour, assigned by link order so it stays the same on every tab. */
export const CLINIC_COLORS = [
  { ink: '#0B7E6B', bg: '#E4F4EF' },
  { ink: '#3163D4', bg: '#E7EEFD' },
  { ink: '#8A4FCB', bg: '#F3E9FB' },
  { ink: '#C2410C', bg: '#FFEDD5' },
  { ink: '#BE185D', bg: '#FCE7F3' },
];

export function clinicColor(index: number | undefined) {
  return CLINIC_COLORS[(index ?? 0) % CLINIC_COLORS.length];
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WDL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const mon = (d: Date) => MON[d.getMonth()];
export const weekday = (d: Date) => WD[d.getDay()];

export function time(d: Date) {
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export function dayLong(d: Date) {
  return `${WDL[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
}

export function dayShort(d: Date) {
  return `${WD[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
}

export function dateMed(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
}

function dayIndex(d: Date) {
  return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86_400_000);
}

export function relativeDay(d: Date, now = new Date()) {
  const n = dayIndex(d) - dayIndex(now);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  return n > 0 ? `In ${n} days` : `${-n} days ago`;
}

export function sharedAgo(iso: string | null, now = new Date()) {
  if (!iso) return '';
  const d = new Date(iso);
  const n = dayIndex(now) - dayIndex(d);
  if (n <= 0) return 'shared today';
  if (n === 1) return 'shared yesterday';
  if (n < 7) return `shared ${n} days ago`;
  return `shared ${d.getDate()} ${MON[d.getMonth()]}`;
}

export function ageLabel(dob: string | null | undefined) {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (months < 24) return `Age ${Math.max(months, 0)} months`;
  const years = Math.floor(months / 12);
  return `Age ${years} year${years === 1 ? '' : 's'}`;
}

/** "Speech at Sunrise CDC and OT at Bloom OT" */
export function joinAnd(parts: string[]) {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

export const TYPE_STYLE: Record<string, string> = {
  Session: 'text-[#0B7E6B] bg-[#E4F4EF]',
  Consultation: 'text-[#8A4FCB] bg-[#F3E9FB]',
  Assessment: 'text-[#D6336C] bg-[#FDE7EE]',
};

export const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  rescheduled: { label: 'Rescheduled', cls: 'text-[#3163D4] bg-[#E7EEFD]' },
  cancelled: { label: 'Cancelled', cls: 'text-[#B4451E] bg-[#FBE9E4]' },
  attended: { label: 'Attended', cls: 'text-gray-600 bg-gray-100' },
  missed: { label: 'Missed', cls: 'text-amber-800 bg-amber-50' },
};

export const CONSENT_LABELS: Array<[key: 'assessment' | 'therapy' | 'reports' | 'tele' | 'media' | 'ai', label: string]> = [
  ['assessment', 'Assessment'],
  ['therapy', 'Therapy sessions'],
  ['reports', 'Share reports with me'],
  ['tele', 'Online / video sessions'],
  ['media', 'Photos & video for progress'],
  ['ai', 'AI-assisted note drafting'],
];
