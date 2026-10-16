import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CaseStatus, ConsentType, IntakeState, Prisma } from '@prisma/client';
import { addDays, addMinutes, startOfDay } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService, NotificationType } from '../notification/notification.service';
import { AvailabilityService } from '../marketplace/booking/availability.service';
import { PaymentService } from '../marketplace/payment/payment.service';
import { JourneyAccessService } from '../resource-journey/journey-access.service';
import { JourneyLibraryService } from '../resource-journey/journey-library.service';
import { grantConsent, hasConsent, revokeConsent } from '../common/consent';

/**
 * Clinic Portal — the parent's view of, and actions on, the records the clinic side
 * owns. Nothing here is a parent-only copy:
 *
 *   sessions     CaseSession (clinic) and Booking (Upllyft) — the same rows the Sessions
 *                grid, the org calendar and Hub → Bookings read
 *   reschedule   the therapist's real availability (TherapistAvailability + leave
 *                exceptions + every booked Booking and CaseSession)
 *   reports      AssessmentReview shared with the parent, gated on REPORT_SHARING consent
 *   summaries    CaseSession.parentSummary, shared by the therapist after sign-off
 *   activities   ChildResource assigned with My Library's "Use with client"
 *   intake       CaseIntake — lands exactly where the public intake link lands
 *   consent      ChildConsent (+ the CaseConsent mirror and the intake's Section E)
 *
 * Every parent write is audit-logged and notifies the therapist and the clinic admins.
 */

/** The six portal toggles, in intake Section E order, and the consent each one is. */
export const PORTAL_CONSENTS = [
  { key: 'assessment', type: ConsentType.ASSESSMENT, intake: 'consentAssessment' },
  { key: 'therapy', type: ConsentType.TREATMENT, intake: 'consentTherapy' },
  { key: 'reports', type: ConsentType.REPORT_SHARING, intake: 'consentSharing' },
  { key: 'tele', type: ConsentType.TELEHEALTH, intake: 'consentTelehealth' },
  { key: 'media', type: ConsentType.RECORDING, intake: 'consentMedia' },
  { key: 'ai', type: ConsentType.DATA_PROCESSING, intake: 'consentAi' },
] as const;
export type PortalConsentKey = (typeof PORTAL_CONSENTS)[number]['key'];

export const CANCEL_REASONS = ['Child unwell', 'Schedule clash', 'Travelling', 'Other'] as const;

const DEFAULT_WINDOW_HOURS = 24;
const OPEN_CASE = { in: ['ACTIVE', 'ON_HOLD'] as CaseStatus[] };
const LIVE_BOOKING = ['PENDING_ACCEPTANCE', 'CONFIRMED', 'ACCEPTED', 'IN_PROGRESS'];
const DONE_BOOKING = ['COMPLETED'];
const CANCELLED_BOOKING = ['CANCELLED_BY_PATIENT', 'CANCELLED_BY_THERAPIST'];
const SLOT_DAYS = 14;
const SLOT_MAX_DAYS_SHOWN = 4;

const DISCIPLINE_LABEL: Record<string, string> = {
  SPEECH: 'Speech therapy',
  OCCUPATIONAL: 'Occupational therapy',
  BEHAVIOUR_ABA: 'Behaviour therapy',
  PSYCHOLOGY: 'Psychology',
  SPECIAL_EDUCATION: 'Special education',
  PHYSIOTHERAPY: 'Physiotherapy',
  MEDICAL: 'Medical',
  MULTIDISCIPLINARY: 'Multidisciplinary',
  UNIVERSAL: 'Therapy',
};

type SessionKind = 'case' | 'booking';
type PortalStatus = 'scheduled' | 'rescheduled' | 'cancelled' | 'attended' | 'missed';

interface Actor {
  id: string;
}

interface ClinicLink {
  key: string;
  facilityId: string | null;
  name: string;
  area: string | null;
  phone: string | null;
  source: 'clinic' | 'upllyft';
  therapist: { userId: string; profileId: string; name: string } | null;
  discipline: string | null;
  changeWindowHours: number;
  caseIds: string[];
}

/** "Sunrise Child Development Centre" → "SC"; one word → its first two letters. */
function initials(name: string): string {
  const words = name.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w));
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[0] ?? name).slice(0, 2).toUpperCase();
}

/**
 * Short label for chips and rows. "Sunrise Child Development Centre" → "Sunrise CDC":
 * the first word plus the initials of the rest, so it stays recognisable.
 */
export function shortClinicName(name: string): string {
  if (name.length <= 18) return name;
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length < 3) return name;
  const rest = words.slice(1).filter((w) => /^[A-Za-z]/.test(w) && !/^(of|and|the|for|&)$/i.test(w));
  return `${words[0]} ${rest.map((w) => w[0].toUpperCase()).join('')}`;
}

function sessionKindOf(label: string | null | undefined): 'Session' | 'Consultation' | 'Assessment' {
  if (!label) return 'Session';
  if (/assess|evaluat/i.test(label)) return 'Assessment';
  if (/consult|initial|intro|first/i.test(label)) return 'Consultation';
  return 'Session';
}

function isOnline(...labels: Array<string | null | undefined>): boolean {
  return labels.some((l) => !!l && /online|tele|video|virtual|remote/i.test(l));
}

@Injectable()
export class ClinicPortalService {
  private readonly logger = new Logger(ClinicPortalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
    private readonly availability: AvailabilityService,
    private readonly payments: PaymentService,
    private readonly access: JourneyAccessService,
    private readonly library: JourneyLibraryService,
  ) {}

  // ═══ Read model ═════════════════════════════════════════════════════════════

