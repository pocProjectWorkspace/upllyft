import { ConfigService } from '@nestjs/config';

/**
 * Resolve the Redis connection URL from the environment, or `null` when Redis
 * is not configured.
 *
 * Accepted forms, in priority order:
 *   REDIS_URL=redis://[:password@]host:port[/db]   (Railway / Upstash style)
 *   REDIS_HOST=... REDIS_PORT=... REDIS_PASSWORD=... (the .env.example layout)
 *
 * Redis is OPTIONAL. When it is absent the API keeps the in-process Socket.IO
 * adapter and throttler storage, which is correct for a single replica. It is
 * required as soon as the API runs more than one instance: without it a
 * notification emitted on replica A never reaches a socket connected to
 * replica B, and the login throttle is per-replica (PERFORMANCE_AUDIT.md #30).
 */
export function resolveRedisUrl(config: ConfigService): string | null {
  const url = config.get<string>('REDIS_URL')?.trim();
  if (url) return url;

  const host = config.get<string>('REDIS_HOST')?.trim();
  if (!host) return null;

  const port = config.get<string>('REDIS_PORT')?.trim() || '6379';
  const password = config.get<string>('REDIS_PASSWORD')?.trim();
  const auth = password ? `:${encodeURIComponent(password)}@` : '';
  return `redis://${auth}${host}:${port}`;
}
