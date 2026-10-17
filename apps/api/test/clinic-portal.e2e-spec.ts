import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { addDays, startOfDay } from 'date-fns';
import { AuditService } from '../src/audit/audit.service';
import { AvailabilityService } from '../src/marketplace/booking/availability.service';
import { JourneyAccessService } from '../src/resource-journey/journey-access.service';
import { ClinicPortalService } from '../src/clinic-portal/clinic-portal.service';
import { grantConsent } from '../src/common/consent';
import { prisma, scope, mkUser, mkParentWithChild, mkFacility, cleanup, type Scope } from './helpers/fixtures';

/**
 * The parent Clinic Portal against the real database: one child at one clinic, read
 * through the same records the clinic uses, then every parent write-back — reschedule
 * onto a real open slot, cancel with a reason, consent off/on (and its gate on reports),
 * intake submission — checked on the clinic's own rows, with the therapist and clinic
 * admin notified.
 *
 * Only rows this run creates are touched (see helpers/fixtures.ts); the case, therapist
 * profile, worksheet and audit rows made here are deleted in afterAll.
 */
describe('Clinic Portal', () => {
  const s: Scope = scope('t-portal');
  const notify = jest.fn().mockResolvedValue(undefined);
  const notifications = { createNotification: notify } as any;
  const payments = { processCancellationRefund: jest.fn() } as any;
  const library = { cardsFor: async () => new Map() } as any;
  const access = new JourneyAccessService(prisma as any);
  const portal = new ClinicPortalService(
    prisma as any,
    new AuditService(prisma as any),
    notifications,
    new AvailabilityService(prisma as any),
    payments,
    access,
    library,
  );

  let parent: any;
  let child: any;
  let stranger: any;
  let therapist: any;
  let clinicAdminId: string;
  let facilityId: string;
  let caseId: string;
  let futureId: string;
  let soonId: string;
  let pastId: string;
  let reviewId: string;
  let itemId: string;
  let worksheetId: string;

  const at = (days: number, hour: number) => {
    const d = startOfDay(addDays(new Date(), days));
    d.setHours(hour, 0, 0, 0);
    return d;
  };

  beforeAll(async () => {
    ({ user: parent, child } = await mkParentWithChild(s, 'Vikram', '2023-04-01'));
    stranger = await mkUser(s, 'stranger');
    therapist = await mkUser(s, 'meera', 'THERAPIST');
    const { facility } = await mkFacility(s, 'Sunrise CDC', 'CLINIC', { withLegacyClinic: true });
    facilityId = facility.id;
    await prisma.facility.update({ where: { id: facilityId }, data: { phone: '022 4000 1200', parentChangeWindowHours: 24 } });
    clinicAdminId = (await prisma.clinic.findUniqueOrThrow({ where: { id: facilityId } })).adminId;

    // Therapist works every day 09:00–17:00 in the server's zone, so slots exist.
    const tp = await prisma.therapistProfile.create({
      data: { userId: therapist.id, title: 'Speech-Language Pathologist', defaultTimezone: 'UTC' },
    });
    await prisma.therapistAvailability.createMany({
      data: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ therapistId: tp.id, dayOfWeek: d, startTime: '09:00', endTime: '17:00', timezone: 'UTC' })),
    });

    await prisma.childAffiliation.create({
      data: { childId: child.id, facilityId, type: 'PATIENT', status: 'ACTIVE', dataScope: 'FULL_CLINICAL' },
    });
    const c = await prisma.case.create({
      data: { caseNumber: `${s.tag}-1`, childId: child.id, primaryTherapistId: tp.id, clinicId: facilityId, organizationId: facility.organizationId },
    });
    caseId = c.id;

    futureId = (await prisma.caseSession.create({
      data: { caseId, therapistId: therapist.id, scheduledAt: at(5, 10), actualDuration: 45, sessionType: 'Speech therapy', discipline: 'SPEECH' },
    })).id;
    soonId = (await prisma.caseSession.create({
      data: { caseId, therapistId: therapist.id, scheduledAt: new Date(Date.now() + 3 * 3600e3), actualDuration: 45, sessionType: 'Speech therapy' },
    })).id;
    pastId = (await prisma.caseSession.create({
      data: {
        caseId, therapistId: therapist.id, scheduledAt: at(-7, 10), actualDuration: 45, sessionType: 'Speech therapy',
        noteStatus: 'SIGNED', signedAt: new Date(), rawNotes: 'CLINICAL ONLY',
        parentSummary: { workedOn: 'Two-word phrases', tryAtHome: 'Pause at snack time' }, parentSummarySharedAt: new Date(),
      },
    })).id;
    reviewId = (await prisma.assessmentReview.create({
      data: {
        caseId, createdById: therapist.id, title: 'Speech & language assessment', phase: 'SHARED', approval: 'approved',
        reportText: 'Vikram understands more than he can say yet.', recipients: { parent: true }, sharedAt: new Date(), meetingAt: at(-20, 10),
      },
    })).id;

    for (const type of ['ASSESSMENT', 'TREATMENT', 'REPORT_SHARING', 'TELEHEALTH'] as const) {
      await grantConsent(prisma, { childId: child.id, facilityId, type, purpose: 'test', grantedByUserId: parent.id, caseId });
    }

    worksheetId = (await prisma.worksheet.create({
      data: {
        title: `${s.tag} Snack-time requesting`, type: 'ACTIVITY', subType: 'matching', content: {}, metadata: {},
        status: 'PUBLISHED', isPublic: true, targetDomains: [], conditionTags: [], createdById: therapist.id,
      },
    })).id;
    itemId = (await prisma.childResource.create({
      data: {
        childId: child.id, kind: 'WORKSHEET', worksheetId, source: 'ASSIGNED', savedById: parent.id,
        assignedById: therapist.id, assignedAt: new Date(), parentNote: 'Do this every day this week.',
      },
    })).id;
  }, 120_000);

  afterAll(async () => {
    const ids = [parent?.id, stranger?.id, therapist?.id, clinicAdminId].filter(Boolean);
    await prisma.case.deleteMany({ where: { id: caseId } }); // sessions, reviews, intake, case audit, case consents cascade
    await prisma.worksheet.deleteMany({ where: { id: worksheetId } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: ids } } });
    await prisma.therapistProfile.deleteMany({ where: { userId: therapist?.id } });
    await cleanup(s);
    await prisma.$disconnect();
  }, 120_000);

  it('only the guardian can open it', async () => {
    await expect(portal.portal({ id: stranger.id }, child.id)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('reads the clinic’s own records: one clinic, its sessions, the shared report and activity', async () => {
    const p = await portal.portal({ id: parent.id }, child.id);
    expect(p.clinics).toHaveLength(1);
    const clinic = p.clinics[0];
    expect(clinic).toMatchObject({ facilityId, source: 'clinic', phone: '022 4000 1200', changeWindowHours: 24, discipline: 'Speech therapy' });
    expect(clinic.consents).toMatchObject({ assessment: true, therapy: true, reports: true, tele: true, media: false, ai: false });
    expect(clinic.intake).toMatchObject({ caseId, status: 'NOT_STARTED' });

    const byId = new Map(p.sessions.map((x: any) => [x.id, x]));
    expect(byId.get(`cs_${futureId}`)).toMatchObject({ status: 'scheduled', mins: 45 });
    expect(byId.get(`cs_${pastId}`)).toMatchObject({ status: 'attended', hasSummary: true });
    expect(p.assessments.find((a: any) => a.id === reviewId)).toMatchObject({ reportShared: true, reportWithheld: false });
    expect(p.activities).toEqual([expect.objectContaining({ id: itemId, note: 'Do this every day this week.', isNew: true })]);
    // Nothing clinical leaks into the read model.
    expect(JSON.stringify(p)).not.toContain('CLINICAL ONLY');
  });

  it('the summary is the parent-facing part only, and records a read receipt', async () => {
    const sum = await portal.summary({ id: parent.id }, child.id, `cs_${pastId}`);
    expect(sum.summary).toEqual({ workedOn: 'Two-word phrases', tryAtHome: 'Pause at snack time' });
    expect(JSON.stringify(sum)).not.toContain('CLINICAL ONLY');
    expect((await prisma.caseSession.findUniqueOrThrow({ where: { id: pastId } })).parentViewedAt).not.toBeNull();
  });

  it('inside the change window, reschedule and cancel are refused', async () => {
    await expect(portal.cancel({ id: parent.id }, child.id, `cs_${soonId}`, 'Child unwell')).rejects.toBeInstanceOf(BadRequestException);
    await expect(portal.reschedule({ id: parent.id }, child.id, `cs_${soonId}`, at(6, 11).toISOString())).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reschedules onto a real open slot and writes the clinic session; the care team is told', async () => {
    const slots = await portal.slots({ id: parent.id }, child.id, `cs_${futureId}`);
    expect(slots.days.length).toBeGreaterThan(0);
    const minStart = Date.now() + 24 * 3600e3;
    for (const d of slots.days) for (const x of d.slots) if (x.available) expect(new Date(x.start).getTime()).toBeGreaterThanOrEqual(minStart);
    const pick = slots.days.flatMap((d) => d.slots).find((x) => x.available)!;

    notify.mockClear();
    await portal.reschedule({ id: parent.id }, child.id, `cs_${futureId}`, pick.start);
    const row = await prisma.caseSession.findUniqueOrThrow({ where: { id: futureId } });
    expect(row.scheduledAt.toISOString()).toBe(pick.start);
    expect(row.rescheduledBy).toBe('PARENT');
    expect(await prisma.caseAuditLog.count({ where: { caseId, action: 'SESSION_RESCHEDULED_BY_PARENT' } })).toBe(1);
    const told = notify.mock.calls.map((c) => c[0].userId);
    expect(told).toEqual(expect.arrayContaining([therapist.id, clinicAdminId]));

    // A time that is not open is refused, with next free times offered.
    await expect(portal.reschedule({ id: parent.id }, child.id, `cs_${futureId}`, at(6, 3).toISOString())).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cancel needs a reason and marks the clinic session cancelled by the parent', async () => {
    await expect(portal.cancel({ id: parent.id }, child.id, `cs_${futureId}`, 'because')).rejects.toBeInstanceOf(BadRequestException);
    await portal.cancel({ id: parent.id }, child.id, `cs_${futureId}`, 'Schedule clash');
    const row = await prisma.caseSession.findUniqueOrThrow({ where: { id: futureId } });
    expect(row).toMatchObject({ attendanceStatus: 'CANCELLED', cancelledBy: 'PARENT', cancellationReason: 'Schedule clash' });
    const p = await portal.portal({ id: parent.id }, child.id);
    expect(p.sessions.find((x: any) => x.id === `cs_${futureId}`)).toMatchObject({ status: 'cancelled' });
  });

  it('consent is per clinic: turning off report sharing hides the report until it is back on', async () => {
    await portal.setConsent({ id: parent.id }, child.id, facilityId, 'reports', false);
    let p = await portal.portal({ id: parent.id }, child.id);
    expect(p.clinics[0].consents!.reports).toBe(false);
    expect(p.assessments.find((a: any) => a.id === reviewId)).toMatchObject({ reportShared: false, reportWithheld: true });
    await expect(portal.report({ id: parent.id }, child.id, reviewId)).rejects.toBeInstanceOf(ForbiddenException);
    expect(await prisma.caseAuditLog.count({ where: { caseId, action: 'CONSENT_REVOKED_BY_PARENT' } })).toBe(1);

    await portal.setConsent({ id: parent.id }, child.id, facilityId, 'reports', true);
    p = await portal.portal({ id: parent.id }, child.id);
    expect(p.clinics[0].consents!.reports).toBe(true);
    const r = await portal.report({ id: parent.id }, child.id, reviewId);
    expect(r.text).toContain('understands more');
    expect((await prisma.assessmentReview.findUniqueOrThrow({ where: { id: reviewId } })).parentViewedAt).not.toBeNull();
  });

  it('the intake lands on the clinic’s CaseIntake as a draft for review', async () => {
    await portal.submitIntake({ id: parent.id }, child.id, caseId, {
      presentingConcern: 'Few words for age',
      consentTelehealth: true,
      data: { child: { name: 'Vikram' } },
    });
    const intake = await prisma.caseIntake.findUniqueOrThrow({ where: { caseId } });
    expect(intake).toMatchObject({ state: 'DRAFT', presentingConcern: 'Few words for age', consentTelehealth: true, recordedBy: 'PARENT_PORTAL' });
    const p = await portal.portal({ id: parent.id }, child.id);
    expect(p.clinics[0].intake!.status).toBe('SUBMITTED');
  });

  it('opening an activity clears “New”', async () => {
    await portal.markSeen({ id: parent.id }, child.id, itemId);
    const p = await portal.portal({ id: parent.id }, child.id);
    expect(p.activities[0].isNew).toBe(false);
  });

  it('another family’s session is not reachable', async () => {
    const other = await mkParentWithChild(s, 'Other', '2022-01-01');
    await expect(portal.cancel({ id: other.user.id }, other.child.id, `cs_${pastId}`, 'Other')).rejects.toBeInstanceOf(NotFoundException);
  });
});
