// apps/api/src/common/storage/file-type.ts
import { BadRequestException } from '@nestjs/common';

/**
 * Content-type for uploads must never come from the client: a file named
 * `x.png` declared as `text/html` would be stored and served as HTML from
 * the bucket origin (stored XSS). Derive it from the file's magic bytes and
 * require the declared extension/mimetype to agree.
 */
const SIGNATURES: Array<{ mime: string; exts: string[]; test: (b: Buffer) => boolean }> = [
  { mime: 'image/jpeg', exts: ['.jpg', '.jpeg'], test: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/png', exts: ['.png'], test: (b) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: 'image/gif', exts: ['.gif'], test: (b) => b.length > 6 && (b.subarray(0, 6).toString('ascii') === 'GIF87a' || b.subarray(0, 6).toString('ascii') === 'GIF89a') },
  { mime: 'application/pdf', exts: ['.pdf'], test: (b) => b.length > 5 && b.subarray(0, 5).toString('ascii') === '%PDF-' },
];

/**
 * Returns the trusted content-type for `buffer`, or throws when the bytes
 * do not match one of `allowedMimes`, or the declared extension / mimetype
 * disagree with what the bytes say.
 */
export function detectContentType(
  buffer: Buffer,
  originalname: string,
  declaredMime: string,
  allowedMimes: readonly string[],
): string {
  const ext = (originalname.match(/\.[A-Za-z0-9]+$/)?.[0] ?? '').toLowerCase();
  const match = SIGNATURES.find((s) => allowedMimes.includes(s.mime) && s.test(buffer));
  if (!match) {
    throw new BadRequestException('File content does not match an allowed type.');
  }
  const declared = declaredMime === 'image/jpg' ? 'image/jpeg' : declaredMime;
  if (declared !== match.mime || (ext && !match.exts.includes(ext))) {
    throw new BadRequestException('File type, extension and content must agree.');
  }
  return match.mime;
}
