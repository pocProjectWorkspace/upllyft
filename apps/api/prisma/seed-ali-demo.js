// Demo seed for ali.ahmed@starwalkers.com — adds cases/sessions/goals/IEPs/milestones/
// consents/billing/invoices/audit-logs so he has full data to walk through in a demo.
// Idempotent per-case: will not duplicate data on re-run.
//
// Run from apps/api with: node seed-ali-demo.js

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const daysAgo = (n) => new Date(Date.now() - n * 86400000);
const daysFromNow = (n) => new Date(Date.now() + n * 86400000);

async function main() {
  const ali = await p.user.findUnique({
    where: { email: 'ali.ahmed@starwalkers.com' },
    select: { id: true, name: true, therapistProfile: { select: { id: true, clinicId: true } } },
  });
  if (!ali || !ali.therapistProfile) throw new Error('Ali not found / no therapist profile');
  const aliUserId = ali.id;
  const aliProfileId = ali.therapistProfile.id;
  const clinicId = ali.therapistProfile.clinicId;
  const clinic = await p.clinic.findUnique({ where: { id: clinicId }, select: { organizationId: true, name: true } });
  const orgId = clinic?.organizationId;
  const clinicName = clinic?.name || 'Starwalkers - Dubai';
  console.log('Ali:', aliUserId, 'profile:', aliProfileId, 'clinic:', clinicId, 'org:', orgId);

  const cases = await p.case.findMany({
    where: { primaryTherapistId: aliProfileId },
    include: {
      child: { include: { profile: { include: { user: true } } } },
      ieps: { include: { goals: true } },
      sessions: { orderBy: { scheduledAt: 'desc' } },
      milestonePlans: { include: { milestones: true } },
      consents: true,
      billingRecords: true,
      auditLogs: true,
    },
  });

  for (const c of cases) {
    console.log(`\n=== ${c.caseNumber} (${c.child?.firstName}) ===`);
    const parent = c.child?.profile?.user;
    if (!parent) { console.log('  no parent, skip'); continue; }

    // 1. Ensure clinic/org link
    if (!c.clinicId || !c.organizationId) {
      await p.case.update({
        where: { id: c.id },
        data: { clinicId: clinicId, organizationId: orgId },
      });
      console.log('  linked to clinic+org');
    }

    // 2. Ensure diagnosis (for empty shells)
    if (!c.diagnosis) {
      const dx = c.caseNumber.includes('HAL')
        ? 'Fine motor delay with sensory processing concerns'
        : c.caseNumber.includes('NOM') || c.caseNumber.includes('CM-')
        ? 'Developmental coordination disorder (suspected)'
        : null;
      if (dx) {
        await p.case.update({ where: { id: c.id }, data: { diagnosis: dx } });
        console.log('  set diagnosis:', dx);
      }
    }

    // 3. Ensure IEP + goals
    let ieps = c.ieps;
    if (ieps.length === 0) {
      const iep = await p.iEP.create({
        data: {
          caseId: c.id,
          createdById: aliUserId,
          status: 'ACTIVE',
          reviewDate: daysFromNow(180),
          accommodations: {
            environment: 'Low-sensory room with dim lighting',
            supports: ['Weighted lap pad', 'Noise-canceling headphones', 'Visual schedule'],
          },
        },
      });
      const goals = [
        { domain: 'SENSORY', goalText: 'Child will tolerate 10 min of tactile play with varied textures in 4/5 sessions.', progress: 0.4, status: 'IN_PROGRESS', order: 1 },
        { domain: 'MOTOR', goalText: 'Child will demonstrate correct tripod pencil grasp in 80% of fine motor tasks.', progress: 0.25, status: 'IN_PROGRESS', order: 2 },
        { domain: 'ADAPTIVE', goalText: 'Child will independently complete hand-washing sequence (5 steps) in 3 consecutive sessions.', progress: 0.6, status: 'IN_PROGRESS', order: 3 },
      ];
      for (const g of goals) {
        await p.iEPGoal.create({
          data: {
            iepId: iep.id,
            domain: g.domain,
            goalText: g.goalText,
            targetDate: daysFromNow(90),
            currentProgress: g.progress,
            status: g.status,
            order: g.order,
          },
        });
      }
      console.log('  created IEP with', goals.length, 'goals');
      ieps = [await p.iEP.findUnique({ where: { id: iep.id }, include: { goals: true } })];
    }

    // 4. Ensure milestone plan + milestones
    if (c.milestonePlans.length === 0) {
      const plan = await p.milestonePlan.create({
        data: { caseId: c.id, version: 1, status: 'active', sharedWithParent: true },
      });
      const miles = [
        { domain: 'MOTOR', description: 'Uses scissors to cut along a straight line', expected: '4-5 years', status: 'EMERGING', order: 0 },
        { domain: 'SENSORY', description: 'Tolerates brushing protocol without distress', expected: '3-5 years', status: 'ACHIEVED', achieved: daysAgo(30), order: 1 },
        { domain: 'ADAPTIVE', description: 'Dresses self with minimal prompts', expected: '4-5 years', status: 'ON_TRACK', order: 2 },
        { domain: 'COMMUNICATION', description: 'Uses functional 3-4 word sentences', expected: '3-4 years', status: 'DELAYED', order: 3 },
      ];
      for (const m of miles) {
        await p.milestone.create({
          data: {
            planId: plan.id,
            domain: m.domain,
            description: m.description,
            expectedAge: m.expected,
            status: m.status,
            achievedAt: m.achieved || null,
            order: m.order,
          },
        });
      }
      console.log('  created milestone plan with', miles.length, 'milestones');
    }

    // 5. Ensure sessions
    let sessions = c.sessions;
    if (sessions.length === 0) {
      const iep = await p.iEP.findFirst({ where: { caseId: c.id }, include: { goals: true } });
      const sessData = [
        { daysAgo: 28, duration: 60, status: 'SIGNED', notes: {
          subjective: 'Parent reports continued sensory seeking at home, improved tolerance of tooth-brushing.',
          objective: 'Child engaged in 12 min of tactile play. Used pincer grasp on small beads with 70% accuracy.',
          assessment: 'Progress in tactile tolerance. Fine motor grasp needs continued practice with adaptive grips.',
          plan: 'Continue sensory diet, add adaptive pencil grip for home use.',
        } },
        { daysAgo: 21, duration: 60, status: 'SIGNED', notes: {
          subjective: 'Parent notes child sat through dinner for 10 min.',
          objective: 'Completed 4/5 steps of hand-washing with single verbal prompt.',
          assessment: 'Steady gains in adaptive self-care. Sensory regulation improving.',
          plan: 'Introduce visual schedule for morning routine.',
        } },
        { daysAgo: 14, duration: 60, status: 'SIGNED', notes: {
          subjective: 'Minor regression reported — busy school week.',
          objective: 'Tolerated 8 min tactile play (vs 12 prior). Grip improved to 75%.',
          assessment: 'Mild regression likely tied to sleep disruption. Fine motor trending up.',
          plan: 'Review sleep hygiene strategies with parent next session.',
        } },
        { daysAgo: 7, duration: 60, status: 'SIGNED', notes: {
          subjective: 'Parent reports better sleep this week.',
          objective: 'Strong session: 15 min tactile, pincer grasp at 85%, independent hand-washing 4/5 steps.',
          assessment: 'Back on trajectory. Ready to progress toward shoe-tying introduction.',
          plan: 'Introduce lacing card activities.',
        } },
        { daysAgo: 0, duration: 60, status: 'DRAFT', notes: null },
      ];
      for (const s of sessData) {
        await p.caseSession.create({
          data: {
            caseId: c.id,
            therapistId: aliUserId,
            scheduledAt: daysAgo(s.daysAgo),
            actualDuration: s.duration,
            attendanceStatus: 'PRESENT',
            sessionType: 'Occupational Therapy',
            location: clinicName,
            noteFormat: s.notes ? 'SOAP' : null,
            noteStatus: s.status,
            signedAt: s.status === 'SIGNED' ? daysAgo(s.daysAgo - 1) : null,
            structuredNotes: s.notes || undefined,
          },
        });
      }
      console.log('  created', sessData.length, 'sessions');
      sessions = await p.caseSession.findMany({ where: { caseId: c.id }, orderBy: { scheduledAt: 'desc' } });
    }

    // 6. Ensure consents
    if (c.consents.length === 0) {
      await p.caseConsent.createMany({
        data: [
          {
            caseId: c.id,
            type: 'TREATMENT',
            grantedById: parent.id,
            validFrom: daysAgo(60),
            validUntil: daysFromNow(305),
            notes: 'Consent for occupational therapy services including sensory integration interventions.',
          },
          {
            caseId: c.id,
            type: 'SHARING',
            grantedById: parent.id,
            validFrom: daysAgo(60),
            validUntil: daysFromNow(305),
            notes: 'Consent to share progress reports with school and referring pediatrician.',
          },
        ],
      });
      console.log('  created 2 consents');
    }

    // 7. Ensure billing records (link to sessions that don't have billing yet)
    const sessWithoutBilling = await p.caseSession.findMany({
      where: { caseId: c.id, billing: null },
      orderBy: { scheduledAt: 'desc' },
      take: 4,
    });
    for (let i = 0; i < sessWithoutBilling.length; i++) {
      const s = sessWithoutBilling[i];
      const status = i === 0 ? 'PENDING' : i === 1 ? 'BILLED' : 'PAID';
      await p.caseBilling.create({
        data: {
          caseId: c.id,
          sessionId: s.id,
          serviceCode: '97530',
          amount: 450,
          status,
          paidAt: status === 'PAID' ? daysAgo(2) : null,
        },
      });
    }
    if (sessWithoutBilling.length) console.log('  created', sessWithoutBilling.length, 'billing records');

    // 8. Ensure invoice (one per case — on most recent paid session)
    const paidSess = await p.caseSession.findFirst({
      where: { caseId: c.id, billing: { status: 'PAID' }, invoice: null },
      include: { billing: true },
    });
    if (paidSess) {
      await p.invoice.create({
        data: {
          sessionId: paidSess.id,
          patientId: parent.id,
          therapistId: aliUserId,
          amount: paidSess.billing.amount,
          currency: 'AED',
          status: 'PAID',
          clinicName,
          clinicId,
          issuedAt: daysAgo(5),
          paidAt: daysAgo(2),
          dueDate: daysFromNow(25),
          notes: `OT session on ${paidSess.scheduledAt.toISOString().slice(0, 10)}`,
        },
      });
      console.log('  created invoice');
    }

    // 9. Ensure case audit logs
    if (c.auditLogs.length === 0) {
      const ieps2 = await p.iEP.findMany({ where: { caseId: c.id }, include: { goals: true } });
      const milestones = await p.milestone.findMany({ where: { plan: { caseId: c.id } } });
      const recentSess = await p.caseSession.findFirst({ where: { caseId: c.id }, orderBy: { scheduledAt: 'desc' } });
      const logs = [
        { action: 'CASE_OPENED', entityType: 'CASE', entityId: c.id, ts: daysAgo(60) },
        { action: 'IEP_CREATED', entityType: 'IEP', entityId: ieps2[0]?.id || c.id, ts: daysAgo(55) },
        { action: 'CONSENT_GRANTED', entityType: 'CONSENT', entityId: c.id, ts: daysAgo(60) },
        { action: 'SESSION_SIGNED', entityType: 'SESSION', entityId: recentSess?.id || c.id, ts: daysAgo(6) },
        { action: 'MILESTONE_ACHIEVED', entityType: 'MILESTONE', entityId: milestones.find(m => m.status === 'ACHIEVED')?.id || c.id, ts: daysAgo(30) },
        { action: 'GOAL_PROGRESS_UPDATED', entityType: 'GOAL', entityId: ieps2[0]?.goals[0]?.id || c.id, changes: { currentProgress: { from: 0.3, to: 0.4 } }, ts: daysAgo(7) },
      ];
      for (const l of logs) {
        await p.caseAuditLog.create({
          data: { caseId: c.id, userId: aliUserId, action: l.action, entityType: l.entityType, entityId: l.entityId, changes: l.changes || undefined, timestamp: l.ts },
        });
      }
      console.log('  created', logs.length, 'case audit logs');
    }
  }

  // 10. Global PDPL audit logs for Ali
  const globalLogCount = await p.auditLog.count({ where: { userId: aliUserId } });
  if (globalLogCount === 0) {
    const logs = [
      { action: 'LOGIN', resourceType: 'USER', resourceId: aliUserId, ts: daysAgo(1) },
      { action: 'VIEW_PATIENT_RECORD', resourceType: 'CASE', resourceId: cases[0]?.id || aliUserId, ts: daysAgo(1) },
      { action: 'EXPORT_REPORT', resourceType: 'IEP', resourceId: cases[0]?.ieps[0]?.id || aliUserId, ts: daysAgo(3) },
      { action: 'UPDATE_GOAL_PROGRESS', resourceType: 'GOAL', resourceId: cases[0]?.ieps[0]?.goals[0]?.id || aliUserId, ts: daysAgo(5) },
      { action: 'SIGN_SESSION_NOTE', resourceType: 'SESSION', resourceId: cases[0]?.sessions[0]?.id || aliUserId, ts: daysAgo(6) },
    ];
    for (const l of logs) {
      await p.auditLog.create({
        data: { userId: aliUserId, action: l.action, resourceType: l.resourceType, resourceId: l.resourceId, timestamp: l.ts, metadata: { ip: '192.168.1.42', userAgent: 'Chrome/146' } },
      });
    }
    console.log('\nCreated', logs.length, 'global PDPL audit log entries for Ali');
  }

  console.log('\n✅ Seed complete');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());
