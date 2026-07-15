'use client';

import { useState } from 'react';
import { Button, Card, Input, Label, Badge, useToast } from '@upllyft/ui';
import { Loader2, Plus, Trash2, School } from 'lucide-react';
import { useNursery } from '@/components/nursery/nursery-context';
import { useCreateRoom, useDeleteRoom } from '@/hooks/use-nursery';




export default function NurserySetupPage() {
  const { facility, facilityId, facilities } = useNursery();
  // No facility yet.
  //
  // Nurseries are NOT self-created here. A nursery is an organisation that a platform
  // admin onboards (org + first site + named admin, in one step), the same way clinics
  // are brought on. So the empty state points there rather than offering a create form —
  // self-serve creation was the wrong model.
  if (facilities.length === 0 || !facility) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
            <School className="w-6 h-6 text-teal-600" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">No nursery yet</h1>
          <p className="text-sm text-gray-600 mt-2">
            Nurseries are set up by an Upllyft administrator. Once yours is onboarded and
            you’ve been added as its admin, it’ll appear here — and under{' '}
            <span className="font-medium">My Organisation</span> in your profile menu.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            If you’re expecting access, ask whoever arranged your Upllyft account to onboard
            your setting and add you as the admin.
          </p>
        </div>
      </div>
    );
  }

  return <FacilitySettings facilityId={facilityId!} />;
}

function FacilitySettings({ facilityId }: { facilityId: string }) {
  const { facility } = useNursery();
  const createRoom = useCreateRoom(facilityId);
  const deleteRoom = useDeleteRoom(facilityId);
  const { toast } = useToast();

  const [roomName, setRoomName] = useState('');
  const [ageBand, setAgeBand] = useState('');

  const addRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createRoom.mutateAsync({ name: roomName.trim(), ageBandLabel: ageBand.trim() || undefined });
      setRoomName('');
      setAgeBand('');
    } catch (err: any) {
      toast({
        title: err?.response?.data?.message ?? 'Could not add the room',
        variant: 'destructive',
      });
    }
  };

  const removeRoom = async (id: string) => {
    try {
      await deleteRoom.mutateAsync(id);
      toast({ title: 'Room deleted' });
    } catch (err: any) {
      // The API refuses to delete an occupied room rather than silently emptying it.
      // Surface that reason verbatim — it tells them exactly what to do next.
      toast({
        title: err?.response?.data?.message ?? 'Could not delete the room',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{facility?.name}</h1>
        <div className="flex items-center gap-2 mt-2">
          <Badge color="blue">{facility?.licenseAuthority ?? 'No licence'}</Badge>
          <Badge color={facility?.complianceStatus === 'ACTIVE' ? 'green' : 'gray'}>
            {facility?.complianceStatus}
          </Badge>
        </div>
        {facility?.complianceStatus === 'DRAFT' && (
          <p className="text-xs text-gray-500 mt-2">
            Your licence is still under review. This doesn’t hold anything up — your roster
            and observations work now.
          </p>
        )}
      </div>

      <Card className="p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Rooms</h2>

        <div className="space-y-2 mb-4">
          {facility?.rooms.length === 0 && (
            <p className="text-sm text-gray-500">No rooms yet.</p>
          )}
          {facility?.rooms.map(r => (
            <div
              key={r.id}
              className="flex items-center justify-between py-2 px-3 rounded-lg border border-gray-100"
            >
              <div>
                <span className="text-sm font-medium text-gray-900">{r.name}</span>
                {r.ageBandLabel && (
                  <span className="text-xs text-gray-500 ml-2">{r.ageBandLabel}</span>
                )}
                <span className="text-xs text-gray-400 ml-2">
                  {r._count?.affiliations ?? 0} children
                </span>
              </div>
              <button
                onClick={() => removeRoom(r.id)}
                className="text-gray-400 hover:text-red-600 transition-colors"
                aria-label={`Delete ${r.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={addRoom} className="flex gap-2">
          <Input
            placeholder="Room name (e.g. Butterflies)"
            required
            value={roomName}
            onChange={e => setRoomName(e.target.value)}
          />
          <Input
            placeholder="Age band (optional)"
            value={ageBand}
            onChange={e => setAgeBand(e.target.value)}
          />
          <Button type="submit" disabled={createRoom.isPending}>
            {createRoom.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}
