import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClinicOutcomesService {
  constructor(private readonly prisma: PrismaService) {}

  async getClinicSummary() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      activePatients,
      sessionsThisMonth,
      sessionsLastMonth,
      goalProgressData,
      screeningImprovement,
    ] = await Promise.all([
      // Active patients
      this.prisma.child.count({ where: { clinicStatus: 'ACTIVE' } }),

      // Sessions this month (attended)
      this.prisma.caseSession.count({
        where: {
          scheduledAt: { gte: startOfMonth },
          attendanceStatus: 'PRESENT',
        },
      }),

      // Sessions last month (for comparison)
      this.prisma.caseSession.count({
        where: {
          scheduledAt: { gte: startOfLastMonth, lt: startOfMonth },
          attendanceStatus: 'PRESENT',
        },
      }),

      // All goal progress from latest sessions
      this.getAggregateGoalProgress(),

      // Average screening improvement
      this.getAverageScreeningImprovement(),
    ]);

    return {
      activePatients,
      sessionsThisMonth,
      sessionsLastMonth,
      goalProgress: goalProgressData,
      averageScreeningImprovement: screeningImprovement,
    };
  }

  async getGoalProgress() {
    // Get all IEP goals with their session progress
    const goals = await this.prisma.iEPGoal.findMany({
      where: {
        iep: {
          status: { in: ['ACTIVE', 'APPROVED'] },
          case: { status: 'ACTIVE' },
        },
      },
      select: {
        id: true,
        domain: true,
        status: true,
        currentProgress: true,
        sessionProgress: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { progressValue: true },
        },
      },
    });

    // Classify goals based on latest progress
    const breakdown = { achieved: 0, progressing: 0, maintaining: 0, regression: 0, total: goals.length };

    for (const goal of goals) {
      if (goal.status === 'ACHIEVED') {
        breakdown.achieved++;
      } else if (goal.status === 'DISCONTINUED') {
        breakdown.regression++;
      } else {
        const latestValue = goal.sessionProgress[0]?.progressValue ?? goal.currentProgress;
        if (latestValue >= 75) {
          breakdown.progressing++;
        } else if (latestValue >= 25) {
          breakdown.maintaining++;
        } else {
          breakdown.regression++;
        }
      }
    }

    // Group by domain
    const byDomain: Record<string, { achieved: number; progressing: number; maintaining: number; regression: number; total: number }> = {};
    for (const goal of goals) {
      const domain = goal.domain || 'OTHER';
      if (!byDomain[domain]) {
        byDomain[domain] = { achieved: 0, progressing: 0, maintaining: 0, regression: 0, total: 0 };
      }
      byDomain[domain].total++;
      if (goal.status === 'ACHIEVED') {
        byDomain[domain].achieved++;
      } else if (goal.status === 'DISCONTINUED') {
        byDomain[domain].regression++;
      } else {
        const val = goal.sessionProgress[0]?.progressValue ?? goal.currentProgress;
        if (val >= 75) byDomain[domain].progressing++;
        else if (val >= 25) byDomain[domain].maintaining++;
        else byDomain[domain].regression++;
      }
    }

    return { breakdown, byDomain };
  }

  async getScreeningTrends() {
    // Get all children with multiple completed screenings
    const children = await this.prisma.child.findMany({
      where: { clinicStatus: 'ACTIVE' },
      select: {
        id: true,
        assessments: {
          where: { status: 'COMPLETED' },
          orderBy: { completedAt: 'asc' },
          select: {
            domainScores: true,
            overallScore: true,
            completedAt: true,
          },
        },
      },
    });

    // Build first vs latest comparison aggregated across all patients
    const domainFirstScores: Record<string, number[]> = {};
    const domainLatestScores: Record<string, number[]> = {};

    for (const child of children) {
      if (child.assessments.length === 0) continue;
      const first = child.assessments[0];
      const latest = child.assessments[child.assessments.length - 1];

      const firstScores = first.domainScores as Record<string, number> | null;
      const latestScores = latest.domainScores as Record<string, number> | null;

      if (firstScores) {
        for (const [domain, score] of Object.entries(firstScores)) {
          if (!domainFirstScores[domain]) domainFirstScores[domain] = [];
          domainFirstScores[domain].push(score);
        }
      }

      if (latestScores) {
        for (const [domain, score] of Object.entries(latestScores)) {
          if (!domainLatestScores[domain]) domainLatestScores[domain] = [];
          domainLatestScores[domain].push(score);
        }
      }
    }

    // Compute averages
    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const allDomains = new Set([...Object.keys(domainFirstScores), ...Object.keys(domainLatestScores)]);
    const trends: { domain: string; firstAvg: number; latestAvg: number; change: number }[] = [];

    for (const domain of allDomains) {
      const firstAvg = avg(domainFirstScores[domain] || []);
      const latestAvg = avg(domainLatestScores[domain] || []);
      trends.push({
        domain,
        firstAvg: Math.round(firstAvg * 10) / 10,
        latestAvg: Math.round(latestAvg * 10) / 10,
        change: Math.round((latestAvg - firstAvg) * 10) / 10,
      });
    }

    return { trends, patientsWithScreenings: children.filter(c => c.assessments.length > 0).length };
  }

  async getPatientOutcomes(opts: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    therapistId?: string;
  }) {
    const where: any = { clinicStatus: 'ACTIVE' };

    if (opts.therapistId) {
      where.cases = {
        some: {
          status: 'ACTIVE',
          therapists: {
            some: { therapistId: opts.therapistId, removedAt: null },
          },
        },
      };
    }

    const children = await this.prisma.child.findMany({
      where,
      include: {
        cases: {
          where: { status: 'ACTIVE' },
          include: {
            primaryTherapist: {
              include: { user: { select: { id: true, name: true } } },
            },
            sessions: {
              where: { attendanceStatus: 'PRESENT' },
              select: { id: true, scheduledAt: true },
              orderBy: { scheduledAt: 'desc' },
            },
            ieps: {
              where: { status: { in: ['ACTIVE', 'APPROVED'] } },
              include: {
                goals: {
                  select: {
                    status: true,
                    currentProgress: true,
                    sessionProgress: {
                      orderBy: { createdAt: 'desc' },
                      take: 1,
                      select: { progressValue: true },
                    },
                  },
                },
              },
            },
          },
        },
        assessments: {
          where: { status: 'COMPLETED' },
          orderBy: { completedAt: 'asc' },
          select: { overallScore: true, completedAt: true },
        },
      },
    });

    const results = children.map((child) => {
      const activeCases = child.cases;
      const therapist = activeCases[0]?.primaryTherapist?.user || null;

      // Count sessions
      const allSessions = activeCases.flatMap((c) => c.sessions);
      const sessionCount = allSessions.length;
      const lastSessionDate = allSessions[0]?.scheduledAt || null;

      // Goal breakdown
      const allGoals = activeCases.flatMap((c) =>
        c.ieps.flatMap((iep) => iep.goals),
      );
      const goalBreakdown = { progressing: 0, maintaining: 0, regression: 0, achieved: 0 };
      for (const goal of allGoals) {
        if (goal.status === 'ACHIEVED') {
          goalBreakdown.achieved++;
        } else if (goal.status === 'DISCONTINUED') {
          goalBreakdown.regression++;
        } else {
          const val = goal.sessionProgress[0]?.progressValue ?? goal.currentProgress;
          if (val >= 75) goalBreakdown.progressing++;
          else if (val >= 25) goalBreakdown.maintaining++;
          else goalBreakdown.regression++;
        }
      }

      // Screening delta
      let screeningDelta: number | null = null;
      if (child.assessments.length >= 2) {
        const first = child.assessments[0].overallScore;
        const latest = child.assessments[child.assessments.length - 1].overallScore;
        if (first !== null && latest !== null) {
          screeningDelta = Math.round((latest - first) * 10) / 10;
        }
      }

      // Age
      const birth = new Date(child.dateOfBirth);
      const now = new Date();
      let age = now.getFullYear() - birth.getFullYear();
      if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;

      return {
        id: child.id,
        firstName: child.firstName,
        age,
        therapist: therapist ? { id: therapist.id, name: therapist.name } : null,
        sessionCount,
        goalBreakdown,
        screeningDelta,
        lastSessionDate,
      };
    });

    // Sorting
    const sortBy = opts.sortBy || 'firstName';
    const sortOrder = opts.sortOrder || 'asc';
    results.sort((a, b) => {
      let valA: any;
      let valB: any;

      switch (sortBy) {
        case 'sessions':
          valA = a.sessionCount; valB = b.sessionCount; break;
        case 'screeningDelta':
          valA = a.screeningDelta ?? -999; valB = b.screeningDelta ?? -999; break;
        case 'lastSession':
          valA = a.lastSessionDate ? new Date(a.lastSessionDate).getTime() : 0;
          valB = b.lastSessionDate ? new Date(b.lastSessionDate).getTime() : 0;
          break;
        case 'age':
          valA = a.age; valB = b.age; break;
        default:
          valA = a.firstName.toLowerCase(); valB = b.firstName.toLowerCase(); break;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return results;
  }

  async getPatientOutcomeDetail(childId: string) {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      include: {
        cases: {
          where: { status: { not: 'ARCHIVED' } },
          include: {
            primaryTherapist: {
              include: { user: { select: { id: true, name: true } } },
            },
            sessions: {
              where: { attendanceStatus: 'PRESENT' },
              orderBy: { scheduledAt: 'asc' },
              select: {
                id: true,
                scheduledAt: true,
                therapistId: true,
                therapist: { select: { name: true } },
                rawNotes: true,
                aiSummary: true,
                goalProgress: {
                  select: {
                    goalId: true,
                    progressValue: true,
                    progressNote: true,
                  },
                },
              },
            },
            ieps: {
              where: { status: { in: ['ACTIVE', 'APPROVED'] } },
              include: {
                goals: {
                  orderBy: { order: 'asc' },
                  select: {
                    id: true,
                    domain: true,
                    goalText: true,
                    status: true,
                    currentProgress: true,
                    targetDate: true,
                    sessionProgress: {
                      orderBy: { session: { scheduledAt: 'asc' } },
                      select: {
                        sessionId: true,
                        progressValue: true,
                        session: { select: { scheduledAt: true } },
                      },
                    },
                  },
                },
              },
            },
            milestonePlans: {
              include: {
                milestones: {
                  where: { status: 'ACHIEVED' },
                  orderBy: { achievedAt: 'desc' },
                  select: {
                    id: true,
                    domain: true,
                    description: true,
                    achievedAt: true,
                  },
                },
              },
            },
          },
        },
        assessments: {
          where: { status: 'COMPLETED' },
          orderBy: { completedAt: 'asc' },
          select: {
            id: true,
            overallScore: true,
            domainScores: true,
            completedAt: true,
          },
        },
      },
    });

    if (!child) {
      throw new NotFoundException('Patient not found');
    }

    const activeCases = child.cases;
    const therapist = activeCases[0]?.primaryTherapist?.user || null;

    // Flatten sessions
    const allSessions = activeCases.flatMap((c) => c.sessions);
    allSessions.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

    // Session count + last session info
    const lastSession = allSessions.length > 0 ? allSessions[allSessions.length - 1] : null;

    // Build goal timeline: each goal row with ratings per session
    const allGoals = activeCases.flatMap((c) =>
      c.ieps.flatMap((iep) => iep.goals),
    );

    const goalTimeline = allGoals.map((goal) => ({
      goalId: goal.id,
      goalTitle: goal.goalText,
      domain: goal.domain,
      status: goal.status,
      currentProgress: goal.currentProgress,
      ratings: goal.sessionProgress.map((sp) => ({
        sessionId: sp.sessionId,
        sessionDate: sp.session.scheduledAt,
        rating: this.classifyProgress(sp.progressValue),
        value: sp.progressValue,
      })),
    }));

    // Goal breakdown
    const goalBreakdown = { progressing: 0, maintaining: 0, regression: 0, achieved: 0 };
    for (const goal of allGoals) {
      if (goal.status === 'ACHIEVED') {
        goalBreakdown.achieved++;
      } else if (goal.status === 'DISCONTINUED') {
        goalBreakdown.regression++;
      } else {
        const val = goal.sessionProgress.length > 0
          ? goal.sessionProgress[goal.sessionProgress.length - 1]?.progressValue ?? goal.currentProgress
          : goal.currentProgress;
        if (val >= 75) goalBreakdown.progressing++;
        else if (val >= 25) goalBreakdown.maintaining++;
        else goalBreakdown.regression++;
      }
    }

    // Screening scores over time
    const screeningScores = child.assessments.map((a) => ({
      date: a.completedAt,
      overallScore: a.overallScore,
      domains: a.domainScores as Record<string, number> | null,
    }));

    // Screening delta
    let screeningDelta: number | null = null;
    if (child.assessments.length >= 2) {
      const first = child.assessments[0].overallScore;
      const latest = child.assessments[child.assessments.length - 1].overallScore;
      if (first !== null && latest !== null) {
        screeningDelta = Math.round((latest - first) * 10) / 10;
      }
    }

    // Milestones achieved
    const milestones = activeCases
      .flatMap((c) => c.milestonePlans.flatMap((mp) => mp.milestones))
      .sort((a, b) => {
        const dateA = a.achievedAt ? new Date(a.achievedAt).getTime() : 0;
        const dateB = b.achievedAt ? new Date(b.achievedAt).getTime() : 0;
        return dateB - dateA;
      });

    // Age
    const birth = new Date(child.dateOfBirth);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;

    // Session list for heatmap column headers
    const sessionDates = allSessions.map((s) => ({
      id: s.id,
      date: s.scheduledAt,
    }));

    return {
      child: { id: child.id, name: child.firstName, age },
      therapist,
      sessionCount: allSessions.length,
      lastSessionDate: lastSession?.scheduledAt || null,
      lastTherapistName: lastSession?.therapist?.name || null,
      lastSessionNoteExcerpt: lastSession?.aiSummary?.substring(0, 200) || lastSession?.rawNotes?.substring(0, 200) || null,
      goalBreakdown,
      goalTimeline,
      sessionDates,
      screeningScores,
      screeningDelta,
      milestones,
    };
  }

  private classifyProgress(value: number | null): string {
    if (value === null || value === undefined) return 'not_rated';
    if (value >= 90) return 'achieved';
    if (value >= 50) return 'progressing';
    if (value >= 25) return 'maintaining';
    return 'regression';
  }

  private async getAggregateGoalProgress() {
    const goals = await this.prisma.iEPGoal.findMany({
      where: {
        iep: {
          status: { in: ['ACTIVE', 'APPROVED'] },
          case: { status: 'ACTIVE' },
        },
      },
      select: {
        status: true,
        currentProgress: true,
        sessionProgress: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { progressValue: true },
        },
      },
    });

    const breakdown = { achieved: 0, progressing: 0, maintaining: 0, regression: 0, total: goals.length };

    for (const goal of goals) {
      if (goal.status === 'ACHIEVED') {
        breakdown.achieved++;
      } else if (goal.status === 'DISCONTINUED') {
        breakdown.regression++;
      } else {
        const val = goal.sessionProgress[0]?.progressValue ?? goal.currentProgress;
        if (val >= 75) breakdown.progressing++;
        else if (val >= 25) breakdown.maintaining++;
        else breakdown.regression++;
      }
    }

    return breakdown;
  }

  private async getAverageScreeningImprovement(): Promise<number> {
    const children = await this.prisma.child.findMany({
      where: { clinicStatus: 'ACTIVE' },
      select: {
        assessments: {
          where: { status: 'COMPLETED' },
          orderBy: { completedAt: 'asc' },
          select: { overallScore: true },
        },
      },
    });

    let totalDelta = 0;
    let count = 0;

    for (const child of children) {
      if (child.assessments.length >= 2) {
        const first = child.assessments[0].overallScore;
        const latest = child.assessments[child.assessments.length - 1].overallScore;
        if (first !== null && latest !== null) {
          totalDelta += latest - first;
          count++;
        }
      }
    }

    return count > 0 ? Math.round((totalDelta / count) * 10) / 10 : 0;
  }
}
