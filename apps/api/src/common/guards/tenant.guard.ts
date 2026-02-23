import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class TenantGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            throw new UnauthorizedException('User not authenticated');
        }

        // Role-based Tenant Enforcement

        // Super Admins bypassed tenant checks
        if (user.role === 'SUPERADMIN') {
            return true;
        }

        // Admins must have a clinicId OR organizationId to manage their data
        if (user.role === 'ADMIN') {
            if (!user.clinicId && !user.organizationId) {
                throw new ForbiddenException('Admin user is not associated with any Clinic or Organization');
            }
            return true;
        }

        // Therapists must be tied to a Clinic to view Case/Booking data
        if (user.role === 'THERAPIST') {
            if (!user.clinicId) {
                throw new ForbiddenException('Therapist is not assigned to a Clinic');
            }
            return true;
        }

        // Patients (USER role) don't have a strict clinicId in the token by default 
        // because they can book with multiple clinics. Their data is naturally segregated 
        // by patientId in the queries.
        if (user.role === 'USER') {
            return true;
        }

        return true;
    }
}
