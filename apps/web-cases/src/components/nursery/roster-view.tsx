'use client';

import { useMemo, useState } from 'react';
import { Badge, Button, Card, Skeleton, useToast } from '@upllyft/ui';
import {
  Lock,
  Mail,
  Plus,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useNursery } from './nursery-context';
import { useRoster, useResendClaim } from '@/hooks/use-nursery';
import { AddChildDialog } from './add-child-dialog';
import type { RosterChild } from '@/lib/api/nursery';

function ageFrom(dob: string): string {
  const d = new Date(dob);
  const now = new Date();
  const months =
    (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  const y = Math.floor(months / 12);
  const m = months % 12;
  return y > 0 ? `${y}y ${m}m` : `${m}m`;
}

/**
 * The consent state of one child, said plainly.
 *
 * This is the most important thing on the screen, so it does not hide behind a
 * subtle colour. A keyworker must be able to tell, at a glance, which children they
 * may actually open — and understand that a locked one is the system working, not a
 * bug they should route around.
 */
function ConsentBadge({ child }: { child: RosterChild }) {
  if (child.consentGranted) {
    return (
      <Badge color="green">
        <CheckCircle2 className="w-3 h-3 mr-1 inline" />
        Consented
      </Badge>
    );
  }

  const claim = child.claim;

  if (claim?.status === 'DISPUTED') {
    return (
      <Badge color="red">
        <AlertCircle className="w-3 h-3 mr-1 inline" />
        Disputed
      </Badge>
    );
  }

  if (claim?.status === 'EXPIRED' || (claim && new Date(claim.expiresAt) < new Date())) {
    return (
      <Badge color="yellow">
        <Clock className="w-3 h-3 mr-1 inline" />
        Invite expired
      </Badge>
    );
  }

  return (
    <Badge color="gray">
      <Lock className="w-3 h-3 mr-1 inline" />
      Awaiting consent
    </Badge>
  );
}

export function RosterView() {
  const { facilityId, facility } = useNursery();
  const { data: roster, isLoading } = useRoster(facilityId ?? undefined);
  const resend = useResendClaim(facilityId ?? '');
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [roomFilter, setRoomFilter] = useState<string>('all');
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => {
    let rows = roster ?? [];
    if (roomFilter !== 'all') {
      rows = rows.filter(r =>
        roomFilter === 'none' ? !r.room : r.room?.id === roomFilter,
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        r =>
          r.firstName.toLowerCase().includes(q) ||
          r.guardian?.name.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [roster, search, roomFilter]);

  const awaiting = (roster ?? []).filter(r => !r.consentGranted).length;

  const handleResend = async (child: RosterChild) => {
    if (!child.affiliationId) return;
    try {
      await resend.mutateAsync(child.affiliationId);
      toast({ title: `Invite re-sent to ${child.guardian?.email ?? 'the guardian'}` });
    } catch (e: any) {
      toast({
        title: e?.response?.data?.message ?? 'Could not re-send the invite',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map(i => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Roster</h1>
          <p className="text-sm text-gray-600 mt-1">
            {roster?.length ?? 0} child{(roster?.length ?? 0) === 1 ? '' : 'ren'} at{' '}
            {facility?.name}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Add child
        </Button>
      </div>

      {/*
        The honest framing. A nursery is used to systems where adding a child means
        getting their data — so if we say nothing, "Awaiting consent" reads as a bug
        or a delay to be worked around. Naming it as the design, once, at the top, is
        what stops someone raising a support ticket to "unlock" a child.
      */}
      {awaiting > 0 && (
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex gap-3">
            <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-900">
                {awaiting} child{awaiting === 1 ? '' : 'ren'} still waiting on a parent
              </p>
              <p className="text-amber-800 mt-1">
                You can see that they’re enrolled, and nothing more. Their records stay
                closed until their parent says yes — that’s deliberate, not a delay you
                need to chase us about. Re-send the invite if it’s been a while.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by child or parent…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <select
          value={roomFilter}
          onChange={e => setRoomFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="all">All rooms</option>
          {facility?.rooms.map(r => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
          <option value="none">No room</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-gray-500">
            {roster?.length ? 'No children match that.' : 'No children on the roster yet.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(child => (
            <Card key={child.childId} className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center text-sm font-semibold shrink-0">
                  {child.firstName.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 truncate">
                      {child.firstName}
                    </span>
                    <span className="text-xs text-gray-500">{ageFrom(child.dateOfBirth)}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">
                    {child.room?.name ?? 'No room'}
                    {child.keyworker ? ` · ${child.keyworker.name}` : ''}
                    {child.guardian ? ` · ${child.guardian.name}` : ''}
                  </div>
                </div>

                <ConsentBadge child={child} />

                {/*
                  Only offer a re-send where there is actually a pending invite to
                  re-send. Showing the button on a consented child would invite
                  someone to "nudge" a parent who has already said yes.
                */}
                {!child.consentGranted && child.claim?.status === 'PENDING' && (
                  <Button
                    variant="outline"
                    onClick={() => handleResend(child)}
                    disabled={resend.isPending}
                  >
                    <Mail className="w-4 h-4 mr-1" />
                    Re-send
                  </Button>
                )}

                {child.consentGranted ? (
                  <a
                    href={`/nursery/children/${child.childId}`}
                    className="text-sm font-medium text-teal-700 hover:text-teal-800"
                  >
                    Open
                  </a>
                ) : (
                  <span
                    className="text-sm text-gray-400 cursor-not-allowed"
                    title="This child's record is closed until their parent consents."
                  >
                    Locked
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <AddChildDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
