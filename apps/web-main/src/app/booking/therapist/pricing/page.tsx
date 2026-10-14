'use client';

import { useEffect, useMemo, useState } from 'react';
import { DEPARTMENTS, DURATION_PRESETS, type DepartmentKey } from '@upllyft/types';
import Link from 'next/link';
import { BookingShell } from '@/booking/components/booking-shell';
import {
  useMySessionTypes,
  useMyPricing,
  useCreateSessionType,
  useUpdateSessionType,
  useDeleteSessionType,
  useUpdateSessionPricing,
  useMyTherapistProfile,
  useUpdateTherapistProfile,
} from '@/booking/hooks/use-marketplace';
import { formatCurrency, formatDuration } from '@/booking/lib/utils';
import { useRegion } from '@upllyft/api-client';
import type { SessionType, SessionPricing } from '@/booking/lib/api/marketplace';
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
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  toast,
} from '@upllyft/ui';

export default function TherapistPricingPage() {
  const { data: sessionTypes, isLoading: typesLoading } = useMySessionTypes();
  const { data: pricing, isLoading: pricingLoading } = useMyPricing();
  const createType = useCreateSessionType();
  const updateType = useUpdateSessionType();
  const deleteType = useDeleteSessionType();
  const updatePricing = useUpdateSessionPricing();
  // New prices are set in the therapist's regional currency (the label said USD
  // while the server stored INR). Existing prices keep their own currency.
  const { currency: regionCurrency } = useRegion();
  const { data: profile } = useMyTherapistProfile();
  const updateProfile = useUpdateTherapistProfile();

  // Same service list and durations as the organisation's Fees step at set-up.
  const deptKey = profile?.department as DepartmentKey | undefined;
  const services = deptKey && DEPARTMENTS[deptKey] ? DEPARTMENTS[deptKey].services : [];
  const durations: number[] = [...DURATION_PRESETS.extended];

  // A service's durations sit together, shortest first, as on the set-up page.
  const sortedTypes = useMemo(
    () =>
      (sessionTypes ?? []).slice().sort((a, b) => a.name.localeCompare(b.name) || a.duration - b.duration),
    [sessionTypes],
  );

  // Sliding scale / insurance-covered rate (also set in the set-up Fees step).
  const [slidingScale, setSlidingScale] = useState(false);
  const [slidingScaleRate, setSlidingScaleRate] = useState('');
  useEffect(() => {
    if (profile) {
      setSlidingScale(profile.slidingScaleAvailable ?? false);
      setSlidingScaleRate(profile.slidingScaleRate != null ? String(profile.slidingScaleRate) : '');
    }
  }, [profile]);

  function saveSlidingScale() {
    const rate = slidingScaleRate.trim() ? Number(slidingScaleRate) : null;
    if (slidingScale && rate !== null && (!Number.isFinite(rate) || rate < 0)) {
      toast({ title: 'Invalid rate', variant: 'destructive' });
      return;
    }
    updateProfile.mutate({ slidingScaleAvailable: slidingScale, slidingScaleRate: slidingScale ? rate : null });
  }

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SessionType | null>(null);

  // Add form state
  const [addName, setAddName] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [addDuration, setAddDuration] = useState('60');
  const [addPrice, setAddPrice] = useState('');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editPrice, setEditPrice] = useState('');
  // The price being edited keeps the currency it was set in.
  const editCurrency =
    (editTarget && pricing?.find((p: SessionPricing) => p.sessionTypeId === editTarget.id)?.currency) ||
    regionCurrency;

  const isLoading = typesLoading || pricingLoading;

  function getPriceForType(typeId: string): SessionPricing | undefined {
    return pricing?.find((p) => p.sessionTypeId === typeId);
  }

  // The price families are charged: the Pricing record, else the fee set at set-up.
  function priceOf(st: SessionType): { price: number; currency: string } | null {
    const p = getPriceForType(st.id);
    if (p) return { price: p.price, currency: p.currency };
    if (typeof st.defaultPrice === 'number') return { price: st.defaultPrice, currency: st.currency || regionCurrency };
    return null;
  }

  function handleAdd() {
    if (!addName.trim()) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }
    const duration = parseInt(addDuration, 10);
    if (!duration || duration <= 0) {
      toast({ title: 'Invalid duration', variant: 'destructive' });
      return;
    }
    const price = parseFloat(addPrice);
    if (!addPrice || isNaN(price) || price < 0) {
      toast({ title: 'Invalid price', variant: 'destructive' });
      return;
    }

    if (sessionTypes?.some((st) => st.isActive && st.name === addName.trim() && st.duration === duration)) {
      toast({
        title: 'Already offered',
        description: `${addName.trim()} (${duration} min) is already in your list.`,
        variant: 'destructive',
      });
      return;
    }

    createType.mutate(
      {
        name: addName.trim(),
        description: addDescription.trim() || undefined,
        duration,
        defaultPrice: price,
        currency: regionCurrency,
      },
      {
        onSuccess: (newType) => {
          updatePricing.mutate({ sessionTypeId: newType.id, price, currency: regionCurrency });
          setAddOpen(false);
          setAddName('');
          setAddDescription('');
          setAddDuration('60');
          setAddPrice('');
        },
      },
    );
  }

  function openEdit(st: SessionType) {
    const p = priceOf(st);
    setEditTarget(st);
    setEditName(st.name);
    setEditDescription(st.description || '');
    setEditDuration(String(st.duration));
    setEditPrice(p ? String(p.price) : '');
    setEditOpen(true);
  }

  function handleEdit() {
    if (!editTarget) return;
    if (!editName.trim()) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }
    const duration = parseInt(editDuration, 10);
    if (!duration || duration <= 0) {
      toast({ title: 'Invalid duration', variant: 'destructive' });
      return;
    }

    updateType.mutate(
      {
        id: editTarget.id,
        data: { name: editName.trim(), description: editDescription.trim() || undefined, duration },
      },
      {
        onSuccess: () => {
          const price = parseFloat(editPrice);
          if (!isNaN(price) && price >= 0) {
            updatePricing.mutate({ sessionTypeId: editTarget!.id, price });
          }
          setEditOpen(false);
          setEditTarget(null);
        },
      },
    );
  }

  function handleDelete(id: string) {
    deleteType.mutate(id);
  }

  return (
    <BookingShell>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Session Types & Pricing</h1>
            <p className="text-gray-500 mt-1">Manage the services you offer and their pricing</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="outline" className="rounded-xl">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Hub
              </Button>
            </Link>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-xl">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Session Type
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Add Session Type</DialogTitle>
                  <DialogDescription>Create a new session type with pricing</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-name">Service *</Label>
                    {services.length > 0 && (
                      <select
                        id="add-service"
                        value={services.some((s) => s.label === addName) ? addName : ''}
                        onChange={(e) => setAddName(e.target.value)}
                        className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">Other (type a name below)</option>
                        {services.map((s) => (
                          <option key={s.key} value={s.label}>{s.label}</option>
                        ))}
                      </select>
                    )}
                    <Input
                      id="add-name"
                      placeholder="e.g. Individual Therapy"
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-desc">Description</Label>
                    <Textarea
                      id="add-desc"
                      placeholder="Brief description of this session type..."
                      rows={3}
                      value={addDescription}
                      onChange={(e) => setAddDescription(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="add-duration">Duration *</Label>
                      <select
                        id="add-duration"
                        value={addDuration}
                        onChange={(e) => setAddDuration(e.target.value)}
                        className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        {durations.map((d) => (
                          <option key={d} value={d}>{formatDuration(d)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="add-price">Price ({regionCurrency}) *</Label>
                      <Input
                        id="add-price"
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="e.g. 150"
                        value={addPrice}
                        onChange={(e) => setAddPrice(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddOpen(false)} className="rounded-xl">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAdd}
                    disabled={createType.isPending}
                    className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl"
                  >
                    {createType.isPending ? 'Creating...' : 'Create'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Session Types List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : !sessionTypes || sessionTypes.length === 0 ? (
          <Card className="rounded-2xl">
            <div className="py-16 px-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No Session Types Yet</h3>
              <p className="text-sm text-gray-500 mb-4">Add your first session type to start accepting bookings</p>
              <Button
                onClick={() => setAddOpen(true)}
                className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-xl"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Session Type
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedTypes.map((st) => {
              const p = priceOf(st);
              return (
                <Card key={st.id} className="rounded-2xl">
                  <div className="pt-6 p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shrink-0">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-semibold text-gray-900">{st.name}</h3>
                            {st.setBy === 'admin' && (
                              <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700">
                                {st.edited ? 'Set by clinic admin · edited by you' : 'Set by clinic admin'}
                              </span>
                            )}
                            {st.setBy === 'therapist' && (
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                                Added by you
                              </span>
                            )}
                          </div>
                          {st.description && (
                            <p className="text-sm text-gray-500 mt-0.5">{st.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            <Badge color="blue">{formatDuration(st.duration)}</Badge>
                            {p && <Badge color="green">{formatCurrency(p.price, p.currency)}</Badge>}
                            <Badge color={st.isActive ? 'green' : 'gray'}>
                              {st.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(st)}
                          className="rounded-xl"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-2xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Session Type</AlertDialogTitle>
                              <AlertDialogDescription>
                                Remove &ldquo;{st.name}&rdquo; ({formatDuration(st.duration)}) from your services?
                                Families will no longer be able to book it. A service with upcoming bookings
                                can&apos;t be removed until those sessions are completed or cancelled.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(st.id)}
                                className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Sliding scale */}
        <Card className="rounded-2xl">
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-gray-900">Sliding scale / insurance-covered rate</h3>
                <p className="text-sm text-gray-500 mt-0.5">Offer a reduced rate to families who need it.</p>
              </div>
              <button
                type="button"
                onClick={() => setSlidingScale(!slidingScale)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  slidingScale ? 'bg-teal-500' : 'bg-gray-300'
                }`}
                aria-pressed={slidingScale}
                aria-label="Offer a sliding scale rate"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    slidingScale ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {slidingScale && (
              <div className="space-y-2 max-w-xs">
                <Label htmlFor="sliding-rate">Rate ({regionCurrency})</Label>
                <Input
                  id="sliding-rate"
                  type="number"
                  min={0}
                  value={slidingScaleRate}
                  onChange={(e) => setSlidingScaleRate(e.target.value)}
                />
              </div>
            )}
            <div className="flex justify-end">
              <Button
                onClick={saveSlidingScale}
                disabled={updateProfile.isPending}
                className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl"
              >
                {updateProfile.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Edit Session Type</DialogTitle>
              <DialogDescription>Update session details and pricing</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-desc">Description</Label>
                <Textarea
                  id="edit-desc"
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-duration">Duration *</Label>
                  <select
                    id="edit-duration"
                    value={editDuration}
                    onChange={(e) => setEditDuration(e.target.value)}
                    className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {/* An older non-preset duration stays selectable so editing doesn't change it. */}
                    {(durations.includes(Number(editDuration)) ? durations : [Number(editDuration), ...durations]).map((d) => (
                      <option key={d} value={d}>{formatDuration(d)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-price">Price ({editCurrency})</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    min={0}
                    step="0.01"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button
                onClick={handleEdit}
                disabled={updateType.isPending}
                className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl"
              >
                {updateType.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </BookingShell>
  );
}
