// apps/api/src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {

  constructor() {
    // Disable verbose query logging to reduce log noise
    const isProduction = process.env.NODE_ENV === 'production';
    super({
      log: isProduction
        ? ['warn', 'error']
        : ['warn', 'error'],
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