import { Logger, OnApplicationShutdown } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import { createClient, RedisClientType } from 'redis';
import { connectWithTimeout } from './redis.config';

/**
 * Redis-backed storage for @nestjs/throttler so rate limits are shared across
 * API replicas (PERFORMANCE_AUDIT.md #30). Mirrors the contract of the bundled
 * in-memory `ThrottlerStorageService`: `ttl` arrives in milliseconds and
 * `timeToExpire` is returned in whole seconds.
 *
 * One round trip per request: a Lua script does INCR, sets the window expiry on
 * the first hit only, and returns PTTL. Being a script it is atomic (a burst
 * cannot leave a key without an expiry) and it needs nothing newer than Redis
 * 2.6 — `PEXPIRE ... NX` would have been simpler but requires Redis 7.
 *
 * If Redis is unreachable the request is ALLOWED (fail-open) and the error is
 * logged. Rate limiting is a defence in depth here, not the auth boundary; a
 * Redis outage must not take login down with it.
 */
const INCREMENT_SCRIPT = `
local hits = redis.call('INCR', KEYS[1])
if hits == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return { hits, redis.call('PTTL', KEYS[1]) }
`;

export class RedisThrottlerStorage implements ThrottlerStorage, OnApplicationShutdown {
  private readonly logger = new Logger(RedisThrottlerStorage.name);
  private readonly client: RedisClientType;
  private ready = false;

  constructor(redisUrl: string, private readonly keyPrefix = 'throttle:') {
    this.client = createClient({ url: redisUrl });
    this.client.on('error', (err) => {
      if (this.ready) this.logger.error(`Redis throttler client: ${err.message}`);
    });
  }

  async connect(): Promise<void> {
    await connectWithTimeout(this.client);
    this.ready = true;
    this.logger.log('Throttler storage connected to Redis');
  }

  async increment(key: string, ttl: number): Promise<ThrottlerStorageRecord> {
    const redisKey = this.keyPrefix + key;
    try {
      const [totalHits, pttl] = (await this.client.eval(INCREMENT_SCRIPT, {
        keys: [redisKey],
        arguments: [String(ttl)],
      })) as [number, number];

      const timeToExpire = pttl > 0 ? Math.ceil(pttl / 1000) : Math.ceil(ttl / 1000);
      return { totalHits, timeToExpire };
    } catch (err) {
      this.logger.error(`Throttler storage unavailable, allowing request: ${(err as Error).message}`);
      return { totalHits: 1, timeToExpire: Math.ceil(ttl / 1000) };
    }
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.ready) await this.client.quit().catch(() => undefined);
  }
}
