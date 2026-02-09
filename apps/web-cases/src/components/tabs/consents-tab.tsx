'use client';

import { useState } from 'react';
import {
  useConsents,
  useCreateConsent,
  useRevokeConsent,
  useComplianceStatus,
} from '@/hooks/use-cases';
import { consentTypeLabels, formatDate } from '@/lib/utils';
import {
  Button,
  Card,
  Badge,
  Input,
  Label,
  Textarea,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from '@upllyft/ui';
import {
  Plus,
  Loader2,
  Shield,
  XCircle,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

interface ConsentsTabProps {
  caseId: string;
}

export function ConsentsTab({ caseId }: ConsentsTabProps) {
  const { toast } = useToast();
  const { data: consentsData, isLoading } = useConsents(caseId);
  const { data: complianceData } = useComplianceStatus(caseId);
  const createConsent = useCreateConsent();
  const revokeConsent = useRevokeConsent();

  const [showCreate, setShowCreate] = useState(false);
  const [newConsent, setNewConsent] = useState({
    type: 'TREATMENT',
    validUntil: '',
    notes: '',
  });

  const consents: Record<string, unknown>[] = Array.isArray(consentsData)
    ? consentsData
    : [];

  const compliance =
    complianceData && typeof complianceData === 'object'
      ? (complianceData as Record<string, unknown>)
      : null;

  const isCompliant =
    compliance && typeof compliance.isCompliant === 'boolean'
      ? compliance.isCompliant
      : null;

  const missingConsents = Array.isArray(compliance?.missingConsents)
    ? (compliance.missingConsents as string[])
    : [];

  const activeConsents = Array.isArray(compliance?.activeConsents)
    ? (compliance.activeConsents as Record<string, unknown>[])
    : [];

  const handleCreate = async () => {
    try {
      await createConsent.mutateAsync({
        caseId,
        data: {
          type: newConsent.type,
          validUntil: newConsent.validUntil || undefined,
          notes: newConsent.notes.trim() || undefined,
        },
      });
      setShowCreate(false);
      setNewConsent({ type: 'TREATMENT', validUntil: '', notes: '' });
    } catch {
      // Error handled by hook
    }
  };

  const handleRevoke = async (consentId: string) => {
    try {
      await revokeConsent.mutateAsync({ caseId, consentId });
    } catch {
      // Error handled by hook
    }
  };

  const getConsentStatus = (
    consent: Record<string, unknown>
  ): { label: string; color: string } => {
    const revokedAt = consent.revokedAt;
    const validUntil = typeof consent.validUntil === 'string' ? consent.validUntil : null;

    if (revokedAt) {
      return { label: 'Revoked', color: 'red' };
    }
    if (validUntil && new Date(validUntil) < new Date()) {
      return { label: 'Expired', color: 'yellow' };
    }
    return { label: 'Active', color: 'green' };
  };

  const isConsentActive = (consent: Record<string, unknown>): boolean => {
    const status = getConsentStatus(consent);
    return status.label === 'Active';
  };

  // Find soon-expiring consents from active consents
  const soonExpiringConsents = activeConsents.filter((c) => {
    const validUntil = typeof c.validUntil === 'string' ? c.validUntil : null;
    if (!validUntil) return false;
    const expiryDate = new Date(validUntil);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiryDate <= thirtyDaysFromNow && expiryDate > new Date();
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compliance Status Banner */}
      {isCompliant !== null && (
        <Card
          className={`p-4 border ${
            isCompliant
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {isCompliant ? (
              <CheckCircle className="h-6 w-6 text-green-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-red-600 shrink-0" />
            )}
            <div>
              <p className="font-medium text-gray-900">
                {isCompliant
                  ? 'All required consents are active'
                  : 'Missing required consents'}
              </p>
              {missingConsents.length > 0 && (
                <p className="text-sm text-red-700 mt-1">
                  Missing:{' '}
                  {missingConsents
                    .map((type) => consentTypeLabels[type] || type)
                    .join(', ')}
                </p>
              )}
              {soonExpiringConsents.length > 0 && (
                <p className="text-sm text-yellow-700 mt-1">
                  Expiring soon:{' '}
                  {soonExpiringConsents
                    .map((c) => {
                      const type = typeof c.type === 'string' ? c.type : '';
                      const validUntil =
                        typeof c.validUntil === 'string' ? c.validUntil : '';
                      return `${consentTypeLabels[type] || type} (${formatDate(validUntil)})`;
                    })
                    .join(', ')}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Consents ({consents.length})
        </h2>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button variant="primary" className="bg-teal-600 hover:bg-teal-700">
              <Plus className="h-4 w-4 mr-2" />
              Grant Consent
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Grant Consent</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Type</Label>
                <Select
                  value={newConsent.type}
                  onValueChange={(v) =>
                    setNewConsent({ ...newConsent, type: v })
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(consentTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valid Until (optional)</Label>
                <Input
                  type="date"
                  value={newConsent.validUntil}
                  onChange={(e) =>
                    setNewConsent({ ...newConsent, validUntil: e.target.value })
                  }
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={newConsent.notes}
                  onChange={(e) =>
                    setNewConsent({ ...newConsent, notes: e.target.value })
                  }
                  placeholder="Additional notes about this consent"
                  rows={2}
                  className="mt-1.5"
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={createConsent.isPending}
                className="w-full bg-teal-600 hover:bg-teal-700"
                variant="primary"
              >
                {createConsent.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Grant Consent
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Consent List */}
      {consents.length === 0 ? (
        <div className="text-center py-16">
          <Shield className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-medium text-gray-900 mb-1">
            No consents recorded yet
          </h3>
          <p className="text-sm text-gray-500">
            Record patient consents to track compliance.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {consents.map((consent) => {
            const consentId =
              typeof consent.id === 'string' ? consent.id : String(consent.id);
            const type =
              typeof consent.type === 'string' ? consent.type : '';
            const notes =
              typeof consent.notes === 'string' ? consent.notes : '';
            const validUntil =
              typeof consent.validUntil === 'string' ? consent.validUntil : null;
            const createdAt =
              typeof consent.createdAt === 'string' ? consent.createdAt : '';
            const grantedBy =
              consent.grantedBy && typeof consent.grantedBy === 'object'
                ? (consent.grantedBy as Record<string, unknown>)
                : null;
            const grantedByName =
              grantedBy && typeof grantedBy.name === 'string'
                ? grantedBy.name
                : 'Unknown';

            const status = getConsentStatus(consent);
            const active = isConsentActive(consent);

            return (
              <Card
                key={consentId}
                className="p-4 border border-gray-100 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {consentTypeLabels[type] || type}
                    </span>
                    <Badge color={status.color as 'green' | 'yellow' | 'red'}>
                      {status.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    Granted by {grantedByName}
                    {createdAt && ` \u00B7 ${formatDate(createdAt)}`}
                    {validUntil && ` \u00B7 Expires ${formatDate(validUntil)}`}
                  </p>
                  {notes && (
                    <p className="text-sm text-gray-600 mt-1">{notes}</p>
                  )}
                </div>
                {active && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    onClick={() => handleRevoke(consentId)}
                    disabled={revokeConsent.isPending}
                  >
                    {revokeConsent.isPending ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-1" />
                    )}
                    Revoke
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
