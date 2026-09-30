import { ConfigService } from '@nestjs/config';
import { connectWithTimeout, resolveRedisUrl } from './redis.config';
import { RedisThrottlerStorage } from './redis-throttler.storage';

const mockClient = {
  on: jest.fn(),
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue(undefined),
  eval: jest.fn(),
};

jest.mock('redis', () => ({ createClient: jest.fn(() => mockClient) }));

function config(values: Record<string, string | undefined>): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

describe('resolveRedisUrl', () => {
  it('returns null when nothing is configured', () => {
    expect(resolveRedisUrl(config({}))).toBeNull();
    expect(resolveRedisUrl(config({ REDIS_HOST: '  ' }))).toBeNull();
  });

  it('prefers REDIS_URL', () => {
    expect(resolveRedisUrl(config({ REDIS_URL: 'redis://x:1', REDIS_HOST: 'y' }))).toBe('redis://x:1');
  });

  it('builds a URL from host/port/password', () => {
    expect(resolveRedisUrl(config({ REDIS_HOST: 'localhost' }))).toBe('redis://localhost:6379');
    expect(resolveRedisUrl(config({ REDIS_HOST: 'h', REDIS_PORT: '6380', REDIS_PASSWORD: 'p@ss' }))).toBe(
      'redis://:p%40ss@h:6380',
    );
  });
});

describe('connectWithTimeout', () => {
  it('rejects and disconnects when connect() never settles (unreachable Redis)', async () => {
    // node-redis retries ECONNREFUSED forever, so connect() just hangs — the
    // production boot hang behind the failed Railway deploys.
    const client = {
      connect: jest.fn(() => new Promise(() => undefined)),
      disconnect: jest.fn().mockResolvedValue(undefined),
    };

    await expect(connectWithTimeout(client, 20)).rejects.toThrow('no connection within 20 ms');
    expect(client.disconnect).toHaveBeenCalledTimes(1);
  });

  it('resolves and leaves the client connected when Redis answers', async () => {
    const client = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
    };

    await expect(connectWithTimeout(client, 20)).resolves.toBeUndefined();
    expect(client.disconnect).not.toHaveBeenCalled();
  });
});

describe('RedisThrottlerStorage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('runs the atomic script with the prefixed key and window, and reports seconds to expire', async () => {
    mockClient.eval.mockResolvedValue([3, 42_500]);
    const storage = new RedisThrottlerStorage('redis://localhost:6379');
    await storage.connect();

    const record = await storage.increment('login:1.2.3.4', 60_000);

    expect(mockClient.eval).toHaveBeenCalledWith(expect.stringContaining("redis.call('INCR', KEYS[1])"), {
      keys: ['throttle:login:1.2.3.4'],
      arguments: ['60000'],
    });
    expect(record).toEqual({ totalHits: 3, timeToExpire: 43 });
  });

  it('fails open when Redis is unreachable', async () => {
    mockClient.eval.mockRejectedValue(new Error('ECONNREFUSED'));
    const storage = new RedisThrottlerStorage('redis://localhost:6379');
    await storage.connect();

    const record = await storage.increment('k', 60_000);

    expect(record).toEqual({ totalHits: 1, timeToExpire: 60 });
  });
});
