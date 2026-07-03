import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

/**
 * Belt-and-suspenders write guard for clinical records.
 *
 * NOTE: the shared `@CaseAccess('edit')` level is currently NOT enforced by
 * CaseAccessGuard (a pre-existing bug — the level metadata is written where the
 * Nest Reflector never reads it, so every level resolves to 'view'). Until that
 * shared decorator is fixed app-wide, this guard explicitly blocks non-clinician
 * writers (e.g. parents, who are view-only) from mutating clinical records.
 *
 * Runs AFTER CaseAccessGuard (which sets request.caseRole), so it can rely on
 * both the resolved case role and the user's platform role.
 */
@Injectable()
export class ClinicalWriteGuard implements CanActivate {
  private static readonly CLINICAL_ROLES = new Set([
    'THERAPIST',
    'EDUCATOR',
    'ADMIN',
    'MODERATOR',
  ]);

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    if (req.caseRole === 'parent') {
      throw new ForbiddenException('Parents cannot modify clinical records.');
    }

    const role = req.user?.role;
    if (role && !ClinicalWriteGuard.CLINICAL_ROLES.has(role)) {
      throw new ForbiddenException('Only clinicians can modify clinical records.');
    }

    return true;
  }
}
