'use client';

import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  useToast,
} from '@upllyft/ui';
import { Loader2, Info } from 'lucide-react';
import { useNursery } from './nursery-context';
import { useAddRosterChild, useMembers } from '@/hooks/use-nursery';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMPTY = {
  firstName: '',
  dateOfBirth: '',
  gender: 'female',
  roomId: '',
  keyworkerId: '',
  guardianName: '',
  guardianEmail: '',
  guardianPhone: '',
};

export function AddChildDialog({ open, onOpenChange }: Props) {
  const { facilityId, facility } = useNursery();
  const { data: members } = useMembers(facilityId ?? undefined);
  const add = useAddRosterChild(facilityId ?? '');
  const { toast } = useToast();

  const [form, setForm] = useState(EMPTY);

  const set = (k: keyof typeof EMPTY, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await add.mutateAsync({
        firstName: form.firstName.trim(),
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        roomId: form.roomId || undefined,
        keyworkerId: form.keyworkerId || undefined,
        guardianName: form.guardianName.trim(),
        guardianEmail: form.guardianEmail.trim(),
        guardianPhone: form.guardianPhone.trim() || undefined,
      });

      toast({
        title: `${form.firstName} added`,
        description: `We've emailed ${form.guardianEmail}. Their record stays closed until they consent.`,
      });
      setForm(EMPTY);
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: err?.response?.data?.message ?? 'Could not add this child',
        variant: 'destructive',
      });
    }
  };

  // Keyworkers are the ones who observe. Offering the whole staff list here would
  // invite someone to make the billing admin a child's keyworker.
  const keyworkers = (members ?? []).filter(
    m => m.role === 'KEYWORKER' || m.role === 'INCLUSION_LEAD',
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a child to the roster</DialogTitle>
        </DialogHeader>

        {/*
          Said BEFORE they fill the form, not after. Staff capture consent; they never
          give it. If someone believes typing a parent's email grants access, they will
          type any email — so the boundary has to be visible at the moment of entry.
        */}
        <div className="flex gap-2.5 p-3 rounded-lg bg-teal-50 border border-teal-100 text-sm text-teal-900">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-teal-600" />
          <p>
            Adding a child doesn’t give you access to them. We’ll email their parent to
            confirm and choose what to share — until they do, you’ll see their name on
            the roster and nothing else.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="firstName">Child’s name</Label>
              <Input
                id="firstName"
                required
                value={form.firstName}
                onChange={e => set('firstName', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dob">Date of birth</Label>
              <Input
                id="dob"
                type="date"
                required
                max={new Date().toISOString().slice(0, 10)}
                value={form.dateOfBirth}
                onChange={e => set('dateOfBirth', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                value={form.gender}
                onChange={e => set('gender', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Label htmlFor="room">Room</Label>
              <select
                id="room"
                value={form.roomId}
                onChange={e => set('roomId', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">—</option>
                {facility?.rooms.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="kw">Keyworker</Label>
              <select
                id="kw"
                value={form.keyworkerId}
                onChange={e => set('keyworkerId', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">—</option>
                {keyworkers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.user.name ?? m.user.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              Parent or guardian
            </p>
            <div className="space-y-3">
              <div>
                <Label htmlFor="gname">Their name</Label>
                <Input
                  id="gname"
                  required
                  value={form.guardianName}
                  onChange={e => set('guardianName', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="gemail">Their email</Label>
                  <Input
                    id="gemail"
                    type="email"
                    required
                    value={form.guardianEmail}
                    onChange={e => set('guardianEmail', e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This is where the consent request goes — check it carefully.
                  </p>
                </div>
                <div>
                  <Label htmlFor="gphone">Phone (optional)</Label>
                  <Input
                    id="gphone"
                    value={form.guardianPhone}
                    onChange={e => set('guardianPhone', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={add.isPending}>
              {add.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Add and invite parent
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
