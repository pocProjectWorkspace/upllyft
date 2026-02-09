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
  Users,
  StickyNote,
  Clock,
  Plus,
  Loader2,
  User,
  ArrowRightLeft,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';

interface OverviewTabProps {
  caseId: string;
  caseData: any;
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
      {
        onSuccess: () => setNewNote(''),
      },
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

  // ---- Helpers ----
  const status = typeof caseData.status === 'string' ? caseData.status : '';
  const caseNumber = typeof caseData.caseNumber === 'string' ? caseData.caseNumber : '';
  const diagnosis = typeof caseData.diagnosis === 'string' ? caseData.diagnosis : '';
  const primaryDiagnosis =
    typeof caseData.primaryDiagnosis === 'string' ? caseData.primaryDiagnosis : diagnosis;
  const referralSource =
    typeof caseData.referralSource === 'string' ? caseData.referralSource : '';
  const caseNotes = typeof caseData.notes === 'string' ? caseData.notes : '';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ===== Main content (2 cols) ===== */}
      <div className="lg:col-span-2 space-y-6">
        {/* --- Case Details --- */}
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Case Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Case Number</span>
              <p className="font-medium">{caseNumber || '--'}</p>
            </div>
            <div>
              <span className="text-gray-500">Status</span>
              <div className="mt-0.5">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${caseStatusColors[status] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  {caseStatusLabels[status] ?? (status || '--')}
                </span>
              </div>
            </div>
            <div>
              <span className="text-gray-500">Primary Diagnosis</span>
              <p className="font-medium">{primaryDiagnosis || '--'}</p>
            </div>
            <div>
              <span className="text-gray-500">Referral Source</span>
              <p className="font-medium">{referralSource || '--'}</p>
            </div>
            <div>
              <span className="text-gray-500">Created</span>
              <p className="font-medium">{formatDate(caseData.createdAt)}</p>
            </div>
            <div>
              <span className="text-gray-500">Last Updated</span>
              <p className="font-medium">{formatDate(caseData.updatedAt)}</p>
            </div>
          </div>
          {caseNotes && (
            <div className="mt-4 pt-4 border-t">
              <span className="text-gray-500 text-sm">Notes</span>
              <p className="mt-1 text-sm">{caseNotes}</p>
            </div>
          )}
        </Card>

        {/* --- Compliance Status --- */}
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Compliance Status</h3>
          {loadingCompliance ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64" />
            </div>
          ) : compliance ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                {compliance.isCompliant ? (
                  <div className="flex items-center gap-2 rounded-full bg-green-50 px-3 py-1">
                    <ShieldCheck className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">Compliant</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-full bg-red-50 px-3 py-1">
                    <ShieldAlert className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-700">Non-Compliant</span>
                  </div>
                )}
                {Array.isArray(compliance.activeConsents) && (
                  <span className="text-sm text-gray-500">
                    {compliance.activeConsents.length} active consent
                    {compliance.activeConsents.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {Array.isArray(compliance.missingConsents) &&
                compliance.missingConsents.length > 0 && (
                  <div className="text-sm">
                    <span className="text-red-600 font-medium">Missing consents: </span>
                    {compliance.missingConsents.join(', ')}
                  </div>
                )}
              {Array.isArray((compliance as any).soonExpiring) &&
                (compliance as any).soonExpiring.length > 0 && (
                  <div className="text-sm mt-2 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-yellow-600" />
                    <span className="text-yellow-600 font-medium">Expiring soon: </span>
                    {(compliance as any).soonExpiring
                      .map((c: any) => (typeof c === 'string' ? c : c.type))
                      .join(', ')}
                  </div>
                )}
            </>
          ) : (
            <p className="text-sm text-gray-500">No compliance data available</p>
          )}
        </Card>

        {/* --- Timeline --- */}
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5" /> Recent Activity
          </h3>
          {loadingTimeline ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
            </div>
          ) : timeline.length === 0 ? (
            <p className="text-gray-500 text-sm">No activity recorded yet</p>
          ) : (
            <div className="space-y-3">
              {timeline.slice(0, 10).map((entry: any) => {
                const action =
                  typeof entry.action === 'string' ? entry.action : '';
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
                  <div key={entry.id} className="flex gap-3 text-sm">
                    <div className="h-2 w-2 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                    <div>
                      <p>
                        <span className="font-medium">{action}</span>
                        {userName && ` by ${userName}`}
                      </p>
                      {timestamp && (
                        <p className="text-gray-400 text-xs">
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
      </div>

      {/* ===== Sidebar (1 col) ===== */}
      <div className="space-y-6">
        {/* --- Care Team --- */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" /> Care Team
            </h3>
            <Dialog open={showAddTherapist} onOpenChange={setShowAddTherapist}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
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
                        setTherapistForm({
                          ...therapistForm,
                          therapistId: e.target.value,
                        })
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
                      disabled={
                        addTherapist.isPending || !therapistForm.therapistId.trim()
                      }
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

          {/* Primary therapist */}
          {caseData.primaryTherapist && (
            <div className="flex items-center gap-3 mb-3">
              <Avatar
                src={
                  typeof caseData.primaryTherapist?.image === 'string'
                    ? caseData.primaryTherapist.image
                    : undefined
                }
                name={
                  typeof caseData.primaryTherapist?.name === 'string'
                    ? caseData.primaryTherapist.name
                    : typeof caseData.primaryTherapist?.user?.name === 'string'
                      ? caseData.primaryTherapist.user.name
                      : 'Primary'
                }
                size="sm"
              />
              <div>
                <p className="text-sm font-medium">
                  {typeof caseData.primaryTherapist?.name === 'string'
                    ? caseData.primaryTherapist.name
                    : typeof caseData.primaryTherapist?.user?.name === 'string'
                      ? caseData.primaryTherapist.user.name
                      : 'Primary Therapist'}
                </p>
                <p className="text-xs text-gray-500">Primary</p>
              </div>
            </div>
          )}

          {/* Other therapists */}
          {Array.isArray(caseData.therapists) &&
            caseData.therapists.map((t: any) => {
              const tName =
                typeof t.therapist?.name === 'string'
                  ? t.therapist.name
                  : typeof t.therapist?.user?.name === 'string'
                    ? t.therapist.user.name
                    : 'Therapist';
              const tImage =
                typeof t.therapist?.image === 'string'
                  ? t.therapist.image
                  : typeof t.therapist?.user?.image === 'string'
                    ? t.therapist.user.image
                    : undefined;
              const role = typeof t.role === 'string' ? t.role : '';

              return (
                <div key={t.id} className="flex items-center gap-3 mb-3">
                  <Avatar src={tImage} name={tName} size="sm" />
                  <div>
                    <p className="text-sm font-medium">{tName}</p>
                    <p className="text-xs text-gray-500">{role}</p>
                  </div>
                </div>
              );
            })}

          {!caseData.primaryTherapist &&
            (!Array.isArray(caseData.therapists) ||
              caseData.therapists.length === 0) && (
              <p className="text-sm text-gray-500">No team members assigned</p>
            )}

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

        {/* --- Child Info --- */}
        {caseData.child && (
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <User className="h-5 w-5" /> Child Info
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Name</span>
                <p className="font-medium">
                  {typeof caseData.child.firstName === 'string'
                    ? caseData.child.firstName
                    : typeof caseData.child.name === 'string'
                      ? caseData.child.name
                      : 'Unknown'}
                  {typeof caseData.child.lastName === 'string' &&
                    ` ${caseData.child.lastName}`}
                  {typeof caseData.child.nickname === 'string' && (
                    <span className="text-gray-400 ml-1">
                      ({caseData.child.nickname})
                    </span>
                  )}
                </p>
              </div>
              {caseData.child.dateOfBirth && (
                <div>
                  <span className="text-gray-500">Date of Birth</span>
                  <p className="font-medium">
                    {formatDate(caseData.child.dateOfBirth)}
                    {' '}
                    <span className="text-gray-400">
                      (
                      {Math.floor(
                        (Date.now() -
                          new Date(caseData.child.dateOfBirth).getTime()) /
                          (365.25 * 24 * 60 * 60 * 1000),
                      )}{' '}
                      yrs)
                    </span>
                  </p>
                </div>
              )}
              {typeof caseData.child.gender === 'string' && (
                <div>
                  <span className="text-gray-500">Gender</span>
                  <p className="font-medium">{caseData.child.gender}</p>
                </div>
              )}
              {typeof caseData.child.diagnosisStatus === 'string' && (
                <div>
                  <span className="text-gray-500">Diagnosis Status</span>
                  <p className="font-medium">{caseData.child.diagnosisStatus}</p>
                </div>
              )}
              {Array.isArray(caseData.child.conditions) &&
                caseData.child.conditions.length > 0 && (
                  <div>
                    <span className="text-gray-500">Conditions</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {caseData.child.conditions.map((c: any, i: number) => {
                        const label =
                          typeof c === 'string'
                            ? c
                            : typeof c.type === 'string'
                              ? c.type
                              : typeof c.name === 'string'
                                ? c.name
                                : typeof c.condition === 'string'
                                  ? c.condition
                                  : JSON.stringify(c);
                        return (
                          <Badge key={i} color="gray">
                            {label}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
            </div>
          </Card>
        )}

        {/* --- Internal Notes --- */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <StickyNote className="h-5 w-5" /> Internal Notes
          </h3>
          {loadingNotes ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-4">
                {notes.slice(0, 5).map((note: any) => {
                  const content =
                    typeof note.content === 'string' ? note.content : '';
                  const authorName =
                    note.author && typeof note.author === 'object' && typeof note.author.name === 'string'
                      ? note.author.name
                      : note.user && typeof note.user === 'object' && typeof note.user.name === 'string'
                        ? note.user.name
                        : '';

                  return (
                    <div
                      key={note.id}
                      className="text-sm border-l-2 border-teal-200 pl-3"
                    >
                      <p>{content}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {authorName && `${authorName} \u00B7 `}
                        {formatDate(note.createdAt)}
                      </p>
                    </div>
                  );
                })}
                {notes.length === 0 && (
                  <p className="text-sm text-gray-500">No notes yet</p>
                )}
              </div>
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
      </div>
    </div>
  );
}
