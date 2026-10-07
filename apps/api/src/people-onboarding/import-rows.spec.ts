import * as XLSX from 'xlsx';
import { headerKey, parseSheet, splitList, validateParentInvite, validateRows, validateTherapist } from './import-rows';

describe('parseSheet', () => {
  it('reads CSV with messy headers and skips blank lines', () => {
    const csv = 'Full Name,Email Address,Specializations\nAsha Rao,ASHA@Example.org,"Language Delay; AAC"\n,,\n';
    const rows = parseSheet(Buffer.from(csv));
    expect(rows).toEqual([{ fullname: 'Asha Rao', emailaddress: 'ASHA@Example.org', specializations: 'Language Delay; AAC' }]);
  });

  it('reads the first sheet of an Excel file', () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['name', 'email'], ['Ravi', 'ravi@x.com']]), 'Therapists');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    expect(parseSheet(buf)).toEqual([{ name: 'Ravi', email: 'ravi@x.com' }]);
  });
});

describe('helpers', () => {
  it('normalises headers and lists', () => {
    expect(headerKey('Years_Experience ')).toBe('yearsexperience');
    expect(splitList('a; b, c|d')).toEqual(['a', 'b', 'c', 'd']);
    expect(splitList(undefined)).toEqual([]);
  });
});

describe('validateTherapist', () => {
  it('accepts a full row and infers the department', () => {
    const { data, errors } = validateTherapist({
      name: 'Asha Rao',
      email: ' Asha@Example.org ',
      title: 'Speech-Language Pathologist',
      specializations: 'Language Delay; AAC',
      languages: 'English, Hindi',
      yearsexperience: '7',
      country: 'UAE',
      city: 'Dubai',
    });
    expect(errors).toEqual([]);
    expect(data).toMatchObject({
      email: 'asha@example.org',
      department: 'speech',
      specializations: ['Language Delay', 'AAC'],
      languages: ['English', 'Hindi'],
      yearsExperience: 7,
      country: 'AE',
    });
  });

  it('accepts arrays from the create form', () => {
    expect(validateTherapist({ name: 'A', email: 'a@b.co', specializations: ['ABA'], department: 'aba' }).data?.department).toBe('aba');
  });

  it('reports every problem in the row', () => {
    const { data, errors } = validateTherapist({ email: 'nope', department: 'magic', yearsexperience: 'ten', country: 'France', phone: 'call me' });
    expect(data).toBeUndefined();
    expect(errors).toEqual(
      expect.arrayContaining([
        'Name is required.',
        '"nope" is not a valid email.',
        expect.stringContaining('Department must be one of'),
        expect.stringContaining('Years of experience'),
        'Country must be India, UAE or Saudi Arabia.',
        'Phone number looks invalid.',
      ]),
    );
  });
});

describe('validateParentInvite + validateRows', () => {
  it('validates and flags duplicates within the file, with spreadsheet row numbers', () => {
    const out = validateRows(
      [{ email: 'P1@x.com', name: 'Priya' }, { email: 'bad' }, { email: 'p1@x.com' }],
      validateParentInvite,
    );
    expect(out[0]).toMatchObject({ row: 2, ok: true, data: { email: 'p1@x.com', name: 'Priya' } });
    expect(out[1]).toMatchObject({ row: 3, ok: false });
    expect(out[2]).toMatchObject({ row: 4, ok: false, errors: ['Duplicate of row 2 in this file.'] });
  });
});
