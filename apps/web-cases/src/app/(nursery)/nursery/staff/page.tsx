'use client';

import { useState } from 'react';
import { Avatar, Badge, Button, Card, Input, Label, Skeleton, useToast } from '@upllyft/ui';
import { Loader2, UserPlus, Trash2 } from 'lucide-react';
import { useNursery } from '@/components/nursery/nursery-context';
import { useMembers, useAddMember, useRemoveMember } from '@/hooks/use-nursery';
import type { FacilityRole } from '@/lib/api/nursery';

/**
 * Roles offered here are the ones a NURSERY actually has. CLINICAL_LEAD and THERAPIST
 * exist in the enum but belong to a clinic — offering them would suggest a nursery can
 * staff a clinician and thereby do clinical things, which it cannot: the capability map
 * denies it at the facility level regardless of who works there.
 */
const ROLES: { value: FacilityRole; label: string; hint: string }[] = [
  { value: 'KEYWORKER', label: 'Keyworker', hint: 'Observes the children in their room' },
  {
    value: 'INCLUSION_LEAD',
    label: 'Inclusion lead (SENCO)',
    hint: 'Raises concerns and talks to parents',
  },
  { value: 'ADMIN', label: 'Administrator', hint: 'Manages the roster, rooms and staff' },
  { value: 'OWNER', label: 'Owner', hint: 'Full control of the setting' },
];

const roleLabel = (r: FacilityRole) => ROLES.find(x => x.value === r)?.label ?? r;

export default function NurseryStaffPage() {
  const { facilityId } = useNursery();
  const { data: members, isLoading } = useMembers(facilityId ?? undefined);
  const add = useAddMember(facilityId ?? '');
  const remove = useRemoveMember(facilityId ?? '');
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<FacilityRole>('KEYWORKER');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await add.mutateAsync({ email: email.trim(), role });
      toast({ title: `${email} added` });
      setEmail('');
    } catch (err: any) {
      // Includes "No Upllyft account for X — ask them to sign up, then add them."
      // Staff are invited, never fabricated: an account someone didn't create isn't theirs.
      toast({
        title: err?.response?.data?.message ?? 'Could not add them',
        variant: 'destructive',
      });
    }
  };

  const drop = async (id: string, name: string) => {
    try {
      await remove.mutateAsync(id);
      toast({ title: `${name} removed` });
    } catch (err: any) {
      // The API refuses if they're the last owner, or still a keyworker for children —
      // a child quietly losing their keyworker is how a nursery loses track of who is
      // responsible for noticing.
      toast({
        title: err?.response?.data?.message ?? 'Could not remove them',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Staff</h1>
        <p className="text-sm text-gray-600 mt-1">
          Who works here, and what they can do.
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={submit} className="space-y-3">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label htmlFor="email">Their Upllyft email</Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="name@nursery.ae"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="w-56">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                value={role}
                onChange={e => setRole(e.target.value as FacilityRole)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={add.isPending}>
              {add.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            {ROLES.find(r => r.value === role)?.hint} · They need an Upllyft account first.
          </p>
        </form>
      </Card>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <div className="space-y-2">
          {(members ?? [])
            .filter(m => m.status === 'ACTIVE')
            .map(m => (
              <Card key={m.id} className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar src={m.user.image ?? undefined} name={m.user.name ?? m.user.email} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {m.user.name ?? m.user.email}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{m.user.email}</p>
                  </div>
                  {m._count.keyworkerFor > 0 && (
                    <span className="text-xs text-gray-500">
                      keyworker for {m._count.keyworkerFor}
                    </span>
                  )}
                  <Badge color={m.role === 'OWNER' ? 'purple' : 'blue'}>
                    {roleLabel(m.role)}
                  </Badge>
                  <button
                    onClick={() => drop(m.id, m.user.name ?? m.user.email)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                    aria-label="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
