import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import type { ServerOptions } from 'socket.io';

/**
 * Socket.IO adapter backed by Redis pub/sub (PERFORMANCE_AUDIT.md #30).
 *
 * Both gateways address clients by room (`user:<id>`, `conversation:<id>`), so
 * once the adapter is installed an `emit` on any replica reaches sockets on
 * every replica. Nothing in the gateways changes.
 *
 * `connect()` must resolve before `app.useWebSocketAdapter(adapter)`; if it
 * rejects, `main.ts` falls back to the default in-memory adapter and logs it.
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;

  constructor(app: INestApplicationContext, private readonly redisUrl: string) {
    super(app);
  }

  async connect(): Promise<void> {
    const pubClient = createClient({ url: this.redisUrl });
    const subClient = pubClient.duplicate();

    // Log, don't throw: a dropped connection is retried by the client; an
    // unhandled 'error' event would crash the process.
    pubClient.on('error', (err) => this.logger.error(`Redis pub client: ${err.message}`));
    subClient.on('error', (err) => this.logger.error(`Redis sub client: ${err.message}`));

    await Promise.all([pubClient.connect(), subClient.connect()]);
    this.adapterConstructor = createAdapter(pubClient, subClient);
    this.logger.log('Socket.IO Redis adapter connected');
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
