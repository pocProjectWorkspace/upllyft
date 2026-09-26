import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { ConfigService } from '@nestjs/config';

@Module({
    controllers: [BillingController],
    // PrismaService comes from the global PrismaModule (one client, one pool).
    providers: [BillingService, ConfigService],
    exports: [BillingService],
})
export class BillingModule { }