  /** Everything the portal shows for one child, in one call. */
  async portal(actor: Actor, childId: string) {
    const child = await this.access.assertGuardian(actor.id, childId);
    const now = new Date();

    const [cases, affiliations, bookings, childCount] = await Promise.all([
      this.prisma.case.findMany({
        where: { childId, status: { notIn: ['ARCHIVED'] } },
        select: {
          id: true,
          status: true,
          clinicId: true,
          primaryTherapist: { select: { id: true, userId: true, user: { select: { name: true } } } },
          intake: { select: { state: true, updatedAt: true, summarisedAt: true, recordedBy: true } },
          intakeTokenExpiry: true,
          carePlans: {
            where: { status: { in: ['LOCKED', 'ACTIVE', 'COMPLETED'] } },
            orderBy: { startDate: 'desc' },
            take: 1,
            select: {
              id: true,
              disciplines: true,
              daysOfWeek: true,
              sessionCount: true,
              mode: true,
              sessions: { select: { scheduledAt: true, attendanceStatus: true } },
            },
          },
          sessions: {
            orderBy: { scheduledAt: 'asc' },
            select: {
              id: true,
              therapistId: true,
              therapist: { select: { name: true } },
              bookingId: true,
              booking: { select: { modality: true, status: true } },
              scheduledAt: true,
              actualDuration: true,
              sessionType: true,
              location: true,
              discipline: true,
              attendanceStatus: true,
              cancelledBy: true,
              rescheduledAt: true,
              noteStatus: true,
              parentSummarySharedAt: true,
              telehealthEncounter: { select: { id: true } },
              carePlan: { select: { sessionDurationMin: true, mode: true } },
            },
          },
          assessmentReviews: {
            select: {
              id: true,
              title: true,
              phase: true,
              meetingAt: true,
              syncMode: true,
              recipients: true,
              sharedAt: true,
              parentPrep: true,
              disciplines: { select: { discipline: true } },
            },
          },
        },
      }),
      this.prisma.childAffiliation.findMany({
        where: { childId, endedAt: null, type: 'PATIENT', facility: { type: 'CLINIC' } },
        select: { facilityId: true },
      }),
      this.prisma.booking.findMany({
        where: { childId, caseSession: null },
        orderBy: { startDateTime: 'asc' },
        select: {
          id: true,
          clinicId: true,
          therapistId: true,
          therapist: { select: { id: true, userId: true, user: { select: { name: true } } } },
          startDateTime: true,
          duration: true,
          status: true,
          modality: true,
          rescheduledAt: true,
          cancelledBy: true,
          patientId: true,
          sessionType: { select: { name: true } },
        },
      }),
      this.prisma.child.count({ where: this.access.guardianChildrenWhere(actor.id) }),
    ]);

    // ── clinic links ──────────────────────────────────────────────────────────
    const facilityIds = new Set<string>();
    for (const c of cases) if (c.clinicId) facilityIds.add(c.clinicId);
    for (const a of affiliations) facilityIds.add(a.facilityId);
    for (const b of bookings) if (b.clinicId) facilityIds.add(b.clinicId);

    const facilities = facilityIds.size
      ? await this.prisma.facility.findMany({
          where: { id: { in: [...facilityIds] } },
          select: { id: true, name: true, address: true, phone: true, parentChangeWindowHours: true },
        })
      : [];
    const clinics = facilityIds.size
      ? await this.prisma.clinic.findMany({
          where: { id: { in: [...facilityIds] } },
          select: { id: true, name: true, address: true, city: true, phone: true },
        })
      : [];
    const facilityById = new Map(facilities.map((f) => [f.id, f]));
    const clinicById = new Map(clinics.map((c) => [c.id, c]));

    const links = new Map<string, ClinicLink>();
    const linkFor = (
      facilityId: string | null,
      therapist: { id: string; userId: string; user: { name: string | null } } | null,
      source: 'clinic' | 'upllyft',
    ): ClinicLink => {
      const key = facilityId ?? `t:${therapist?.id}`;
      let link = links.get(key);
      if (!link) {
        const f = facilityId ? facilityById.get(facilityId) : undefined;
        const cl = facilityId ? clinicById.get(facilityId) : undefined;
        link = {
          key,
          facilityId,
          name: f?.name ?? cl?.name ?? therapist?.user.name ?? 'Your therapist',
          area: cl?.city ?? f?.address ?? cl?.address ?? null,
          phone: f?.phone ?? cl?.phone ?? null,
          source,
          therapist: therapist
            ? { userId: therapist.userId, profileId: therapist.id, name: therapist.user.name ?? 'Your therapist' }
            : null,
          discipline: null,
          changeWindowHours: f?.parentChangeWindowHours ?? DEFAULT_WINDOW_HOURS,
          caseIds: [],
        };
        links.set(key, link);
      }
      if (source === 'clinic') link.source = 'clinic';
      if (!link.therapist && therapist) {
        link.therapist = { userId: therapist.userId, profileId: therapist.id, name: therapist.user.name ?? 'Your therapist' };
      }
      return link;
    };

    // A clinic case or a facility affiliation means the family came through the clinic;
    // an independent therapist's case (no clinic) started from an Upllyft booking.
    for (const c of cases) {
      const link = linkFor(c.clinicId, c.primaryTherapist, c.clinicId ? 'clinic' : 'upllyft');
      link.caseIds.push(c.id);
    }
    for (const a of affiliations) if (!links.has(a.facilityId)) linkFor(a.facilityId, null, 'clinic');
    for (const b of bookings) {
      const key = b.clinicId ?? `t:${b.therapistId}`;
      if (!links.has(key)) linkFor(b.clinicId, b.therapist, 'upllyft');
    }

    // ── sessions ──────────────────────────────────────────────────────────────
    const caseLink = new Map<string, ClinicLink>();
    for (const l of links.values()) for (const id of l.caseIds) caseLink.set(id, l);

    const therapistNames = new Map<string, string>();
    const sessions: any[] = [];
    for (const c of cases) {
      const link = caseLink.get(c.id)!;
      for (const s of c.sessions) {
        therapistNames.set(s.therapistId, s.therapist?.name ?? '');
        const status: PortalStatus =
          s.attendanceStatus === 'CANCELLED'
            ? 'cancelled'
            : s.attendanceStatus === 'NO_SHOW'
              ? 'missed'
              : s.scheduledAt < now && (s.noteStatus === 'SIGNED' || s.actualDuration)
                ? 'attended'
                : s.rescheduledAt
                  ? 'rescheduled'
                  : s.scheduledAt < now
                    ? 'attended'
                    : 'scheduled';
        if (!link.discipline && s.discipline) link.discipline = DISCIPLINE_LABEL[s.discipline] ?? null;
        sessions.push({
          id: `cs_${s.id}`,
          clinicKey: link.key,
          type: sessionKindOf(s.sessionType),
          title: s.sessionType || (s.discipline ? DISCIPLINE_LABEL[s.discipline] : null) || 'Therapy session',
          startAt: s.scheduledAt,
          mins: s.actualDuration ?? s.carePlan?.sessionDurationMin ?? 45,
          mode:
            s.booking?.modality === 'TELEHEALTH' || s.telehealthEncounter || isOnline(s.location, s.carePlan?.mode)
              ? 'online'
              : 'inperson',
          status,
          therapist: s.therapist?.name ?? link.therapist?.name ?? null,
          hasSummary: status === 'attended' && !!s.parentSummarySharedAt,
        });
      }
    }
    for (const b of bookings) {
      const link = links.get(b.clinicId ?? `t:${b.therapistId}`)!;
      const status: PortalStatus = CANCELLED_BOOKING.includes(b.status)
        ? 'cancelled'
        : b.status.startsWith('NO_SHOW')
          ? 'missed'
          : DONE_BOOKING.includes(b.status)
            ? 'attended'
            : b.rescheduledAt
              ? 'rescheduled'
              : 'scheduled';
      if (!LIVE_BOOKING.includes(b.status) && status === 'scheduled') continue; // pending payment etc.
      sessions.push({
        id: `bk_${b.id}`,
        clinicKey: link.key,
        type: sessionKindOf(b.sessionType?.name),
        title: b.sessionType?.name ?? 'Session',
        startAt: b.startDateTime,
        mins: b.duration,
        mode: b.modality === 'TELEHEALTH' ? 'online' : 'inperson',
        status,
        therapist: b.therapist?.user.name ?? null,
        hasSummary: false,
      });
    }
    sessions.sort((a, b) => +a.startAt - +b.startAt);

    // ── consents, per facility ────────────────────────────────────────────────
    const consentRows = facilityIds.size
      ? await this.prisma.childConsent.findMany({
          where: {
            childId,
            facilityId: { in: [...facilityIds] },
            revokedAt: null,
            validFrom: { lte: now },
            OR: [{ validUntil: null }, { validUntil: { gte: now } }],
          },
          select: { facilityId: true, type: true },
        })
      : [];
    const consentOn = (facilityId: string, type: ConsentType) =>
      consentRows.some((r) => r.facilityId === facilityId && r.type === type);
    // Per-clinic "Share reports with me". An independent therapist has no facility and so
    // no toggle: what they share with the parent is shown.
    const reportsAllowed = (link: ClinicLink | undefined) =>
      !!link && (!link.facilityId || consentOn(link.facilityId, ConsentType.REPORT_SHARING));

    // ── assessments & reports ─────────────────────────────────────────────────
    const assessments: any[] = [];
    for (const c of cases) {
      const link = caseLink.get(c.id)!;
      for (const r of c.assessmentReviews) {
        const toParent = !!(r.recipients as any)?.parent;
        const shared = r.phase === 'SHARED' && toParent;
        if (!r.meetingAt && !shared) continue;
        assessments.push({
          id: r.id,
          clinicKey: link.key,
          title:
            r.title ||
            (r.disciplines.length
              ? `${r.disciplines.map((d) => DISCIPLINE_LABEL[d.discipline] ?? d.discipline).join(' & ')} assessment`
              : 'Assessment'),
          at: r.meetingAt,
          upcoming: !!r.meetingAt && r.meetingAt > now,
          mode: r.syncMode === 'async' ? 'async' : null,
          therapist: link.therapist?.name ?? null,
          prep: r.parentPrep,
          // A shared report needs the parent's report-sharing consent for that clinic.
          reportShared: shared && reportsAllowed(link),
          reportWithheld: shared && !reportsAllowed(link),
          sharedAt: shared ? r.sharedAt : null,
        });
      }
    }
    assessments.sort((a, b) => +(b.at ?? b.sharedAt ?? 0) - +(a.at ?? a.sharedAt ?? 0));

    // Summaries also need report-sharing consent.
    for (const s of sessions) {
      if (s.hasSummary && !reportsAllowed(links.get(s.clinicKey))) s.hasSummary = false;
    }

    // ── home activities ───────────────────────────────────────────────────────
    const items = await this.prisma.childResource.findMany({
      where: { childId, source: 'ASSIGNED', unassignedAt: null },
      orderBy: { assignedAt: 'desc' },
      select: {
        id: true,
        kind: true,
        worksheetId: true,
        libraryResourceId: true,
        goal: true,
        parentNote: true,
        parentSeenAt: true,
        assignedAt: true,
        assignedArea: true,
        assignedById: true,
        assignedBy: { select: { name: true } },
        logs: { where: { date: { gte: addDays(startOfDay(now), -6) } }, select: { id: true }, take: 1 },
      },
    });
    const cards = await this.library.cardsFor(
      actor.id,
      items.map((i) => ({ kind: i.kind as 'WORKSHEET' | 'LIBRARY', id: (i.worksheetId ?? i.libraryResourceId)! })),
      true,
    );
    const linkOfTherapist = (userId: string | null) => {
      if (!userId) return null;
      for (const l of links.values()) if (l.therapist?.userId === userId) return l.key;
      for (const s of cases.flatMap((c) => c.sessions.map((x) => ({ c, x })))) {
        if (s.x.therapistId === userId) return caseLink.get(s.c.id)?.key ?? null;
      }
      return null;
    };
    const activities = items.map((i) => {
      const card = cards.get(`${i.kind}:${i.worksheetId ?? i.libraryResourceId}`);
      return {
        id: i.id,
        kind: i.kind,
        resourceId: i.worksheetId ?? i.libraryResourceId,
        clinicKey: linkOfTherapist(i.assignedById),
        title: card?.title ?? 'Activity',
        description: card?.description ?? null,
        type: card?.type ?? null,
        domain: i.assignedArea ?? card?.domains?.[0] ?? null,
        minutes: card?.durationMinutes ?? null,
        note: i.parentNote ?? i.goal,
        therapist: i.assignedBy?.name ?? null,
        sharedAt: i.assignedAt,
        isNew: !i.parentSeenAt,
        triedThisWeek: i.logs.length > 0,
        openUrl: i.kind === 'WORKSHEET' ? `/resources/${i.worksheetId}` : (card?.fileUrl ?? null),
      };
    });

    // ── per-clinic cards: care team, intake, consent ──────────────────────────
    const clinicCards = [...links.values()].map((l, index) => {
      const linkCases = cases.filter((c) => l.caseIds.includes(c.id));
      const plan = linkCases.flatMap((c) => c.carePlans)[0] ?? null;
      const done = plan
        ? plan.sessions.filter((s) => s.scheduledAt < now && s.attendanceStatus !== 'CANCELLED' && s.attendanceStatus !== 'NO_SHOW').length
        : 0;
      const intakeCase = linkCases.find((c) => c.status === 'ACTIVE' || c.status === 'ON_HOLD') ?? linkCases[0];
      const intake = intakeCase
        ? {
            caseId: intakeCase.id,
            status: !intakeCase.intake
              ? 'NOT_STARTED'
              : intakeCase.intake.state === IntakeState.SUMMARISED
                ? 'REVIEWED'
                : 'SUBMITTED',
            submittedAt: intakeCase.intake?.updatedAt ?? null,
            reviewedAt: intakeCase.intake?.summarisedAt ?? null,
            due: sessions.find((s) => s.clinicKey === l.key && s.startAt > now && s.status !== 'cancelled')?.startAt ?? null,
          }
        : null;
      const discipline =
        l.discipline ??
        (plan?.disciplines?.[0] ? DISCIPLINE_LABEL[plan.disciplines[0]] : null) ??
        null;
      return {
        key: l.key,
        facilityId: l.facilityId,
        name: l.name,
        short: shortClinicName(l.name),
        initials: initials(l.name),
        colorIndex: index,
        area: l.area,
        phone: l.phone,
        source: l.source,
        therapist: l.therapist?.name ?? null,
        therapistUserId: l.therapist?.userId ?? null,
        discipline,
        changeWindowHours: l.changeWindowHours,
        plan: plan
          ? {
              label: [discipline, plan.mode].filter(Boolean).join(' · ') || 'Care plan',
              done: Math.min(done, plan.sessionCount),
              total: plan.sessionCount,
            }
          : null,
        intake,
        consents: l.facilityId
          ? Object.fromEntries(PORTAL_CONSENTS.map((c) => [c.key, consentOn(l.facilityId!, c.type)]))
          : null,
      };
    });

    return {
      child: { id: child.id, firstName: child.firstName, dateOfBirth: child.dateOfBirth },
      multipleChildren: childCount > 1,
      clinics: clinicCards,
      sessions,
      assessments,
      activities,
      cancelReasons: CANCEL_REASONS,
      now,
    };
  }

