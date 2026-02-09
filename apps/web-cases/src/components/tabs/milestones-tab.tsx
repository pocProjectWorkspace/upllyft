'use client';

import { useState } from 'react';
import {
  useMilestonePlans,
  useMilestonePlan,
  useCreateMilestonePlan,
  useCreateMilestone,
  useUpdateMilestone,
  useGenerateMilestonesAI,
} from '@/hooks/use-cases';
import { formatDate } from '@/lib/utils';
import type { MilestonePlan, Milestone } from '@/lib/api/cases';
import {
  Button,
  Input,
  Label,
  Textarea,
  Badge,
  Card,
  Progress,
  Skeleton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  useToast,
} from '@upllyft/ui';
import {
  Plus,
  Loader2,
  TrendingUp,
  Sparkles,
  ArrowLeft,
  CheckCircle,
  Circle,
  ChevronRight,
  Calendar,
} from 'lucide-react';

const DOMAINS = [
  'COMMUNICATION',
  'MOTOR',
  'SOCIAL',
  'COGNITIVE',
  'BEHAVIORAL',
  'SELF_CARE',
  'ACADEMIC',
];

const STATUS_BADGE_COLORS: Record<string, 'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'purple'> = {
  ON_TRACK: 'blue',
  EMERGING: 'yellow',
  DELAYED: 'red',
  ACHIEVED: 'green',
  REGRESSED: 'purple',
  PENDING: 'gray',
};

const DOMAIN_COLORS: Record<string, 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'gray' | 'teal'> = {
  COMMUNICATION: 'blue',
  MOTOR: 'green',
  SOCIAL: 'purple',
  COGNITIVE: 'yellow',
  BEHAVIORAL: 'red',
  SELF_CARE: 'teal',
  ACADEMIC: 'gray',
};

interface MilestonesTabProps {
  caseId: string;
}

