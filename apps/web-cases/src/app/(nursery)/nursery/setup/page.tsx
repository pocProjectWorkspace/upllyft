'use client';

import { useState } from 'react';
import { Button, Card, Input, Label, Badge, useToast } from '@upllyft/ui';
import { Loader2, Plus, Trash2, School } from 'lucide-react';
import { useNursery } from '@/components/nursery/nursery-context';
import { useCreateFacility, useCreateRoom, useDeleteRoom } from '@/hooks/use-nursery';
import type { Emirate, LicenseAuthority } from '@/lib/api/nursery';

/**
 * Nursery licence authorities ONLY.
 *
 * DHA/DOH/MOHAP are health regulators and are deliberately absent — the API rejects
 * them for a nursery ("DHA does not license a nursery"), because `complianceStatus`
 * gates clinical capability and a nursery holding a health licence is how you would
 * quietly talk one into behaving like a clinic. Not offering them here just spares
 * someone the error; the refusal is server-side.
 */
const AUTHORITIES: { value: LicenseAuthority; label: string }[] = [
  { value: 'KHDA', label: 'KHDA — Dubai' },
  { value: 'ADEK', label: 'ADEK — Abu Dhabi' },
  { value: 'MOE', label: 'MOE — Ministry of Education' },
  { value: 'OTHER', label: 'Other' },
];

const EMIRATES: Emirate[] = [
  'ABU_DHABI',
  'DUBAI',
  'SHARJAH',
  'AJMAN',
  'UMM_AL_QUWAIN',
  'RAS_AL_KHAIMAH',
  'FUJAIRAH',
];

const pretty = (e: string) =>
  e
    .split('_')
    .map(w => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');

export default function NurserySetupPage() {
  const { facility, facilityId, facilities } = useNursery();
  const create = useCreateFacility();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: '',
    licenseNo: '',
    licenseAuthority: 'KHDA' as LicenseAuthority,
    emirate: 'DUBAI' as Emirate,
  });

  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await create.mutateAsync({
        name: form.name.trim(),
        type: 'NURSERY',
        licenseNo: form.licenseNo.trim() || undefined,
        licenseAuthority: form.licenseAuthority,
        emirate: form.emirate,
      });
      toast({ title: `${form.name} created` });
    } catch (err: any) {
      toast({
        title: err?.response?.data?.message ?? 'Could not create the nursery',
        variant: 'destructive',
      });
    }
  };

  // No facility yet => onboarding.
  if (facilities.length === 0 || !facility) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
            <School className="w-6 h-6 text-teal-600" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Set up your nursery</h1>
          <p className="text-sm text-gray-600 mt-1">
            You’ll be its owner. You can add rooms and staff next.
          </p>
        </div>

        <Card className="p-6">
          <form onSubmit={submitNew} className="space-y-4">
            <div>
              <Label htmlFor="name">Nursery name</Label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="auth">Licensed by</Label>
                <select
                  id="auth"
                  value={form.licenseAuthority}
                  onChange={e =>
                    setForm(f => ({ ...f, licenseAuthority: e.target.value as LicenseAuthority }))
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {AUTHORITIES.map(a => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="lic">Licence number</Label>
                <Input
                  id="lic"
                  value={form.licenseNo}
                  onChange={e => setForm(f => ({ ...f, licenseNo: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="em">Emirate</Label>
              <select
                id="em"
                value={form.emirate}
                onChange={e => setForm(f => ({ ...f, emirate: e.target.value as Emirate }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {EMIRATES.map(e => (
                  <option key={e} value={e}>
                    {pretty(e)}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={create.isPending} className="w-full">
              {create.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Create nursery
            </Button>
          </form>
        </Card>
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
