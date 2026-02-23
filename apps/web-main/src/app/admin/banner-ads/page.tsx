'use client';

import { useState } from 'react';
import {
  Card,
  Badge,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Skeleton,
  useToast,
} from '@upllyft/ui';
import {
  useBannerAds,
  useCreateBannerAd,
  useUpdateBannerAd,
  useDeleteBannerAd,
} from '@/hooks/use-admin';
import type { BannerAd } from '@/lib/api/admin';

const PLACEMENTS = ['FEED', 'SIDEBAR', 'BANNER_TOP', 'BANNER_BOTTOM'] as const;

const statusColor: Record<string, 'gray' | 'green' | 'yellow' | 'red'> = {
  DRAFT: 'gray',
  ACTIVE: 'green',
  PAUSED: 'yellow',
  EXPIRED: 'red',
};

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const emptyForm = {
  title: '',
  imageUrl: '',
  targetUrl: '',
  placement: 'FEED' as BannerAd['placement'],
  status: 'DRAFT' as BannerAd['status'],
  priority: 1,
  startDate: '',
  endDate: '',
};

export default function BannerAdsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('All');
  const [placementFilter, setPlacementFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<BannerAd | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BannerAd | null>(null);
  const { toast } = useToast();

  const params: Record<string, string | number | undefined> = { page };
  if (statusFilter !== 'All') params.status = statusFilter;
  if (placementFilter !== 'All') params.placement = placementFilter;
  if (search) params.search = search;

  const { data, isLoading } = useBannerAds(params);
  const createAd = useCreateBannerAd();
  const updateAd = useUpdateBannerAd();
  const deleteAd = useDeleteBannerAd();

  const ads = data?.data ?? [];
  const activeCount = ads.filter((a) => a.status === 'ACTIVE').length;
  const pausedCount = ads.filter((a) => a.status === 'PAUSED').length;

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (ad: BannerAd) => {
    setEditing(ad);
    setForm({
      title: ad.title,
      imageUrl: ad.imageUrl,
      targetUrl: ad.targetUrl,
      placement: ad.placement,
      status: ad.status,
      priority: ad.priority,
      startDate: ad.startDate?.split('T')[0] ?? '',
      endDate: ad.endDate?.split('T')[0] ?? '',
    });
    setShowForm(true);
  };

  const handleSave = () => {
    const payload = {
      ...form,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
    };

    if (editing) {
      updateAd.mutate(
        { id: editing.id, ...payload },
        {
          onSuccess: () => {
            toast({ title: 'Ad updated' });
            setShowForm(false);
          },
          onError: () => toast({ title: 'Update failed', variant: 'destructive' }),
        },
      );
    } else {
      createAd.mutate(payload as Parameters<typeof createAd.mutate>[0], {
        onSuccess: () => {
          toast({ title: 'Ad created' });
          setShowForm(false);
        },
        onError: () => toast({ title: 'Create failed', variant: 'destructive' }),
      });
    }
  };

  const toggleStatus = (ad: BannerAd) => {
    const newStatus = ad.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    updateAd.mutate({ id: ad.id, status: newStatus });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteAd.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast({ title: 'Ad deleted' });
        setDeleteTarget(null);
      },
      onError: () => toast({ title: 'Delete failed', variant: 'destructive' }),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Banner Ads</h1>
          <p className="text-gray-500 mt-1">
            {ads.length} total &middot; {activeCount} active &middot; {pausedCount} paused
          </p>
        </div>
        <Button onClick={openCreate}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Ad
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="PAUSED">Paused</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
            </SelectContent>
          </Select>
          <Select value={placementFilter} onValueChange={setPlacementFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Placement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Placements</SelectItem>
              {PLACEMENTS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ad</TableHead>
              <TableHead>Placement</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date Range</TableHead>
              <TableHead className="text-right">Impressions</TableHead>
              <TableHead className="text-right">Clicks</TableHead>
              <TableHead className="text-right">CTR</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : !ads.length ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-400">
                  No banner ads found
                </TableCell>
              </TableRow>
            ) : (
              ads.map((ad) => {
                const ctr =
                  ad.impressions && ad.impressions > 0
                    ? ((ad.clicks ?? 0) / ad.impressions) * 100
                    : 0;
                return (
                  <TableRow key={ad.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {ad.imageUrl ? (
                          <img
                            src={ad.imageUrl}
                            alt=""
                            className="w-12 h-8 rounded object-cover bg-gray-100"
                          />
                        ) : (
                          <div className="w-12 h-8 rounded bg-gray-100" />
                        )}
                        <span className="font-medium text-sm text-gray-900">{ad.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge color="gray">{ad.placement.replace(/_/g, ' ')}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge color={statusColor[ad.status] ?? 'gray'}>{ad.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatDate(ad.startDate)} – {formatDate(ad.endDate)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {(ad.impressions ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {(ad.clicks ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-sm">{ctr.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleStatus(ad)}
                          title={ad.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                        >
                          {ad.status === 'ACTIVE' ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(ad)}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => setDeleteTarget(ad)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {data && data.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-sm text-gray-500">Page {page} of {data.pages}</span>
            <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </Card>

      {/* Create/Edit dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Ad' : 'Create Ad'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
              {form.imageUrl && (
                <img src={form.imageUrl} alt="Preview" className="w-full h-24 object-cover rounded-lg bg-gray-100" />
              )}
            </div>
            <div className="space-y-2">
              <Label>Target URL</Label>
              <Input value={form.targetUrl} onChange={(e) => setForm({ ...form, targetUrl: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Placement</Label>
                <Select value={form.placement} onValueChange={(v) => setForm({ ...form, placement: v as BannerAd['placement'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLACEMENTS.map((p) => (
                      <SelectItem key={p} value={p}>{p.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as BannerAd['status'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED'].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={createAd.isPending || updateAd.isPending || !form.title.trim()}
            >
              {createAd.isPending || updateAd.isPending ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Banner Ad</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.title}&rdquo;? This will permanently remove the ad and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteAd.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