  // ═══ Sessions ═══════════════════════════════════════════════════════════════

  /** Resolve a portal session id to its record, checking the actor is the child's guardian. */
  private async loadSession(actor: Actor, childId: string, portalId: string) {
    await this.access.assertGuardian(actor.id, childId);
    const [kind, id] = portalId.split('_') as [string, string];
    if (kind === 'cs' && id) {
      const s = await this.prisma.caseSession.findUnique({
        where: { id },
        select: {
          id: true,
          caseId: true,
          therapistId: true,
          scheduledAt: true,
          actualDuration: true,
          sessionType: true,
          location: true,
          attendanceStatus: true,
          bookingId: true,
          booking: { select: { id: true, modality: true, status: true, paymentStatus: true, stripePaymentIntentId: true } },
          telehealthEncounter: { select: { id: true } },
          carePlan: { select: { sessionDurationMin: true, mode: true } },
          case: { select: { childId: true, clinicId: true, caseNumber: true } },
        },
      });
      if (!s || s.case.childId !== childId) throw new NotFoundException('Session not found.');
      const profile = await this.prisma.therapistProfile.findUnique({
        where: { userId: s.therapistId },
        select: { id: true, defaultTimezone: true },
      });
      return {
        kind: 'case' as SessionKind,
        id: s.id,
        caseId: s.caseId,
        facilityId: s.case.clinicId,
        therapistUserId: s.therapistId,
        therapistProfileId: profile?.id ?? null,
        timezone: profile?.defaultTimezone ?? 'Asia/Kolkata',
        startAt: s.scheduledAt,
        mins: s.actualDuration ?? s.carePlan?.sessionDurationMin ?? 45,
        online:
          s.booking?.modality === 'TELEHEALTH' || !!s.telehealthEncounter || isOnline(s.location, s.carePlan?.mode),
        cancelled: s.attendanceStatus === 'CANCELLED',
        booking: s.booking,
        title: s.sessionType ?? 'Session',
      };
    }
    if (kind === 'bk' && id) {
      const b = await this.prisma.booking.findUnique({
        where: { id },
        select: {
          id: true,
          childId: true,
          clinicId: true,
          therapistId: true,
          therapist: { select: { userId: true, defaultTimezone: true } },
          startDateTime: true,
          duration: true,
          modality: true,
          status: true,
          paymentStatus: true,
          stripePaymentIntentId: true,
          sessionType: { select: { name: true } },
        },
      });
      if (!b || b.childId !== childId) throw new NotFoundException('Session not found.');
      return {
        kind: 'booking' as SessionKind,
        id: b.id,
        caseId: null as string | null,
        facilityId: b.clinicId,
        therapistUserId: b.therapist.userId,
        therapistProfileId: b.therapistId,
        timezone: b.therapist.defaultTimezone,
        startAt: b.startDateTime,
        mins: b.duration,
        online: b.modality === 'TELEHEALTH',
        cancelled: CANCELLED_BOOKING.includes(b.status),
        booking: b,
        title: b.sessionType?.name ?? 'Session',
      };
    }
    throw new NotFoundException('Session not found.');
  }