export function MilestonesTab({ caseId }: MilestonesTabProps) {
  const { toast } = useToast();

  // ── View state ──
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddMilestone, setShowAddMilestone] = useState(false);

  // ── Form state ──
  const [newPlan, setNewPlan] = useState({
    sharedWithParent: false,
  });
  const [newMilestone, setNewMilestone] = useState({
    domain: 'COMMUNICATION',
    description: '',
    expectedAge: '',
    targetDate: '',
  });

  // ── Queries ──
  const { data: plansData, isLoading } = useMilestonePlans(caseId);
  const { data: planDetail } = useMilestonePlan(caseId, selectedPlanId ?? '');

  // ── Mutations ──
  const createPlan = useCreateMilestonePlan();
  const createMilestone = useCreateMilestone();
  const updateMilestone = useUpdateMilestone();
  const generateAI = useGenerateMilestonesAI();

  // ── Derived data ──
  const plans: MilestonePlan[] = Array.isArray(plansData) ? plansData : [];
  const selectedPlan: MilestonePlan | null = (planDetail as MilestonePlan) ?? null;
  const milestones: Milestone[] = selectedPlan?.milestones ?? [];

  // ── Computed progress ──
  const achievedCount = milestones.filter((m) => m.status === 'ACHIEVED').length;
  const totalCount = milestones.length;
  const progressPct =
    totalCount > 0 ? Math.round((achievedCount / totalCount) * 100) : 0;

  // ── Handlers ──

  const handleCreate = async () => {
    try {
      const result = await createPlan.mutateAsync({
        caseId,
        data: {
          sharedWithParent: newPlan.sharedWithParent,
        },
      });
      setShowCreate(false);
      setNewPlan({ sharedWithParent: false });
      const resultId = (result as Record<string, unknown>)?.id;
      if (typeof resultId === 'string') setSelectedPlanId(resultId);
    } catch {
      // Error handled by hook
    }
  };

  const handleAddMilestone = async () => {
    if (!selectedPlanId || !newMilestone.description.trim()) return;
    try {
      await createMilestone.mutateAsync({
        caseId,
        planId: selectedPlanId,
        data: {
          domain: newMilestone.domain,
          description: newMilestone.description,
          expectedAge: newMilestone.expectedAge || undefined,
          targetDate: newMilestone.targetDate
            ? new Date(newMilestone.targetDate).toISOString()
            : undefined,
        },
      });
      setShowAddMilestone(false);
      setNewMilestone({
        domain: 'COMMUNICATION',
        description: '',
        expectedAge: '',
        targetDate: '',
      });
    } catch {
      // Error handled by hook
    }
  };

  const handleToggle = async (milestone: Milestone) => {
    if (!selectedPlanId) return;
    const newStatus = milestone.status === 'ACHIEVED' ? 'ON_TRACK' : 'ACHIEVED';
    try {
      await updateMilestone.mutateAsync({
        caseId,
        planId: selectedPlanId,
        milestoneId: milestone.id,
        data: {
          status: newStatus,
          achievedAt: newStatus === 'ACHIEVED' ? new Date().toISOString() : undefined,
        },
      });
    } catch {
      // Error handled by hook
    }
  };

  const handleGenerateAI = async () => {
    if (!selectedPlanId) return;
    try {
      await generateAI.mutateAsync({
        caseId,
        planId: selectedPlanId,
        data: {},
      });
    } catch {
      // Error handled by hook
    }
  };

  // ── Group milestones by domain ──
  const groupedMilestones = milestones.reduce<Record<string, Milestone[]>>(
    (acc, m) => {
      const domain = m.domain || 'OTHER';
      if (!acc[domain]) acc[domain] = [];
      acc[domain].push(m);
      return acc;
    },
    {}
  );

  // ── Loading state ──

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  // ── Detail View ──

  if (selectedPlan && selectedPlanId) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedPlanId(null)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h3 className="font-semibold text-lg">
            Milestone Plan v{selectedPlan.version ?? 1}
          </h3>
          {selectedPlan.sharedWithParent && (
            <Badge color="blue">Shared with Parent</Badge>
          )}
        </div>

        {/* Progress Card */}
        <Card className="p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">
              {achievedCount}/{totalCount} achieved
            </span>
            <span className="text-sm font-medium">{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-2" />
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateAI}
              disabled={generateAI.isPending}
            >
              {generateAI.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span className="ml-1">AI Generate</span>
            </Button>
            <Dialog open={showAddMilestone} onOpenChange={setShowAddMilestone}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="primary"
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Milestone
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Milestone</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Domain</Label>
                    <Select
                      value={newMilestone.domain}
                      onValueChange={(v) =>
                        setNewMilestone({ ...newMilestone, domain: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOMAINS.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={newMilestone.description}
                      onChange={(e) =>
                        setNewMilestone({
                          ...newMilestone,
                          description: e.target.value,
                        })
                      }
                      rows={3}
                      placeholder="Describe the developmental milestone"
                    />
                  </div>
                  <div>
                    <Label>Expected Age (e.g., 12-18 months)</Label>
                    <Input
                      value={newMilestone.expectedAge}
                      onChange={(e) =>
                        setNewMilestone({
                          ...newMilestone,
                          expectedAge: e.target.value,
                        })
                      }
                      placeholder="e.g., 12-18 months"
                    />
                  </div>
                  <div>
                    <Label>Target Date (optional)</Label>
                    <Input
                      type="date"
                      value={newMilestone.targetDate}
                      onChange={(e) =>
                        setNewMilestone({
                          ...newMilestone,
                          targetDate: e.target.value,
                        })
                      }
                    />
                  </div>
                  <Button
                    onClick={handleAddMilestone}
                    disabled={createMilestone.isPending}
                    className="w-full bg-teal-600 hover:bg-teal-700"
                  >
                    {createMilestone.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Add Milestone
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </Card>

        {/* Milestones Grouped by Domain */}
        {totalCount === 0 ? (
          <div className="text-center py-16">
            <TrendingUp className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            <h3 className="text-base font-medium text-gray-900 mb-1">
              No milestones yet
            </h3>
            <p className="text-sm text-gray-500">
              Add milestones manually or let AI generate them from screening
              data.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedMilestones).map(([domain, items]) => {
              const domainAchieved = items.filter(
                (m) => m.status === 'ACHIEVED'
              ).length;
              const domainTotal = items.length;
              const domainPct =
                domainTotal > 0
                  ? Math.round((domainAchieved / domainTotal) * 100)
                  : 0;

              return (
                <div key={domain}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge color={DOMAIN_COLORS[domain] ?? 'gray'}>
                        {domain}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {domainAchieved}/{domainTotal}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-gray-600">
                      {domainPct}%
                    </span>
                  </div>
                  <Progress value={domainPct} className="h-1.5 mb-3" />
                  <div className="space-y-2">
                    {items.map((milestone) => (
                      <Card
                        key={milestone.id}
                        className="p-3 flex items-center gap-3 border border-gray-100"
                      >
                        <button
                          onClick={() => handleToggle(milestone)}
                          className="shrink-0"
                          disabled={updateMilestone.isPending}
                        >
                          {milestone.status === 'ACHIEVED' ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <Circle className="h-5 w-5 text-gray-300 hover:text-gray-400 transition-colors" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium ${
                              milestone.status === 'ACHIEVED'
                                ? 'line-through text-gray-400'
                                : 'text-gray-900'
                            }`}
                          >
                            {milestone.description}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {milestone.expectedAge && (
                              <span className="text-xs text-gray-500">
                                Expected: {milestone.expectedAge}
                              </span>
                            )}
                            {milestone.targetDate && (
                              <span className="text-xs text-gray-500 flex items-center gap-0.5">
                                <Calendar className="h-3 w-3" />
                                {formatDate(milestone.targetDate)}
                              </span>
                            )}
                            {milestone.achievedAt && (
                              <span className="text-xs text-green-600">
                                Achieved {formatDate(milestone.achievedAt)}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge
                          color={
                            STATUS_BADGE_COLORS[milestone.status] ?? 'gray'
                          }
                        >
                          {milestone.status}
                        </Badge>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── List View ──

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">
          Milestone Plans ({plans.length})
        </h3>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button
              variant="primary"
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Plus className="h-4 w-4 mr-2" /> New Plan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Milestone Plan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sharedWithParent"
                  checked={newPlan.sharedWithParent}
                  onChange={(e) =>
                    setNewPlan({ ...newPlan, sharedWithParent: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <Label htmlFor="sharedWithParent">Share with parent</Label>
              </div>
              <Button
                onClick={handleCreate}
                disabled={createPlan.isPending}
                className="w-full bg-teal-600 hover:bg-teal-700"
              >
                {createPlan.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Create Plan
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-16">
          <TrendingUp className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <h3 className="text-base font-medium text-gray-900 mb-1">
            No milestone plans yet
          </h3>
          <p className="text-sm text-gray-500">
            Create a milestone plan to track developmental progress.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => {
            const planMilestones = plan.milestones ?? [];
            const planAchieved = planMilestones.filter(
              (m) => m.status === 'ACHIEVED'
            ).length;
            const planTotal = planMilestones.length;
            const planPct =
              planTotal > 0
                ? Math.round((planAchieved / planTotal) * 100)
                : 0;

            return (
              <Card
                key={plan.id}
                className="p-4 cursor-pointer hover:shadow-md transition-shadow border border-gray-100"
                onClick={() => setSelectedPlanId(plan.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        Plan v{plan.version ?? 1}
                      </span>
                      {plan.sharedWithParent && (
                        <Badge color="blue">Shared</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-sm text-gray-500">
                        Created {formatDate(plan.createdAt)}
                      </p>
                      {planTotal > 0 && (
                        <span className="text-sm text-gray-500">
                          {planAchieved}/{planTotal} milestones ({planPct}%)
                        </span>
                      )}
                    </div>
                    {planTotal > 0 && (
                      <Progress value={planPct} className="h-1.5 mt-2" />
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 shrink-0 ml-3" />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
