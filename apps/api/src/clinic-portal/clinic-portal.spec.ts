import { shortClinicName } from './clinic-portal.service';

describe('shortClinicName', () => {
  it('keeps short names and abbreviates long ones', () => {
    expect(shortClinicName('Bloom OT')).toBe('Bloom OT');
    expect(shortClinicName('Sunrise Child Development Centre')).toBe('Sunrise CDC');
    expect(shortClinicName('Bloom Occupational Therapy')).toBe('Bloom OT');
    expect(shortClinicName('Centre for Speech and Language')).toBe('Centre SL');
  });
});