  private async windowHours(facilityId: string | null) {
    if (!facilityId) return DEFAULT_WINDOW_HOURS;
    const f = await this.prisma.facility.findUnique({
      where: { id: facilityId },
      select: { parentChangeWindowHours: true },
    });
    return f?.parentChangeWindowHours ?? DEFAULT_WINDOW_HOURS;
  }

  /** Throws unless the session is upcoming, live, and outside the clinic's change window. */
  private async assertChangeable(s: Awaited<ReturnType<ClinicPortalService['loadSession']>>) {
    if (s.cancelled) throw new BadRequestException('This session is already cancelled.');
    const hours = (s.startAt.getTime() - Date.now()) / 3_600_000;
    if (hours <= 0) throw new BadRequestException('This session has already started.');
    const win = await this.windowHours(s.facilityId);
    if (hours < win) {
      throw new BadRequestException(
        `This session is less than ${win} hours away. Please call the clinic to change it.`,
      );
    }
    if (s.online && s.facilityId && !(await hasConsent(this.prisma, await this.childOf(s), s.facilityId, ConsentType.TELEHEALTH))) {
      throw new BadRequestException(
        'This is an online session and online/video consent is off for this clinic. Turn it on, or call the clinic.',
      );
    }
  }

  private async childOf(s: { kind: SessionKind; id: string; caseId: string | null }) {
    if (s.caseId) {
      const c = await this.prisma.case.findUnique({ where: { id: s.caseId }, select: { childId: true } });
      return c!.childId;
    }
    const b = await this.prisma.booking.findUnique({ where: { id: s.id }, select: { childId: true } });
    return b!.childId!;
  }

