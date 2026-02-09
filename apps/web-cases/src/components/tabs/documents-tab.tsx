'use client';

import { useState } from 'react';
import {
  useDocuments,
  useCreateDocument,
  useShareDocument,
  useRevokeDocumentShare,
  useGenerateReport,
} from '@/hooks/use-cases';
import { documentTypeLabels, formatDate } from '@/lib/utils';
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
  FileText,
  Sparkles,
  Share2,
  FileArchive,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const REPORT_TYPES: Record<string, string> = {
  progress: 'Progress Report',
  case_summary: 'Case Summary',
  discharge: 'Discharge Summary',
};

interface DocumentsTabProps {
  caseId: string;
}

export function DocumentsTab({ caseId }: DocumentsTabProps) {
  const { toast } = useToast();
  const { data: documentsData, isLoading } = useDocuments(caseId);
  const createDocument = useCreateDocument();
  const shareDocument = useShareDocument();
  const revokeShare = useRevokeDocumentShare();
  const generateReport = useGenerateReport();

  const [showCreate, setShowCreate] = useState(false);
  const [showShareDocId, setShowShareDocId] = useState<string | null>(null);
  const [showReportOptions, setShowReportOptions] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  // Create document form
  const [newDoc, setNewDoc] = useState({
    type: 'PROGRESS_NOTE',
    title: '',
    content: '',
    fileUrl: '',
  });

  // Share form
  const [shareUserId, setShareUserId] = useState('');

  // Report generation form
  const [reportType, setReportType] = useState('progress');
  const [reportDateFrom, setReportDateFrom] = useState('');
  const [reportDateTo, setReportDateTo] = useState('');
  const [reportFocusAreas, setReportFocusAreas] = useState('');

  const documents: Record<string, unknown>[] = Array.isArray(documentsData?.data)
    ? documentsData.data
    : Array.isArray(documentsData)
      ? documentsData
      : [];

  const handleCreate = async () => {
    if (!newDoc.title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    try {
      await createDocument.mutateAsync({
        caseId,
        data: {
          type: newDoc.type,
          title: newDoc.title.trim(),
          content: newDoc.content.trim() || undefined,
          fileUrl: newDoc.fileUrl.trim() || undefined,
        },
      });
      setShowCreate(false);
      setNewDoc({ type: 'PROGRESS_NOTE', title: '', content: '', fileUrl: '' });
    } catch {
      // Error handled by hook
    }
  };

  const handleShare = async (documentId: string) => {
    if (!shareUserId.trim()) {
      toast({ title: 'User ID is required', variant: 'destructive' });
      return;
    }
    try {
      await shareDocument.mutateAsync({
        caseId,
        documentId,
        data: { sharedWithId: shareUserId.trim() },
      });
      setShowShareDocId(null);
      setShareUserId('');
    } catch {
      // Error handled by hook
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    try {
      await revokeShare.mutateAsync({ caseId, shareId });
    } catch {
      // Error handled by hook
    }
  };

  const handleGenerateReport = async () => {
    try {
      const payload: Record<string, unknown> = { type: reportType };
      if (reportDateFrom) payload.startDate = reportDateFrom;
      if (reportDateTo) payload.endDate = reportDateTo;
      if (reportFocusAreas.trim()) payload.focusAreas = reportFocusAreas.trim();
      await generateReport.mutateAsync({ caseId, data: payload });
      setShowReportOptions(false);
      setReportType('progress');
      setReportDateFrom('');
      setReportDateTo('');
      setReportFocusAreas('');
    } catch {
      // Error handled by hook
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-gray-900">
          Documents ({documents.length})
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowReportOptions(!showReportOptions)}
          >
            <Sparkles className="h-4 w-4 mr-1" />
            AI Report
            {showReportOptions ? (
              <ChevronUp className="h-3 w-3 ml-1" />
            ) : (
              <ChevronDown className="h-3 w-3 ml-1" />
            )}
          </Button>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button variant="primary" className="bg-teal-600 hover:bg-teal-700">
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Document</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Type</Label>
                  <Select
                    value={newDoc.type}
                    onValueChange={(v) => setNewDoc({ ...newDoc, type: v })}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(documentTypeLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Title</Label>
                  <Input
                    value={newDoc.title}
                    onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                    placeholder="Document title"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Content</Label>
                  <Textarea
                    value={newDoc.content}
                    onChange={(e) => setNewDoc({ ...newDoc, content: e.target.value })}
                    placeholder="Document content"
                    rows={4}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>File URL (optional)</Label>
                  <Input
                    value={newDoc.fileUrl}
                    onChange={(e) => setNewDoc({ ...newDoc, fileUrl: e.target.value })}
                    placeholder="https://..."
                    className="mt-1.5"
                  />
                </div>
                <Button
                  onClick={handleCreate}
                  disabled={createDocument.isPending}
                  className="w-full bg-teal-600 hover:bg-teal-700"
                  variant="primary"
                >
                  {createDocument.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Add Document
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* AI Report Generation Panel */}
      {showReportOptions && (
        <Card className="p-4 border-teal-200 bg-teal-50/30">
          <h4 className="font-medium text-sm mb-3">Generate AI Report</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(REPORT_TYPES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Focus Areas (optional)</Label>
              <Input
                value={reportFocusAreas}
                onChange={(e) => setReportFocusAreas(e.target.value)}
                placeholder="e.g., communication, behavior"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">From Date (optional)</Label>
              <Input
                type="date"
                value={reportDateFrom}
                onChange={(e) => setReportDateFrom(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">To Date (optional)</Label>
              <Input
                type="date"
                value={reportDateTo}
                onChange={(e) => setReportDateTo(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <Button
            onClick={handleGenerateReport}
            disabled={generateReport.isPending}
            className="mt-3 bg-teal-600 hover:bg-teal-700"
            variant="primary"
          >
            {generateReport.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Generate Report
          </Button>
        </Card>
      )}

      {/* Document List */}
      {documents.length === 0 ? (
        <div className="text-center py-16">
          <FileArchive className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-medium text-gray-900 mb-1">No documents yet</h3>
          <p className="text-sm text-gray-500">
            Add documents or generate AI reports for this case.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => {
            const docId = typeof doc.id === 'string' ? doc.id : String(doc.id);
            const title = typeof doc.title === 'string' ? doc.title : 'Untitled';
            const type = typeof doc.type === 'string' ? doc.type : '';
            const content = typeof doc.content === 'string' ? doc.content : '';
            const createdAt = typeof doc.createdAt === 'string' ? doc.createdAt : '';
            const shares = Array.isArray(doc.shares) ? doc.shares : [];
            const isExpanded = expandedDoc === docId;

            return (
              <Card key={docId} className="p-4 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                    onClick={() => setExpandedDoc(isExpanded ? null : docId)}
                  >
                    <div className="h-10 w-10 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge color="gray">
                          {documentTypeLabels[type] || type}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {formatDate(createdAt)}
                        </span>
                        {shares.length > 0 && (
                          <Badge color="blue">
                            Shared ({shares.length})
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Dialog
                    open={showShareDocId === docId}
                    onOpenChange={(open) => setShowShareDocId(open ? docId : null)}
                  >
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Share Document</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div>
                          <Label>User ID</Label>
                          <Input
                            value={shareUserId}
                            onChange={(e) => setShareUserId(e.target.value)}
                            placeholder="Enter user ID to share with"
                            className="mt-1.5"
                          />
                        </div>
                        <Button
                          onClick={() => handleShare(docId)}
                          disabled={shareDocument.isPending}
                          className="w-full bg-teal-600 hover:bg-teal-700"
                          variant="primary"
                        >
                          {shareDocument.isPending && (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          )}
                          Share
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Expanded content + shares */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t space-y-3">
                    {content && (
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">
                        {content}
                      </p>
                    )}
                    {shares.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                          Shared With
                        </p>
                        <div className="space-y-2">
                          {shares.map((share: Record<string, unknown>) => {
                            const shareId =
                              typeof share.id === 'string' ? share.id : String(share.id);
                            const sharedWith =
                              share.sharedWith &&
                              typeof share.sharedWith === 'object'
                                ? (share.sharedWith as Record<string, unknown>)
                                : null;
                            const shareName =
                              sharedWith && typeof sharedWith.name === 'string'
                                ? sharedWith.name
                                : null;
                            const shareEmail =
                              sharedWith && typeof sharedWith.email === 'string'
                                ? sharedWith.email
                                : null;
                            const sharedWithId =
                              typeof share.sharedWithId === 'string'
                                ? share.sharedWithId
                                : '';
                            const shareCreatedAt =
                              typeof share.createdAt === 'string'
                                ? share.createdAt
                                : '';

                            return (
                              <div
                                key={shareId}
                                className="flex items-center justify-between bg-gray-50 rounded p-2"
                              >
                                <div className="text-sm">
                                  <span className="font-medium">
                                    {shareName || shareEmail || sharedWithId}
                                  </span>
                                  {shareName && shareEmail && (
                                    <span className="text-gray-400 ml-1 text-xs">
                                      ({shareEmail})
                                    </span>
                                  )}
                                  <span className="text-xs text-gray-400 ml-2">
                                    {formatDate(shareCreatedAt)}
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleRevokeShare(shareId)}
                                  disabled={revokeShare.isPending}
                                >
                                  {revokeShare.isPending ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <X className="h-3 w-3 mr-1" />
                                  )}
                                  Revoke
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
