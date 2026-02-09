'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCase, useUpdateCaseStatus } from '@/hooks/use-cases';
import { CaseDetailSidebar } from '@/components/case-detail-sidebar';
import { caseStatusColors, caseStatusLabels } from '@/lib/utils';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Sheet,
  SheetContent,
  SheetTrigger,
  useToast,
} from '@upllyft/ui';
import { ArrowLeft, Menu } from 'lucide-react';
import type { ReactNode } from 'react';

const allStatuses = ['INTAKE', 'ACTIVE', 'ON_HOLD', 'DISCHARGED', 'CLOSED'];

export default function CaseDetailLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const { data: caseData, isLoading } = useCase(id);
  const updateStatus = useUpdateCaseStatus();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateStatus.mutateAsync({ id, data: { status: newStatus } });
      toast({ title: `Status updated to ${caseStatusLabels[newStatus] ?? newStatus}` });
    } catch {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)]">
        <div className="w-64 bg-white border-r border-gray-200 shrink-0 p-4 space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-full" />
          <Skeleton className="h-4 w-32" />
          <div className="space-y-2 mt-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const status = caseData?.status ?? '';
  const caseNumber = caseData?.caseNumber ?? '';
  const childName = caseData?.child?.name ?? 'Patient';

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)]">
      {/* Case header bar */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-gray-900">{childName}</h1>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${caseStatusColors[status] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  {caseStatusLabels[status] ?? status}
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono">{caseNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-36 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {caseStatusLabels[s] ?? s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Mobile sidebar toggle */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64">
                <CaseDetailSidebar caseId={id} caseData={caseData} />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Body: sidebar + content */}
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <CaseDetailSidebar caseId={id} caseData={caseData} />
        </div>
        {/* Main content */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-5xl">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
