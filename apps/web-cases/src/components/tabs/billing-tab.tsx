'use client';

import { useState } from 'react';
import {
  useBilling,
  useBillingSummary,
  useCreateBilling,
  useUpdateBilling,
} from '@/hooks/use-cases';
import { billingStatusColors, formatDate, formatCurrency } from '@/lib/utils';
import {
  Button,
  Card,
  Badge,
  Input,
  Label,
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
import { Plus, Loader2, DollarSign, Pencil } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  SUBMITTED: 'Submitted',
  BILLED: 'Billed',
  PAID: 'Paid',
  DENIED: 'Denied',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
};

const SUMMARY_CARDS = [
  { key: 'totalBilled', label: 'Total Billed', textClass: 'text-gray-900' },
  { key: 'totalPaid', label: 'Paid', textClass: 'text-green-600' },
  { key: 'totalPending', label: 'Pending', textClass: 'text-yellow-600' },
  { key: 'totalOverdue', label: 'Overdue', textClass: 'text-red-600' },
] as const;

interface BillingTabProps {
  caseId: string;
}

export function BillingTab({ caseId }: BillingTabProps) {
  const { toast } = useToast();
  const { data: billingData, isLoading } = useBilling(caseId);
  const { data: summaryData } = useBillingSummary(caseId);
  const createBilling = useCreateBilling();
  const updateBilling = useUpdateBilling();

  const [showCreate, setShowCreate] = useState(false);
  const [editingEntry, setEditingEntry] = useState<{
    id: string;
    serviceCode: string;
    description: string;
    amount: string;
    status: string;
  } | null>(null);

  // Create form state
  const [newEntry, setNewEntry] = useState({
    serviceCode: '',
    description: '',
    amount: '',
    status: 'PENDING',
    serviceDate: new Date().toISOString().split('T')[0],
  });

  const entries: Record<string, unknown>[] = Array.isArray(billingData?.data)
    ? billingData.data
    : Array.isArray(billingData)
      ? billingData
      : [];

  const summary =
    summaryData && typeof summaryData === 'object'
      ? (summaryData as Record<string, unknown>)
      : null;

  const handleCreate = async () => {
    const amount = parseFloat(newEntry.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Please enter a valid amount', variant: 'destructive' });
      return;
    }
    try {
      await createBilling.mutateAsync({
        caseId,
        data: {
          serviceCode: newEntry.serviceCode.trim() || undefined,
          amount,
          serviceDate: new Date(newEntry.serviceDate).toISOString(),
          notes: newEntry.description.trim() || undefined,
        },
      });
      setShowCreate(false);
      setNewEntry({
        serviceCode: '',
        description: '',
        amount: '',
        status: 'PENDING',
        serviceDate: new Date().toISOString().split('T')[0],
      });
    } catch {
      // Error handled by hook
    }
  };

  const handleUpdate = async () => {
    if (!editingEntry) return;
    const amount = parseFloat(editingEntry.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Please enter a valid amount', variant: 'destructive' });
      return;
    }
    try {
      await updateBilling.mutateAsync({
        caseId,
        billingId: editingEntry.id,
        data: {
          status: editingEntry.status,
          serviceCode: editingEntry.serviceCode.trim() || undefined,
          amount,
        },
      });
      setEditingEntry(null);
    } catch {
      // Error handled by hook
    }
  };

  const openEdit = (entry: Record<string, unknown>) => {
    setEditingEntry({
      id: typeof entry.id === 'string' ? entry.id : String(entry.id),
      serviceCode: typeof entry.serviceCode === 'string' ? entry.serviceCode : '',
      description: typeof entry.description === 'string' ? entry.description : '',
      amount: typeof entry.amount === 'number' ? String(entry.amount) : '0',
      status: typeof entry.status === 'string' ? entry.status : 'PENDING',
    });
  };

  const statusBadgeColor = (status: string): string => {
    switch (status) {
      case 'PAID':
        return 'green';
      case 'PENDING':
      case 'BILLED':
        return 'yellow';
      case 'SUBMITTED':
        return 'blue';
      case 'DENIED':
      case 'OVERDUE':
        return 'red';
      case 'CANCELLED':
        return 'gray';
      default:
        return 'gray';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SUMMARY_CARDS.map(({ key, label, textClass }) => {
            const value = typeof summary[key] === 'number' ? (summary[key] as number) : 0;
            return (
              <Card key={key} className="p-4 border border-gray-100 text-center">
                <p className="text-sm text-gray-500">{label}</p>
                <p className={`text-2xl font-bold ${textClass}`}>
                  {formatCurrency(value)}
                </p>
              </Card>
            );
          })}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Billing ({entries.length})
        </h2>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button variant="primary" className="bg-teal-600 hover:bg-teal-700">
              <Plus className="h-4 w-4 mr-2" />
              New Entry
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Billing Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Service Code</Label>
                <Input
                  value={newEntry.serviceCode}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, serviceCode: e.target.value })
                  }
                  placeholder="e.g., 97530"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={newEntry.description}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, description: e.target.value })
                  }
                  placeholder="Service description"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Amount ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newEntry.amount}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, amount: e.target.value })
                  }
                  placeholder="0.00"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Service Date</Label>
                <Input
                  type="date"
                  value={newEntry.serviceDate}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, serviceDate: e.target.value })
                  }
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={newEntry.status}
                  onValueChange={(v) => setNewEntry({ ...newEntry, status: v })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="SUBMITTED">Submitted</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleCreate}
                disabled={createBilling.isPending}
                className="w-full bg-teal-600 hover:bg-teal-700"
                variant="primary"
              >
                {createBilling.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Create Entry
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingEntry}
        onOpenChange={(open) => !open && setEditingEntry(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Billing Entry</DialogTitle>
          </DialogHeader>
          {editingEntry && (
            <div className="space-y-4 mt-4">
              <div>
                <Label>Service Code</Label>
                <Input
                  value={editingEntry.serviceCode}
                  onChange={(e) =>
                    setEditingEntry({ ...editingEntry, serviceCode: e.target.value })
                  }
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Amount ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingEntry.amount}
                  onChange={(e) =>
                    setEditingEntry({ ...editingEntry, amount: e.target.value })
                  }
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={editingEntry.status}
                  onValueChange={(v) =>
                    setEditingEntry({ ...editingEntry, status: v })
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="SUBMITTED">Submitted</SelectItem>
                    <SelectItem value="BILLED">Billed</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="DENIED">Denied</SelectItem>
                    <SelectItem value="OVERDUE">Overdue</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleUpdate}
                disabled={updateBilling.isPending}
                className="w-full bg-teal-600 hover:bg-teal-700"
                variant="primary"
              >
                {updateBilling.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Billing Entries List */}
      {entries.length === 0 ? (
        <div className="text-center py-16">
          <DollarSign className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-medium text-gray-900 mb-1">
            No billing entries yet
          </h3>
          <p className="text-sm text-gray-500">
            Create billing entries to track services and payments.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const entryId =
              typeof entry.id === 'string' ? entry.id : String(entry.id);
            const description =
              typeof entry.description === 'string' ? entry.description : '';
            const serviceCode =
              typeof entry.serviceCode === 'string' ? entry.serviceCode : '';
            const status =
              typeof entry.status === 'string' ? entry.status : '';
            const amount =
              typeof entry.amount === 'number' ? entry.amount : 0;
            const serviceDate =
              typeof entry.serviceDate === 'string'
                ? entry.serviceDate
                : typeof entry.createdAt === 'string'
                  ? entry.createdAt
                  : '';

            return (
              <Card
                key={entryId}
                className="p-4 border border-gray-100 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {description || serviceCode || 'Service'}
                    </span>
                    <Badge color={statusBadgeColor(status)}>
                      {STATUS_LABELS[status] || status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    {serviceCode && `${serviceCode} \u00B7 `}
                    {formatDate(serviceDate)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold text-gray-900">
                    {formatCurrency(amount)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8"
                    onClick={() => openEdit(entry)}
                  >
                    <Pencil className="h-4 w-4 text-gray-400" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