  /**
   * The therapist's open times for the next two weeks (up to four days with any
   * availability), in the session's duration. Uses the marketplace slot engine
   * (weekly hours, leave/blocked exceptions, booked Bookings) and then removes clinic
   * sessions that have no Booking row — those occupy the therapist too — and anything
   * inside the change window. Taken slots are returned struck through, as in the design.
   */
  async slots(
    actor: Actor,
    childId: string,
    portalId: string,
  ): Promise<{ days: Array<{ date: string; slots: Array<{ start: string; available: boolean }> }>; windowHours?: number; reason?: string }> {
    const s = await this.loadSession(actor, childId, portalId);
    if (!s.therapistProfileId) return { days: [], reason: 'This therapist has no online availability. Please call the clinic.' };
    const win = await this.windowHours(s.facilityId);
    const earliest = Date.now() + win * 3_600_000;
    const from = startOfDay(addDays(new Date(), 1));
    const to = addDays(from, SLOT_DAYS);

    const busy = await this.prisma.caseSession.findMany({
      where: {
        therapistId: s.therapistUserId,
        scheduledAt: { gte: from, lt: addDays(to, 1) },
        attendanceStatus: { not: 'CANCELLED' },
        bookingId: null,
        NOT: s.kind === 'case' ? { id: s.id } : undefined,
      },
      select: { scheduledAt: true, actualDuration: true },
    });
    const overlapsBusy = (start: Date, end: Date) =>
      busy.some((b) => {
        const bEnd = addMinutes(b.scheduledAt, b.actualDuration ?? 45);
        return start < bEnd && end > b.scheduledAt;
      });

    const days: Array<{ date: string; slots: Array<{ start: string; available: boolean }> }> = [];
    for (let i = 0; i < SLOT_DAYS && days.length < SLOT_MAX_DAYS_SHOWN; i++) {
      const date = addDays(from, i);
      const raw = await this.availability.getAvailableSlots(s.therapistProfileId, date, s.mins, s.timezone);
      if (!raw.length) continue;
      const slots = raw.map((r) => {
        const start = new Date(r.startTime);
        const end = new Date(r.endTime);
        const available = start.getTime() >= earliest && !overlapsBusy(start, end) && start.getTime() !== s.startAt.getTime();
        return { start: start.toISOString(), available };
      });
      days.push({ date: date.toISOString(), slots });
    }
    return { days, windowHours: win };
  }

