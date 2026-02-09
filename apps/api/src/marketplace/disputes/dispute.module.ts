import { Module } from '@nestjs/common';
import { DisputeService } from './dispute.service';
import { DisputeController } from './dispute.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
    imports: [PrismaModule, PaymentModule],
    controllers: [DisputeController],
    providers: [DisputeService],
    exports: [DisputeService],
})
export class DisputeModule { }
