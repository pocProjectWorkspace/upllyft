import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { EmailModule } from '../email/email.module';

@Module({
    imports: [EmailModule],
    controllers: [OrganizationsController],
    // PrismaService comes from the global PrismaModule (one client, one pool).
    providers: [OrganizationsService],
    exports: [OrganizationsService],
})
export class OrganizationsModule { }
