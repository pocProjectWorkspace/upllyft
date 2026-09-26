import { BadRequestException } from '@nestjs/common';
import { detectContentType } from './file-type';

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(8)]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(8)]);
const PDF = Buffer.from('%PDF-1.4 hello');
const HTML = Buffer.from('<script>alert(1)</script>');
const IMAGES = ['image/jpeg', 'image/png', 'image/gif'];
const DOCS = ['application/pdf', 'image/jpeg', 'image/png'];

describe('detectContentType', () => {
  it('returns the type the bytes say when extension and declared type agree', () => {
    expect(detectContentType(PNG, 'a.png', 'image/png', IMAGES)).toBe('image/png');
    expect(detectContentType(JPEG, 'a.JPG', 'image/jpg', IMAGES)).toBe('image/jpeg');
    expect(detectContentType(PDF, 'licence.pdf', 'application/pdf', DOCS)).toBe('application/pdf');
  });

  it('rejects HTML disguised as an image (stored XSS vector)', () => {
    expect(() => detectContentType(HTML, 'x.png', 'text/html', IMAGES)).toThrow(BadRequestException);
    expect(() => detectContentType(HTML, 'x.png', 'image/png', IMAGES)).toThrow(BadRequestException);
  });

  it('rejects a declared type or extension that disagrees with the bytes', () => {
    expect(() => detectContentType(PNG, 'a.png', 'image/jpeg', IMAGES)).toThrow(BadRequestException);
    expect(() => detectContentType(PNG, 'a.jpg', 'image/png', IMAGES)).toThrow(BadRequestException);
  });

  it('rejects types outside the allowlist even when the bytes are valid', () => {
    expect(() => detectContentType(PDF, 'a.pdf', 'application/pdf', IMAGES)).toThrow(BadRequestException);
  });
});
