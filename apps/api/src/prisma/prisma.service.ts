// apps/api/src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {

  constructor() {
    super({
      // Query logging is intentionally off in every environment to reduce noise.
      log: ['warn', 'error'],
      // Never fetch the large `embedding Float[]` columns unless a query opts in
      // explicitly with `select: { embedding: true }` or `omit: { embedding: false }`.
      // These vectors are 1.5k floats per row and were being read on every
      // /auth/me, /posts and /feeds request and then stripped by an interceptor.
      omit: {
        user: { embedding: true },
        post: { embedding: true },
        question: { embedding: true },
        // originalContent holds the pre-redaction text; it is written by
        // AnswersService and never read back, so keep it out of every query.
        answer: { embedding: true, originalContent: true },
      },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    console.log('✅ Database connected successfully');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    console.log('⚠️ Database disconnected');
  }
}