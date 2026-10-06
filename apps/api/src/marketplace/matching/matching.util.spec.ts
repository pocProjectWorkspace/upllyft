import { classifyDiscipline, departmentForFilter, inferDepartment } from './matching.util';

describe('discipline / department mapping', () => {
  it('prefers the stored department over keyword guessing', () => {
    expect(classifyDiscipline('Clinical Psychologist', [], 'speech')).toBe('speech');
    expect(classifyDiscipline(null, ['Language Delay'], 'speech')).toBe('speech');
  });

  it('falls back to title, then specializations', () => {
    expect(classifyDiscipline('Senior Occupational Therapist', ['ABA'])).toBe('ot');
    expect(classifyDiscipline(null, ['Applied Behaviour Analysis'])).toBe('behaviour');
    expect(classifyDiscipline(null, ['Stuttering & Fluency'])).toBe('unknown');
  });

  it('infers a DepartmentKey from free text', () => {
    expect(inferDepartment('Speech-Language Pathologist', [])).toBe('speech');
    expect(inferDepartment('ABA Therapist (BCBA)', [])).toBe('aba');
    expect(inferDepartment('Child Psychologist', [])).toBe('psychology');
    expect(inferDepartment('Physical Therapist', [])).toBe('physio');
    expect(inferDepartment(null, ['Special Education'])).toBe('specialed');
    expect(inferDepartment('Therapist', ['Play'])).toBeNull();
  });

  it('maps a parent filter (key or legacy label) to a department', () => {
    expect(departmentForFilter('ot')).toBe('ot');
    expect(departmentForFilter('Speech Therapy')).toBe('speech');
    expect(departmentForFilter('Occupational Therapy')).toBe('ot');
    expect(departmentForFilter('Behavioral Therapy')).toBe('aba');
    expect(departmentForFilter('Child Psychology')).toBe('psychology');
    expect(departmentForFilter('Special Education')).toBe('specialed');
    expect(departmentForFilter('Anxiety')).toBeNull();
  });
});