  async reschedule(actor: Actor, childId: string, portalId: string, startAtRaw: unknown) {
    const s = await this.loadSession(actor, childId, portalId);
    await this.assertChangeable(s);
    const startAt = new Date(String(startAtRaw ?? ''));
    if (Number.isNaN(startAt.getTime())) throw new BadRequestException('Pick a new time.');

    // Re-validate against live availability: someone else may have taken it.
    const open = await this.slots(actor, childId, portalId);
    const ok = open.days.some((d) => d.slots.some((x) => x.available && x.start === startAt.toISOString()));
    if (!ok) {
      const next = open.days.flatMap((d) => d.slots.filter((x) => x.available).map((x) => x.start)).slice(0, 3);
      throw new BadRequestException({ message: 'That time was just taken. Please pick another.', nextFree: next });
    }

    const endAt = addMinutes(startAt, s.mins);
    const from = s.startAt;
    if (s.kind === 'case') {
      await this.prisma.$transaction([
        this.prisma.caseSession.update({
          where: { id: s.id },
          data: { scheduledAt: startAt, rescheduledAt: new Date(), rescheduledBy: 'PARENT' },
        }),
        ...(s.booking
          ? [
              this.prisma.booking.update({
                where: { id: s.booking.id },
                data: { startDateTime: startAt, endDateTime: endAt, rescheduledAt: new Date() },
              }),
            ]
          : []),
        this.prisma.caseAuditLog.create({
          data: {
            caseId: s.caseId!,
            userId: actor.id,
            action: 'SESSION_RESCHEDULED_BY_PARENT',
            entityType: 'CaseSession',
            entityId: s.id,
            changes: { from: from.toISOString(), to: startAt.toISOString() },
          },
        }),
      ]);
    } else {
      await this.prisma.booking.update({
        where: { id: s.id },
        data: { startDateTime: startAt, endDateTime: endAt, rescheduledAt: new Date() },
      });
      await this.audit.log({
        userId: actor.id,
        resourceType: 'booking',
        resourceId: s.id,
        action: 'SESSION_RESCHEDULED_BY_PARENT',
        metadata: { from: from.toISOString(), to: startAt.toISOString() },
      });
    }

    await this.notifyCareTeam(s, {
      type: NotificationType.SESSION_RESCHEDULED,
      title: 'Session moved by parent',
      message: `${await this.childName(childId)}'s ${s.title} moved from ${this.fmt(from, s.timezone)} to ${this.fmt(startAt, s.timezone)}.`,
    });
    return { startAt, status: 'rescheduled' };
  }

  async cancel(actor: Actor, childId: string, portalId: string, reasonRaw: unknown) {
    const s = await this.loadSession(actor, childId, portalId);
    await this.assertChangeable(s);
    const reason = String(reasonRaw ?? '');
    if (!(CANCEL_REASONS as readonly string[]).includes(reason)) {
      throw new BadRequestException('Choose a reason for cancelling.');
    }
    const now = new Date();

    // A paid Upllyft booking goes through the refund policy, which also sets its status.
    const booking = s.booking as { id: string; status: string; paymentStatus?: string; stripePaymentIntentId?: string | null } | null;
    if (booking && booking.stripePaymentIntentId && booking.paymentStatus === 'COMPLETED') {
      await this.prisma.booking.update({ where: { id: booking.id }, data: { cancelledBy: actor.id } });
      await this.payments.processCancellationRefund(booking.id, actor.id);
    }

    if (s.kind === 'case') {
      await this.prisma.$transaction([
        this.prisma.caseSession.update({
          where: { id: s.id },
          data: { attendanceStatus: 'CANCELLED', cancelledBy: 'PARENT', cancelledAt: now, cancellationReason: reason },
        }),
        ...(booking
          ? [
              this.prisma.booking.update({
                where: { id: booking.id },
                data: {
                  status: 'CANCELLED_BY_PATIENT',
                  cancelledBy: actor.id,
                  cancelledAt: now,
                  cancellationReason: reason,
                  trackingStatus: 'CANCELLED',
                },
              }),
            ]
          : []),
        this.prisma.caseAuditLog.create({
          data: {
            caseId: s.caseId!,
            userId: actor.id,
            action: 'SESSION_CANCELLED_BY_PARENT',
            entityType: 'CaseSession',
            entityId: s.id,
            changes: { scheduledAt: s.startAt.toISOString(), reason },
          },
        }),
      ]);
    } else {
      await this.prisma.booking.update({
        where: { id: s.id },
        data: { status: 'CANCELLED_BY_PATIENT', cancelledBy: actor.id, cancelledAt: now, cancellationReason: reason },
      });
      await this.audit.log({
        userId: actor.id,
        resourceType: 'booking',
        resourceId: s.id,
        action: 'SESSION_CANCELLED_BY_PARENT',
        metadata: { scheduledAt: s.startAt.toISOString(), reason },
      });
    }

    await this.notifyCareTeam(s, {
      type: NotificationType.SESSION_CANCELLED,
      title: 'Session cancelled by parent',
      message: `${await this.childName(childId)}'s ${s.title} on ${this.fmt(s.startAt, s.timezone)} was cancelled. Reason: ${reason}.`,
    });
    return { status: 'cancelled' };
  }

  // ═══ Reports & summaries ════════════════════════════════════════════════════

  async report(actor: Actor, childId: string, reviewId: string) {
    await this.access.assertGuardian(actor.id, childId);
    const r = await this.prisma.assessmentReview.findUnique({
      where: { id: reviewId },
      select: {
        id: true,
        title: true,
        phase: true,
        recipients: true,
        sharedAt: true,
        reportText: true,
        reportDocumentId: true,
        parentViewedAt: true,
        caseId: true,
        case: {
          select: { childId: true, clinicId: true, primaryTherapist: { select: { userId: true, user: { select: { name: true } } } } },
        },
      },
    });
    if (!r || r.case.childId !== childId || r.phase !== 'SHARED' || !(r.recipients as any)?.parent) {
      throw new NotFoundException('Report not found.');
    }
    await this.assertReportConsent(childId, r.case.clinicId);

    if (!r.parentViewedAt) {
      await this.prisma.assessmentReview.update({ where: { id: r.id }, data: { parentViewedAt: new Date() } });
      await this.prisma.caseAuditLog.create({
        data: { caseId: r.caseId, userId: actor.id, action: 'REPORT_VIEWED_BY_PARENT', entityType: 'AssessmentReview', entityId: r.id },
      });
    }
    const doc = r.reportDocumentId
      ? await this.prisma.caseDocument.findUnique({
          where: { id: r.reportDocumentId },
          select: { fileUrl: true, parentVersion: { select: { fileUrl: true, content: true } } },
        })
      : null;
    return {
      id: r.id,
      title: r.title || 'Assessment report',
      sharedAt: r.sharedAt,
      therapist: r.case.primaryTherapist?.user.name ?? null,
      // The parent-audience version wins over the professional one when there is one.
      text: doc?.parentVersion?.content || r.reportText || '',
      fileUrl: doc?.parentVersion?.fileUrl ?? doc?.fileUrl ?? null,
    };
  }

