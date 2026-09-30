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

/** How long boot waits for Redis before falling back to in-process mode. */
export const REDIS_CONNECT_TIMEOUT_MS = 5_000;

interface ConnectableClient {
  connect(): Promise<unknown>;
  disconnect(): Promise<unknown>;
}

/**
 * `client.connect()` with a deadline. node-redis retries a refused connection
 * forever, so a plain `await connect()` never rejects when Redis is down — and
 * both callers await it during boot. That hung the API before it listened:
 * production had REDIS_HOST=localhost with no Redis in the container, the
 * health check timed out, and every Railway deploy after 26 Sept rolled back.
 *
 * On timeout (or error) the client is disconnected, which also stops its retry
 * loop, and the error is rethrown so the caller's in-process fallback runs.
 */
export async function connectWithTimeout(
  client: ConnectableClient,
  timeoutMs = REDIS_CONNECT_TIMEOUT_MS,
): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`no connection within ${timeoutMs} ms`)),
      timeoutMs,
    );
  });
  try {
    await Promise.race([client.connect(), deadline]);
  } catch (err) {
    await client.disconnect().catch(() => undefined);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
