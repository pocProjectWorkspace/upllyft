/**
 * Spreadsheet parsing and row validation for bulk onboarding (therapists, parent
 * invites). Pure — unit-tested in import-rows.spec.ts. Accepts CSV or Excel (first sheet).
 */
import * as XLSX from 'xlsx';
import { inferDepartment } from '../marketplace/matching/matching.util';

export const MAX_IMPORT_ROWS = 500;
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DEPARTMENTS = ['psychology', 'speech', 'ot', 'aba', 'physio', 'specialed'];

/** "Full Name", "full_name", "FULLNAME" → "fullname". */
export function headerKey(h: string): string {
  return String(h ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** First sheet of a CSV / XLSX buffer as rows keyed by normalised header. */
export function parseSheet(buffer: Buffer): Array<Record<string, string>> {
  const wb = XLSX.read(buffer, { type: 'buffer', raw: false, cellDates: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
  return rows
    .map((r) => {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(r)) out[headerKey(k)] = String(v ?? '').trim();
      return out;
    })
    .filter((r) => Object.values(r).some((v) => v !== ''));
}

/** "a; b, c" or "a|b" → ['a','b','c'] */
export function splitList(value: string | undefined): string[] {
  return (value ?? '')
    .split(/[;,|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function normalizeEmail(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

export interface RowResult<T> {
  row: number; // 1-based, as in the spreadsheet (header = row 1)
  ok: boolean;
  data?: T;
  errors: string[];
  /** What the row said, so a rejected row can still be recognised. */
  label: { name: string | null; email: string | null };
}

// ── therapists ────────────────────────────────────────────────────────────────

export interface TherapistInput {
  name: string;
  email: string;
  phone: string | null;
  title: string | null;
  department: string | null;
  specializations: string[];
  languages: string[];
  yearsExperience: number | null;
  country: string | null;
  city: string | null;
  licenceNumber: string | null;
  bio: string | null;
}

const COUNTRY_CODES: Record<string, string> = {
  in: 'IN', india: 'IN',
  ae: 'AE', uae: 'AE', 'unitedarabemirates': 'AE',
  sa: 'SA', ksa: 'SA', saudiarabia: 'SA',
};

/** Validate one therapist (from a form or a sheet row). Field names are header keys. */
export function validateTherapist(raw: Record<string, unknown>): { data?: TherapistInput; errors: string[] } {
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const v = raw[k];
      if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
    }
    return '';
  };
  const list = (...keys: string[]) => {
    for (const k of keys) {
      const v = raw[k];
      if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
      if (v !== undefined && String(v).trim() !== '') return splitList(String(v));
    }
    return [] as string[];
  };
  const errors: string[] = [];

  const name = get('name', 'fullname');
  const email = normalizeEmail(get('email', 'emailaddress'));
  if (!name) errors.push('Name is required.');
  else if (name.length > 120) errors.push('Name is too long.');
  if (!email) errors.push('Email is required.');
  else if (!EMAIL_RE.test(email)) errors.push(`"${email}" is not a valid email.`);

  const title = get('title', 'jobtitle', 'designation') || null;
  const specializations = list('specializations', 'specialisations', 'specialization', 'specialisation');
  let department = get('department', 'discipline').toLowerCase() || null;
  if (department && !DEPARTMENTS.includes(department)) {
    errors.push(`Department must be one of: ${DEPARTMENTS.join(', ')}.`);
    department = null;
  }
  department = department ?? inferDepartment(title, specializations);

  let yearsExperience: number | null = null;
  const years = get('yearsexperience', 'experience', 'yearsofexperience');
  if (years) {
    const n = Number(years);
    if (!Number.isInteger(n) || n < 0 || n > 60) errors.push('Years of experience must be a whole number from 0 to 60.');
    else yearsExperience = n;
  }

  let country: string | null = null;
  const c = get('country');
  if (c) {
    country = COUNTRY_CODES[headerKey(c)] ?? null;
    if (!country) errors.push('Country must be India, UAE or Saudi Arabia.');
  }

  const phone = get('phone', 'phonenumber', 'mobile') || null;
  if (phone && !/^[+()\d\s-]{6,20}$/.test(phone)) errors.push('Phone number looks invalid.');

  if (errors.length) return { errors };
  return {
    errors,
    data: {
      name,
      email,
      phone,
      title,
      department,
      specializations,
      languages: list('languages', 'language'),
      yearsExperience,
      country,
      city: get('city') || null,
      licenceNumber: get('licencenumber', 'licensenumber', 'licence', 'license', 'rcinumber') || null,
      bio: get('bio', 'about') || null,
    },
  };
}

// ── parent invitations ────────────────────────────────────────────────────────

export interface ParentInviteInput {
  email: string;
  name: string | null;
}

export function validateParentInvite(raw: Record<string, unknown>): { data?: ParentInviteInput; errors: string[] } {
  const email = normalizeEmail(String(raw.email ?? raw.emailaddress ?? ''));
  const name = String(raw.name ?? raw.fullname ?? raw.parentname ?? '').trim() || null;
  if (!email) return { errors: ['Email is required.'] };
  if (!EMAIL_RE.test(email)) return { errors: [`"${email}" is not a valid email.`] };
  if (name && name.length > 120) return { errors: ['Name is too long.'] };
  return { errors: [], data: { email, name } };
}

/** Validate every row; flags duplicate emails inside the same file. */
export function validateRows<T extends { email: string }>(
  rows: Array<Record<string, unknown>>,
  validate: (r: Record<string, unknown>) => { data?: T; errors: string[] },
): RowResult<T>[] {
  const seen = new Map<string, number>();
  return rows.map((r, i) => {
    const row = i + 2;
    const { data, errors } = validate(r);
    if (data) {
      const first = seen.get(data.email);
      if (first) errors.push(`Duplicate of row ${first} in this file.`);
      else seen.set(data.email, row);
    }
    const text = (...keys: string[]) => keys.map((k) => String(r[k] ?? '').trim()).find(Boolean)?.slice(0, 120) || null;
    const label = { name: text('name', 'fullname', 'parentname'), email: text('email', 'emailaddress') };
    return { row, ok: errors.length === 0, data: errors.length ? undefined : data, errors, label };
  });
}

// ── templates ─────────────────────────────────────────────────────────────────

export interface TemplateColumn {
  header: string;
  required: boolean;
  help: string;
  example: string;
}

/** The therapist import template. Headers must normalise to keys validateTherapist reads. */
export const THERAPIST_TEMPLATE: TemplateColumn[] = [
  { header: 'Name', required: true, help: 'Full name, up to 120 characters.', example: 'Dr. Priya Sharma' },
  { header: 'Email', required: true, help: 'Their sign-in email. One row per person; each email once per file.', example: 'priya.sharma@example.com' },
  { header: 'Phone', required: false, help: 'With country code. Digits, spaces, + ( ) - only.', example: '+971 50 123 4567' },
  { header: 'Title', required: false, help: 'Job title shown on their profile.', example: 'Speech-Language Pathologist' },
  { header: 'Department', required: false, help: `One of: ${DEPARTMENTS.join(', ')}. Left blank, it is worked out from the title.`, example: 'speech' },
  { header: 'Specializations', required: false, help: 'Separate several with a semicolon (;).', example: 'Autism; Late talkers; AAC' },
  { header: 'Languages', required: false, help: 'Separate several with a semicolon (;).', example: 'English; Hindi; Arabic' },
  { header: 'Years Experience', required: false, help: 'Whole number from 0 to 60.', example: '8' },
  { header: 'Country', required: false, help: 'India, UAE or Saudi Arabia.', example: 'UAE' },
  { header: 'City', required: false, help: 'City they practise in.', example: 'Dubai' },
  { header: 'Licence Number', required: false, help: 'Professional licence / registration number, if any.', example: 'DHA-12345' },
  { header: 'Bio', required: false, help: 'A short introduction for families.', example: 'Helps young children find their voice through play-based therapy.' },
];

/**
 * A blank import template: CSV (header only) or Excel with a "Therapists" sheet to fill
 * and a "How to fill" sheet. The sheet to fill comes first — the importer reads sheet 1.
 */
export function therapistTemplate(format: 'csv' | 'xlsx'): Buffer {
  const headers = THERAPIST_TEMPLATE.map((c) => c.header);
  const data = XLSX.utils.aoa_to_sheet([headers]);
  data['!cols'] = THERAPIST_TEMPLATE.map((c) => ({ wch: Math.max(14, Math.min(40, c.example.length + 2)) }));
  if (format === 'csv') return Buffer.from(XLSX.utils.sheet_to_csv(data) + '\n', 'utf8');

  const guide = XLSX.utils.aoa_to_sheet([
    ['Column', 'Required?', 'What to enter', 'Example'],
    ...THERAPIST_TEMPLATE.map((c) => [c.header, c.required ? 'Required' : 'Optional', c.help, c.example]),
    [],
    [`Fill one row per therapist on the "Therapists" sheet, keep the header row, and upload the file. Up to ${MAX_IMPORT_ROWS} rows.`],
    ['Each new therapist gets an email with a link to set their password. Existing Upllyft therapists are not changed.'],
  ]);
  guide['!cols'] = [{ wch: 18 }, { wch: 10 }, { wch: 70 }, { wch: 40 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, data, 'Therapists');
  XLSX.utils.book_append_sheet(wb, guide, 'How to fill');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
