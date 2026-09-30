import { Module } from '@nestjs/common';
import { ClinicController, PracticeController } from './clinic.controller';
import { ClinicService } from './clinic.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [ClinicController, PracticeController],
    providers: [ClinicService],
    exports: [ClinicService],
})
export class ClinicModule { }
