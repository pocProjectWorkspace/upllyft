import { Module } from '@nestjs/common';
import { PackageService } from './package.service';
import { PackageController } from './package.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
    imports: [PrismaModule, PaymentModule],
    controllers: [PackageController],
    providers: [PackageService],
    exports: [PackageService],
})
export class PackageModule { }
