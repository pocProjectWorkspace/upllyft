import { EmailProviderFactory } from '../factory/email-provider.factory';
import { BrevoProvider } from './brevo.provider';

describe('BrevoProvider', () => {
  const realFetch = global.fetch;
  let fetchMock: jest.Mock;
  let provider: BrevoProvider;

  const reply = (status: number, body: unknown) =>
    fetchMock.mockResolvedValueOnce({ ok: status >= 200 && status < 300, status, statusText: '', json: async () => body });

  beforeEach(async () => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as any;
    provider = new BrevoProvider();
    await provider.initialize({ apiKey: 'xkeysib-test', fromEmail: 'noreply@safehaven-upllyft.com', fromName: 'Upllyft' });
  });

  afterAll(() => {
    global.fetch = realFetch;
  });

  it('refuses to start without an API key', async () => {
    await expect(new BrevoProvider().initialize({ fromEmail: 'a@x.test', fromName: 'A' })).rejects.toThrow('BREVO_API_KEY');
  });

  it('posts the email to the v3 API with the key and idempotency key as headers', async () => {
    reply(201, { messageId: '<abc@relay>' });
    const result = await provider.send({
      to: { email: 'asha@x.test', name: 'Asha Rao' },
      cc: 'cc@x.test',
      replyTo: 'help@x.test',
      subject: 'Welcome',
      html: '<p>Hi</p>',
      text: 'Hi',
      tags: ['therapist-invite'],
      idempotencyKey: 'therapist-invite-123',
    });

    expect(result).toMatchObject({ success: true, messageId: '<abc@relay>', provider: 'brevo' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'api-key': 'xkeysib-test', 'Idempotency-Key': 'therapist-invite-123' });
    expect(JSON.parse(init.body)).toEqual({
      sender: { email: 'noreply@safehaven-upllyft.com', name: 'Upllyft' },
      to: [{ email: 'asha@x.test', name: 'Asha Rao' }],
      cc: [{ email: 'cc@x.test' }],
      replyTo: { email: 'help@x.test' },
      subject: 'Welcome',
      htmlContent: '<p>Hi</p>',
      textContent: 'Hi',
      tags: ['therapist-invite'],
    });
  });

  it('wraps text-only emails as escaped HTML (Brevo requires htmlContent)', () => {
    const body = provider.buildBody({ to: 'a@x.test', subject: 's', text: 'Use <b> & go' });
    expect(body.htmlContent).toContain('Use &lt;b&gt; &amp; go');
    expect(body.textContent).toBe('Use <b> & go');
  });

  it('sends attachments as base64', () => {
    const body = provider.buildBody({
      to: 'a@x.test',
      subject: 's',
      html: 'x',
      attachments: [
        { filename: 'a.txt', content: Buffer.from('hello') },
        { filename: 'b.txt', content: 'aGk=', encoding: 'base64' },
        { filename: 'c.txt', content: 'hey' },
      ],
    });
    expect(body.attachment).toEqual([
      { name: 'a.txt', content: Buffer.from('hello').toString('base64') },
      { name: 'b.txt', content: 'aGk=' },
      { name: 'c.txt', content: Buffer.from('hey').toString('base64') },
    ]);
  });

  it('treats duplicate_request as already sent', async () => {
    reply(400, { code: 'duplicate_request', message: 'Duplicate request' });
    expect(await provider.send({ to: 'a@x.test', subject: 's', html: 'x', idempotencyKey: 'k' })).toMatchObject({
      success: true,
      duplicate: true,
    });
  });

  it('reports API errors and network failures without throwing', async () => {
    reply(401, { code: 'unauthorized', message: 'Key not found' });
    expect(await provider.send({ to: 'a@x.test', subject: 's', html: 'x' })).toMatchObject({
      success: false,
      error: 'Brevo 401 unauthorized: Key not found',
      errorCode: 'unauthorized',
    });

    fetchMock.mockRejectedValueOnce(new Error('The operation was aborted due to timeout'));
    expect(await provider.send({ to: 'a@x.test', subject: 's', html: 'x' })).toMatchObject({
      success: false,
      error: 'The operation was aborted due to timeout',
    });
  });

  it('health check calls the account endpoint and never returns the key', async () => {
    reply(200, { email: 'owner@x.test' });
    const health = await provider.getHealthStatus();
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.brevo.com/v3/account');
    expect(health).toMatchObject({ healthy: true, details: { provider: 'brevo', mode: 'api' } });
    expect(JSON.stringify(health)).not.toContain('xkeysib');

    reply(401, {});
    expect((await provider.getHealthStatus()).healthy).toBe(false);
  });
});

describe('EmailProviderFactory with EMAIL_PROVIDER=brevo', () => {
  it('selects Brevo and reads BREVO_* settings', async () => {
    const env: Record<string, string> = {
      EMAIL_PROVIDER: 'brevo',
      BREVO_API_KEY: 'xkeysib-test',
      BREVO_FROM_EMAIL: 'noreply@safehaven-upllyft.com',
      BREVO_FROM_NAME: 'Upllyft',
    };
    const config: any = { get: (k: string, d?: unknown) => env[k] ?? d };
    const brevo = new BrevoProvider();
    const unused: any = {};
    const factory = new EmailProviderFactory(config, unused, unused, unused, unused, brevo);
    await factory.initializeProvider();

    expect(factory.getProviderType()).toBe('brevo');
    expect(factory.isConfigured()).toBe(true);
    expect(factory.getProvider()).toBe(brevo);
    expect(brevo.buildBody({ to: 'a@x.test', subject: 's', html: 'x' }).sender).toEqual({
      email: 'noreply@safehaven-upllyft.com',
      name: 'Upllyft',
    });
  });
});