  async summary(actor: Actor, childId: string, portalId: string) {
    await this.access.assertGuardian(actor.id, childId);
    const id = portalId.startsWith('cs_') ? portalId.slice(3) : '';
    const s = id
      ? await this.prisma.caseSession.findUnique({
          where: { id },
          select: {
            id: true,
            caseId: true,
            scheduledAt: true,
            sessionType: true,
            parentSummary: true,
            parentSummarySharedAt: true,
            parentViewedAt: true,
            therapist: { select: { name: true } },
            case: { select: { childId: true, clinicId: true } },
          },
        })
      : null;
    if (!s || s.case.childId !== childId || !s.parentSummarySharedAt) throw new NotFoundException('Summary not found.');
    await this.assertReportConsent(childId, s.case.clinicId);
    if (!s.parentViewedAt) {
      await this.prisma.caseSession.update({ where: { id: s.id }, data: { parentViewedAt: new Date() } });
    }
    return {
      title: s.sessionType ?? 'Session',
      at: s.scheduledAt,
      therapist: s.therapist?.name ?? null,
      summary: s.parentSummary ?? {},
      sharedAt: s.parentSummarySharedAt,
    };
  }

  private async assertReportConsent(childId: string, facilityId: string | null) {
    if (facilityId && !(await hasConsent(this.prisma, childId, facilityId, ConsentType.REPORT_SHARING))) {
      throw new ForbiddenException(
        'Turn on "Share reports with me" for this clinic under Forms & consent to read reports.',
      );
    }
  }

  // ═══ Home activities ════════════════════════════════════════════════════════

  async markSeen(actor: Actor, childId: string, itemId: string) {
    await this.access.assertGuardian(actor.id, childId);
    const res = await this.prisma.childResource.updateMany({
      where: { id: itemId, childId, parentSeenAt: null },
      data: { parentSeenAt: new Date() },
    });
    return { updated: res.count };
  }

  // ═══ Consent ════════════════════════════════════════════════════════════════

