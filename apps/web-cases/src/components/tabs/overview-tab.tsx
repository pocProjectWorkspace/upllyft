'use client';

import { useState } from 'react';
import {
  Card,
  Badge,
  Button,
  Input,
  Label,
  Textarea,
  Avatar,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from '@upllyft/ui';
import {
  useCaseTimeline,
  useComplianceStatus,
  useInternalNotes,
  useCreateInternalNote,
  useAddCaseTherapist,
  useTransferCase,
} from '@/hooks/use-cases';
import {
  caseStatusColors,
  caseStatusLabels,
  formatDate,
  formatDateTime,
} from '@/lib/utils';
import {
  FileText,
  User,
  Stethoscope,
  Users,
  Clock,
  StickyNote,
  Loader2,
  ArrowRightLeft,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Mail,
  Phone,
} from 'lucide-react';

interface OverviewTabProps {
  caseId: string;
  caseData: any;
}

function calculateAge(dateOfBirth: string | undefined): string {
  if (!dateOfBirth) return 'Unknown';
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return `${age}`;
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <div className="text-sm text-gray-900 font-medium mt-0.5">{value || '—'}</div>
    </div>
  );
}

export function OverviewTab({ caseId, caseData }: OverviewTabProps) {
  const { toast } = useToast();

  // ---- Queries ----
  const { data: compliance, isLoading: loadingCompliance } =
    useComplianceStatus(caseId);
  const { data: timelineRaw, isLoading: loadingTimeline } =
    useCaseTimeline(caseId);
  const { data: notesRaw, isLoading: loadingNotes } =
    useInternalNotes(caseId);

  // Normalise data shapes
  const timeline = Array.isArray(timelineRaw)
    ? timelineRaw
    : (timelineRaw as any)?.items ?? [];
  const notes = Array.isArray(notesRaw) ? notesRaw : [];

  // ---- Mutations ----
  const createNote = useCreateInternalNote();
  const addTherapist = useAddCaseTherapist();
  const transferCase = useTransferCase();

  // ---- Local state ----
  const [newNote, setNewNote] = useState('');
  const [showAddTherapist, setShowAddTherapist] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferId, setTransferId] = useState('');
  const [therapistForm, setTherapistForm] = useState({
    therapistId: '',
    role: 'SECONDARY',
  });

  // ---- Handlers ----
  const handleAddNote = () => {
    if (!newNote.trim()) return;
    createNote.mutate(
      { caseId, data: { content: newNote.trim() } },
      { onSuccess: () => setNewNote('') },
    );
  };

  const handleAddTherapist = () => {
    if (!therapistForm.therapistId.trim()) return;
    addTherapist.mutate(
      { caseId, data: therapistForm },
      {
        onSuccess: () => {
          setShowAddTherapist(false);
          setTherapistForm({ therapistId: '', role: 'SECONDARY' });
        },
      },
    );
  };

  const handleTransfer = () => {
    if (!transferId.trim()) return;
    transferCase.mutate(
      { caseId, data: { newTherapistId: transferId.trim() } },
      {
        onSuccess: () => {
          setShowTransfer(false);
          setTransferId('');
        },
      },
    );
  };

  // ---- Derived data ----
  const status = typeof caseData.status === 'string' ? caseData.status : '';
  const caseNumber = typeof caseData.caseNumber === 'string' ? caseData.caseNumber : '';
  const diagnosis = typeof caseData.diagnosis === 'string' ? caseData.diagnosis : '';
  const referralSource = typeof caseData.referralSource === 'string' ? caseData.referralSource : '';
  const caseNotes = typeof caseData.notes === 'string' ? caseData.notes : '';

  const child = caseData.child;
  const childName = child?.firstName || child?.name || 'Unknown';
  const parentUser = child?.profile?.user;
  const conditions = Array.isArray(child?.conditions) ? child.conditions : [];
  const primaryCondition = conditions[0];

  return (
    <div className="space-y-6">
      {/* ===== Row 1: Case Summary + Patient Info ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Case Summary */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-teal-600" />
            <h2 className="text-lg font-semibold">Case Summary</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InfoItem label="Case Number" value={<span className="font-mono">{caseNumber || '—'}</span>} />
            <InfoItem
              label="Status"
              value={
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${caseStatusColors[status] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  {caseStatusLabels[status] ?? (status || '—')}
                </span>
              }
            />
            <InfoItem label="Created" value={formatDate(caseData.createdAt)} />
            <InfoItem label="Last Updated" value={formatDate(caseData.updatedAt)} />
            <InfoItem label="Diagnosis" value={diagnosis || 'Not specified'} />
            <InfoItem label="Referral Source" value={referralSource || 'Not specified'} />
          </div>
          {caseNotes && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-500">Notes</p>
              <p className="text-sm mt-1">{caseNotes}</p>
            </div>
          )}
        </Card>

        {/* Patient Information */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Patient Information</h2>
          </div>
          {child ? (
            <div className="flex items-start gap-4">
              <Avatar
                name={childName}
                size="lg"
              />
              <div className="flex-1 grid grid-cols-2 gap-3">
                <InfoItem
                  label="Name"
                  value={
                    <>
                      {childName}
                      {child.nickname && (
                        <span className="text-gray-400 ml-1">({child.nickname})</span>
                      )}
                    </>
                  }
                />
                <InfoItem
                  label="Age"
                  value={`${calculateAge(child.dateOfBirth)} years`}
                />
                <InfoItem label="Gender" value={child.gender || 'Not specified'} />
                <InfoItem label="DOB" value={formatDate(child.dateOfBirth)} />
                {parentUser && (
                  <>
                    <InfoItem label="Parent" value={parentUser.name} />
                    <div>
                      <p className="text-sm text-gray-500">Contact</p>
                      <div className="mt-0.5 space-y-1">
                        {parentUser.email && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-900">
                            <Mail className="h-3.5 w-3.5 text-gray-400" />
                            {parentUser.email}
                          </div>
                        )}
                        {parentUser.phone && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-900">
                            <Phone className="h-3.5 w-3.5 text-gray-400" />
                            {parentUser.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No patient data available</p>
          )}
        </Card>
      </div>

      {/* ===== Row 2: Conditions & Diagnosis + Care Team ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conditions & Diagnosis */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Stethoscope className="h-5 w-5 text-orange-600" />
            <h2 className="text-lg font-semibold">Conditions & Diagnosis</h2>
          </div>

          {conditions.length > 0 ? (
            <div className="space-y-4">
              {/* Primary condition */}
              {primaryCondition?.conditionType && (
                <div>
                  <p className="text-sm text-gray-500">Primary Condition</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge color="yellow">{primaryCondition.conditionType}</Badge>
                    {primaryCondition.severity && (
                      <span className="text-sm text-gray-600">
                        Severity: {primaryCondition.severity}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Specific diagnosis */}
              {primaryCondition?.specificDiagnosis && (
                <div>
                  <p className="text-sm text-gray-500">Specific Diagnosis</p>
                  <p className="text-sm text-gray-900 mt-0.5">{primaryCondition.specificDiagnosis}</p>
                </div>
              )}

              {/* All conditions as badges if multiple */}
              {conditions.length > 1 && (
                <div>
                  <p className="text-sm text-gray-500 mb-1.5">All Conditions</p>
                  <div className="flex flex-wrap gap-1.5">
                    {conditions.map((c: any, i: number) => (
                      <Badge key={i} color="gray">
                        {typeof c === 'string'
                          ? c
                          : c.conditionType || c.type || c.name || 'Unknown'}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Current therapies */}
              {primaryCondition?.currentTherapies &&
                Array.isArray(primaryCondition.currentTherapies) &&
                primaryCondition.currentTherapies.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-1.5">Current Therapies</p>
                  <div className="flex flex-wrap gap-1.5">
                    {primaryCondition.currentTherapies.map((therapy: string, idx: number) => (
                      <span key={idx} className="px-2 py-1 bg-teal-50 text-teal-700 rounded-lg text-sm">
                        {therapy}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Medications */}
              {primaryCondition?.medications &&
                Array.isArray(primaryCondition.medications) &&
                primaryCondition.medications.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-1.5">Medications</p>
                  <div className="flex flex-wrap gap-1.5">
                    {primaryCondition.medications.map((med: string, idx: number) => (
                      <span key={idx} className="px-2 py-1 bg-purple-50 text-purple-700 rounded-lg text-sm">
                        {med}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Primary challenges */}
              {primaryCondition?.primaryChallenges && (
                <div>
                  <p className="text-sm text-gray-500">Primary Challenges</p>
                  <p className="text-sm text-gray-700 mt-0.5">{primaryCondition.primaryChallenges}</p>
                </div>
              )}

              {/* Strengths */}
              {primaryCondition?.strengths && (
                <div>
                  <p className="text-sm text-gray-500">Strengths</p>
                  <p className="text-sm text-gray-700 mt-0.5">{primaryCondition.strengths}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No conditions recorded</p>
          )}
        </Card>

        {/* Care Team */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold">Care Team</h2>
            </div>
            <Dialog open={showAddTherapist} onOpenChange={setShowAddTherapist}>
              <DialogTrigger asChild>
                <button className="text-sm text-teal-600 hover:text-teal-700 font-medium">
                  + Add Member
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Therapist</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Therapist ID</Label>
                    <Input
                      value={therapistForm.therapistId}
                      onChange={(e) =>
                        setTherapistForm({ ...therapistForm, therapistId: e.target.value })
                      }
                      placeholder="Enter therapist profile ID"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Select
                      value={therapistForm.role}
                      onValueChange={(v) =>
                        setTherapistForm({ ...therapistForm, role: v })
                      }
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SECONDARY">Secondary</SelectItem>
                        <SelectItem value="CONSULTANT">Consultant</SelectItem>
                        <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="primary"
                      onClick={handleAddTherapist}
                      disabled={addTherapist.isPending || !therapistForm.therapistId.trim()}
                      className="w-full bg-teal-600 hover:bg-teal-700"
                    >
                      {addTherapist.isPending && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Add Therapist
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-1">
            {/* Primary therapist */}
            {caseData.primaryTherapist && (() => {
              const name =
                typeof caseData.primaryTherapist?.user?.name === 'string'
                  ? caseData.primaryTherapist.user.name
                  : typeof caseData.primaryTherapist?.name === 'string'
                    ? caseData.primaryTherapist.name
                    : 'Primary Therapist';
              const image =
                typeof caseData.primaryTherapist?.user?.image === 'string'
                  ? caseData.primaryTherapist.user.image
                  : typeof caseData.primaryTherapist?.image === 'string'
                    ? caseData.primaryTherapist.image
                    : undefined;
              const role =
                typeof caseData.primaryTherapist?.user?.email === 'string'
                  ? caseData.primaryTherapist.user.email
                  : undefined;

              return (
                <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50">
                  <Avatar src={image} name={name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{name}</p>
                    {role && <p className="text-xs text-gray-500 truncate">{role}</p>}
                  </div>
                  <Badge color="blue">Primary</Badge>
                </div>
              );
            })()}

            {/* Other therapists */}
            {Array.isArray(caseData.therapists) &&
              caseData.therapists.map((t: any) => {
                const tName =
                  typeof t.therapist?.user?.name === 'string'
                    ? t.therapist.user.name
                    : typeof t.therapist?.name === 'string'
                      ? t.therapist.name
                      : 'Therapist';
                const tImage =
                  typeof t.therapist?.user?.image === 'string'
                    ? t.therapist.user.image
                    : typeof t.therapist?.image === 'string'
                      ? t.therapist.image
                      : undefined;
                const tRole = typeof t.role === 'string' ? t.role : '';

                return (
                  <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50">
                    <Avatar src={tImage} name={tName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{tName}</p>
                      <p className="text-xs text-gray-500 capitalize">{tRole.toLowerCase()}</p>
                    </div>
                  </div>
                );
              })}

            {!caseData.primaryTherapist &&
              (!Array.isArray(caseData.therapists) || caseData.therapists.length === 0) && (
              <p className="text-sm text-gray-500 py-2">No team members assigned</p>
            )}
          </div>

          {/* Transfer primary */}
          {caseData.primaryTherapist && (
            <div className="border-t mt-3 pt-3">
              <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    <ArrowRightLeft className="h-3 w-3 mr-1" /> Transfer Primary
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Transfer Case</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <p className="text-sm text-gray-500">
                      Transfer primary responsibility to another therapist. The
                      current primary will become a secondary therapist.
                    </p>
                    <div>
                      <Label>New Primary Therapist ID</Label>
                      <Input
                        value={transferId}
                        onChange={(e) => setTransferId(e.target.value)}
                        placeholder="Enter therapist profile ID"
                        className="mt-1.5"
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        variant="primary"
                        onClick={handleTransfer}
                        disabled={transferCase.isPending || !transferId.trim()}
                        className="w-full bg-teal-600 hover:bg-teal-700"
                      >
                        {transferCase.isPending && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Transfer Case
                      </Button>
                    </DialogFooter>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </Card>
      </div>

      {/* ===== Row 3: Internal Notes (full width) ===== */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <StickyNote className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold">Clinical Notes</h2>
          </div>
        </div>
        {loadingNotes ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <>
            {notes.length > 0 ? (
              <div className="space-y-3 mb-4">
                {notes.slice(0, 5).map((note: any) => {
                  const content = typeof note.content === 'string' ? note.content : '';
                  const authorName =
                    note.author && typeof note.author === 'object' && typeof note.author.name === 'string'
                      ? note.author.name
                      : note.user && typeof note.user === 'object' && typeof note.user.name === 'string'
                        ? note.user.name
                        : '';

                  return (
                    <div key={note.id} className="text-sm border-l-2 border-teal-200 pl-3 py-1">
                      <p className="text-gray-700">{content}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {authorName && `${authorName} \u00B7 `}
                        {formatDate(note.createdAt)}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-4">No clinical notes recorded.</p>
            )}
            <div className="flex flex-col gap-2">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note..."
                className="text-sm"
                rows={2}
              />
              <Button
                size="sm"
                variant="primary"
                onClick={handleAddNote}
                disabled={createNote.isPending || !newNote.trim()}
                className="self-start bg-teal-600 hover:bg-teal-700"
              >
                {createNote.isPending && (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                )}
                Add Note
              </Button>
            </div>
          </>
        )}
      </Card>

      {/* ===== Row 4: Recent Activity + Compliance ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Recent Activity</h2>
          </div>
          {loadingTimeline ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
            </div>
          ) : timeline.length === 0 ? (
            <p className="text-gray-500 text-sm">No activity recorded yet</p>
          ) : (
            <div className="space-y-3">
              {timeline.slice(0, 10).map((entry: any) => {
                const action = typeof entry.action === 'string' ? entry.action : '';
                const userName =
                  entry.user && typeof entry.user === 'object' && typeof entry.user.name === 'string'
                    ? entry.user.name
                    : '';
                const timestamp =
                  typeof entry.timestamp === 'string'
                    ? entry.timestamp
                    : typeof entry.createdAt === 'string'
                      ? entry.createdAt
                      : '';

                return (
                  <div key={entry.id} className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-sm">
                        <span className="font-medium">{action}</span>
                        {userName && ` by ${userName}`}
                      </p>
                      {timestamp && (
                        <p className="text-xs text-gray-400">
                          {formatDateTime(timestamp)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Compliance Status */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            {compliance?.isCompliant ? (
              <ShieldCheck className="h-5 w-5 text-green-600" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-red-600" />
            )}
            <h2 className="text-lg font-semibold">Compliance Status</h2>
          </div>
          {loadingCompliance ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64" />
            </div>
          ) : compliance ? (
            <>
              <div
                className={`p-4 rounded-lg ${compliance.isCompliant ? 'bg-green-50' : 'bg-red-50'}`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`font-medium ${compliance.isCompliant ? 'text-green-700' : 'text-red-700'}`}
                  >
                    {compliance.isCompliant ? 'Compliant' : 'Non-Compliant'}
                  </span>
                  {Array.isArray(compliance.activeConsents) && (
                    <span className="text-sm text-gray-500 ml-auto">
                      {compliance.activeConsents.length} active consent
                      {compliance.activeConsents.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {Array.isArray(compliance.missingConsents) &&
                  compliance.missingConsents.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600 mb-1">Missing:</p>
                    <ul className="text-sm text-red-700 space-y-0.5">
                      {compliance.missingConsents.map((consent: string, idx: number) => (
                        <li key={idx}>&#8226; {consent}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {Array.isArray((compliance as any).soonExpiring) &&
                  (compliance as any).soonExpiring.length > 0 && (
                  <div className="mt-3 flex items-center gap-1 text-sm">
                    <AlertTriangle className="h-3.5 w-3.5 text-yellow-600" />
                    <span className="text-yellow-600 font-medium">Expiring soon: </span>
                    {(compliance as any).soonExpiring
                      .map((c: any) => (typeof c === 'string' ? c : c.type))
                      .join(', ')}
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">No compliance data available</p>
          )}
        </Card>
      </div>
    </div>
  );
}
