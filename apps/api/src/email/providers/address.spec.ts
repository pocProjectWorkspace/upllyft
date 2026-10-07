import * as nodemailer from 'nodemailer';
import { SmtpProvider } from './smtp.provider';
import { SESProvider } from './ses.provider';

/** Recipient names come from admin spreadsheets: they must never add recipients or headers. */
describe('email recipient names', () => {
  const evil = 'Evil", attacker@evil.com, "x';

  it('SMTP: a crafted name does not add a recipient', async () => {
    const provider = new SmtpProvider();
    const stream = nodemailer.createTransport({ streamTransport: true, buffer: true });
    (provider as any).transporter = stream;
    (provider as any).smtpConfig = { fromEmail: 'noreply@x.test', fromName: 'Upllyft' };
    (provider as any).config = (provider as any).smtpConfig;
    (provider as any).initialized = true;
    const spy = jest.spyOn(stream, 'sendMail');

    const result = await provider.send({ to: { email: 'victim@x.test', name: evil }, subject: 's', text: 't' });
    expect(result.success).toBe(true);
    const info: any = await spy.mock.results[0].value;
    expect(info.envelope.to).toEqual(['victim@x.test']);
  });

  it('formatAddress quotes, escapes and drops line breaks', () => {
    const format = (r: { email: string; name?: string }) => (new SESProvider() as any).formatAddress(r);
    expect(format({ email: 'a@x.test' })).toBe('a@x.test');
    expect(format({ email: 'a@x.test', name: 'Asha Rao' })).toBe('"Asha Rao" <a@x.test>');
    expect(format({ email: 'a@x.test', name: evil })).toBe('"Evil\\", attacker@evil.com, \\"x" <a@x.test>');
    expect(format({ email: 'a@x.test', name: 'A\r\nBcc: b@evil.com' })).toBe('"A Bcc: b@evil.com" <a@x.test>');
    expect(format({ email: 'a@x.test', name: 'प्रिया' })).toMatch(/^=\?UTF-8\?B\?.+\?= <a@x\.test>$/);
  });
});