  async setConsent(actor: Actor, childId: string, facilityId: string, keyRaw: unknown, valueRaw: unknown) {
    const child = await this.access.assertGuardian(actor.id, childId);
    const def = PORTAL_CONSENTS.find((c) => c.key === keyRaw);
    if (!def) throw new BadRequestException('Unknown consent.');
    const value = valueRaw === true;

    const linked = await this.prisma.childAffiliation.count({ where: { childId, facilityId, endedAt: null } });
    const viaCase = await this.prisma.case.findMany({
      where: { childId, clinicId: facilityId, status: OPEN_CASE },
      select: { id: true },
    });
    const viaBooking = await this.prisma.booking.count({ where: { childId, clinicId: facilityId } });
    if (!linked && !viaCase.length && !viaBooking) throw new NotFoundException('This clinic is not linked to your child.');

    const before = await hasConsent(this.prisma, childId, facilityId, def.type);
    if (before === value) return { key: def.key, value };

    if (value) {
      await grantConsent(this.prisma, {
        childId,
        facilityId,
        type: def.type,
        purpose: 'Set by the parent in the Clinic Portal',
        grantedByUserId: actor.id,
        caseId: viaCase[0]?.id ?? null,
      });
    } else {
      await revokeConsent(this.prisma, childId, facilityId, def.type);
    }

    // Keep the case-keyed mirror and the intake's Section E in step, so the clinic's
    // intake tab and the case consent list show what the parent just chose.
    for (const c of viaCase) {
      if (value) {
        const existing = await this.prisma.caseConsent.findFirst({ where: { caseId: c.id, type: def.type, revokedAt: null } });
        if (!existing) {
          await this.prisma.caseConsent.create({
            data: { caseId: c.id, type: def.type, grantedById: actor.id, purpose: 'Set by the parent in the Clinic Portal' },
          });
        }
      } else {
        await this.prisma.caseConsent.updateMany({
          where: { caseId: c.id, type: def.type, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      await this.prisma.caseIntake.updateMany({ where: { caseId: c.id }, data: { [def.intake]: value } });
      await this.prisma.caseAuditLog.create({
        data: {
          caseId: c.id,
          userId: actor.id,
          action: value ? 'CONSENT_GRANTED_BY_PARENT' : 'CONSENT_REVOKED_BY_PARENT',
          entityType: 'ChildConsent',
          entityId: facilityId,
          changes: { type: def.type, old: before, new: value },
        },
      });
    }
    await this.audit.log({
      userId: actor.id,
      resourceType: 'child_consent',
      resourceId: childId,
      action: value ? 'CONSENT_GRANTED' : 'CONSENT_REVOKED',
      metadata: { facilityId, type: def.type, old: before, new: value, via: 'clinic-portal' },
    });

    const label = {
      assessment: 'assessment',
      therapy: 'therapy sessions',
      reports: 'sharing reports with the parent',
      tele: 'online / video sessions',
      media: 'photos & video for progress',
      ai: 'AI-assisted note drafting',
    }[def.key];
    await this.notifyFacility(facilityId, viaCase[0]?.id ?? null, {
      type: NotificationType.CONSENT_CHANGED,
      title: 'Consent updated by parent',
      message: `${child.firstName}'s parent ${value ? 'gave' : 'withdrew'} consent for ${label}.`,
    });
    return { key: def.key, value };
  }

  // ═══ Intake ═════════════════════════════════════════════════════════════════

  async intake(actor: Actor, childId: string, caseId: string) {
    const child = await this.access.assertGuardian(actor.id, childId);
    const c = await this.prisma.case.findUnique({
      where: { id: caseId },
      select: { childId: true, clinicId: true, intake: true, clinic: { select: { name: true } } },
    });
    if (!c || c.childId !== childId) throw new NotFoundException('Intake not found.');

    // Offer — never apply — the most recent intake given to another clinic.
    const other = c.intake
      ? null
      : await this.prisma.caseIntake.findFirst({
          where: { case: { childId, id: { not: caseId } } },
          orderBy: { updatedAt: 'desc' },
          select: {
            data: true,
            presentingConcern: true,
            referralQuestions: true,
            parentGoals: true,
            case: { select: { clinic: { select: { name: true } } } },
          },
        });
    return {
      child: { firstName: child.firstName, dateOfBirth: child.dateOfBirth },
      clinicName: c.clinic?.name ?? null,
      intake: c.intake,
      prefill: other
        ? {
            fromClinic: other.case.clinic?.name ?? 'your previous clinic',
            data: other.data,
            presentingConcern: other.presentingConcern,
            referralQuestions: other.referralQuestions,
            parentGoals: other.parentGoals,
          }
        : null,
    };
  }

  /** Same landing as the public intake link: a DRAFT on the case for the clinician to review. */
  async submitIntake(actor: Actor, childId: string, caseId: string, dto: any) {
    const child = await this.access.assertGuardian(actor.id, childId);
    const c = await this.prisma.case.findUnique({
      where: { id: caseId },
      select: { childId: true, clinicId: true, intake: { select: { state: true } }, primaryTherapist: { select: { userId: true } } },
    });
    if (!c || c.childId !== childId) throw new NotFoundException('Intake not found.');
    if (c.intake?.state === IntakeState.SUMMARISED) {
      throw new BadRequestException('The clinic has already reviewed this intake. Contact them to change it.');
    }
    const base = {
      state: IntakeState.DRAFT,
      data: (dto?.data ?? {}) as Prisma.InputJsonValue,
      presentingConcern: typeof dto?.presentingConcern === 'string' ? dto.presentingConcern : undefined,
      referralQuestions: Array.isArray(dto?.referralQuestions) ? dto.referralQuestions.map(String) : [],
      parentGoals: Array.isArray(dto?.parentGoals) ? dto.parentGoals.map(String) : [],
      consentAssessment: !!dto?.consentAssessment,
      consentTherapy: !!dto?.consentTherapy,
      consentSharing: !!dto?.consentSharing,
      consentAi: !!dto?.consentAi,
      consentTelehealth: !!dto?.consentTelehealth,
      consentMedia: !!dto?.consentMedia,
      recordedBy: 'PARENT_PORTAL',
    };
    const record = await this.prisma.caseIntake.upsert({
      where: { caseId },
      create: { caseId, createdById: c.primaryTherapist.userId, ...base },
      update: base,
    });
    await this.prisma.caseAuditLog.create({
      data: { caseId, userId: actor.id, action: 'INTAKE_SUBMITTED_BY_PARENT', entityType: 'CaseIntake', entityId: record.id },
    });
    await this.notifyFacility(c.clinicId, caseId, {
      type: NotificationType.INTAKE_NEW,
      title: 'Intake form submitted',
      message: `${child.firstName}'s parent submitted the intake form. It is ready to review.`,
      therapistUserId: c.primaryTherapist.userId,
    });
    return { submitted: true };
  }

  // ═══ Notifications ══════════════════════════════════════════════════════════

  private async childName(childId: string) {
    const c = await this.prisma.child.findUnique({ where: { id: childId }, select: { firstName: true } });
    return c?.firstName ?? 'Your client';
  }

  private fmt(d: Date, tz: string) {
    try {
      return d.toLocaleString('en-GB', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
    } catch {
      return d.toISOString();
    }
  }

  private async notifyCareTeam(
    s: { therapistUserId: string; facilityId: string | null; caseId: string | null; kind: SessionKind; id: string },
    n: { type: NotificationType; title: string; message: string },
  ) {
    await this.notifyFacility(s.facilityId, s.caseId, {
      ...n,
      therapistUserId: s.therapistUserId,
      therapistUrl: s.caseId ? `/cases/${s.caseId}/sessions` : `/booking/bookings/${s.id}`,
    });
  }

  /**
   * The therapist plus whoever runs the clinic's front desk: owners, admins and
   * reception on the facility, and the legacy Clinic.adminId. Best-effort — a failed
   * notification never undoes the parent's change.
   */
  private async notifyFacility(
    facilityId: string | null,
    caseId: string | null,
    n: { type: NotificationType; title: string; message: string; therapistUserId?: string; therapistUrl?: string },
  ) {
    try {
      const recipients = new Map<string, string>();
      if (n.therapistUserId) {
        recipients.set(n.therapistUserId, n.therapistUrl ?? (caseId ? `/cases/${caseId}` : '/booking/bookings'));
      } else if (caseId) {
        const c = await this.prisma.case.findUnique({ where: { id: caseId }, select: { primaryTherapist: { select: { userId: true } } } });
        if (c) recipients.set(c.primaryTherapist.userId, `/cases/${caseId}`);
      }
      if (facilityId) {
        const [members, clinic] = await Promise.all([
          this.prisma.facilityMember.findMany({
            where: { facilityId, status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN', 'RECEPTION'] } },
            select: { userId: true },
          }),
          this.prisma.clinic.findUnique({ where: { id: facilityId }, select: { adminId: true } }),
        ]);
        const adminUrl = caseId ? `/cases/${caseId}` : '/clinic';
        for (const m of members) if (!recipients.has(m.userId)) recipients.set(m.userId, adminUrl);
        if (clinic && !recipients.has(clinic.adminId)) recipients.set(clinic.adminId, adminUrl);
      }
      await Promise.all(
        [...recipients].map(([userId, actionUrl]) =>
          this.notifications.createNotification({
            userId,
            type: n.type,
            title: n.title,
            message: n.message,
            actionUrl,
            relatedEntityId: caseId ?? undefined,
            relatedEntityType: caseId ? 'case' : undefined,
            priority: 'high',
          }),
        ),
      );
    } catch (e: any) {
      this.logger.error(`Clinic Portal notification failed: ${e?.message}`);
    }
  }
}
