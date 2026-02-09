import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Module({
    controllers: [BillingController],
    providers: [BillingService, PrismaService, ConfigService],
    exports: [BillingService],
})
export class BillingModule { }
