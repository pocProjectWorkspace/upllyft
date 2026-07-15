'use client';

import { useState } from 'react';
import {
  Card,
  Badge,
  Button,
  Input,
  Label,
  Textarea,
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
  Skeleton,
  useToast,
} from '@upllyft/ui';
import { APP_URLS } from '@upllyft/api-client';
import { useOrganizations, useCreateOrganization, useOnboardNursery } from '@/hooks/use-admin';
import type { OnboardNurseryResult } from '@/lib/api/admin';

const EMPTY_NURSERY = {
  name: '',
  type: 'NURSERY' as 'NURSERY' | 'SCHOOL',
  adminEmail: '',
  licenseAuthority: 'KHDA' as 'KHDA' | 'ADEK' | 'MOE' | 'OTHER',
  emirate: 'DUBAI',
  licenseNo: '',
};

export default function OrganizationsPage() {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [showOnboard, setShowOnboard] = useState(false);
  const [nursery, setNursery] = useState(EMPTY_NURSERY);
  const [onboarded, setOnboarded] = useState<OnboardNurseryResult | null>(null);
  const { toast } = useToast();

  const { data: orgs, isLoading } = useOrganizations();
  const create = useCreateOrganization();
  const onboard = useOnboardNursery();

  const handleOnboard = () => {
    if (!nursery.name.trim() || !nursery.adminEmail.trim()) return;
    onboard.mutate(
      {
        name: nursery.name.trim(),
        type: nursery.type,
        adminEmail: nursery.adminEmail.trim(),
        licenseAuthority: nursery.licenseAuthority,
        emirate: nursery.emirate,
        licenseNo: nursery.licenseNo.trim() || undefined,
      },
      {
        onSuccess: (res) => {
          setOnboarded(res);
          setNursery(EMPTY_NURSERY);
        },
        onError: (e: any) =>
          toast({
            title: e?.response?.data?.message ?? 'Could not onboard the nursery',
            variant: 'destructive',
          }),
      },
    );
  };

  const filtered = (orgs ?? []).filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q);
  });

  const handleCreate = () => {
    if (!newName.trim()) return;
    create.mutate(
      { name: newName.trim(), description: newDescription.trim() || undefined },
      {
        onSuccess: () => {
          toast({ title: 'Organization created', description: `${newName} has been created` });
          setShowCreate(false);
          setNewName('');
          setNewDescription('');
        },
        onError: () => toast({ title: 'Failed to create organization', variant: 'destructive' }),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
          <p className="text-gray-500 mt-1">Manage platform organizations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { setOnboarded(null); setShowOnboard(true); }}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
            </svg>
            Onboard Nursery
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Organization
          </Button>
        </div>
      </div>

      {/* Onboard nursery — the combined action: org + first site + named admin. */}
      <Dialog open={showOnboard} onOpenChange={setShowOnboard}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{onboarded ? 'Nursery onboarded' : 'Onboard a nursery'}</DialogTitle>
          </DialogHeader>

          {onboarded ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                <span className="font-medium text-gray-900">{onboarded.admin.name ?? onboarded.admin.email}</span>{' '}
                is now the admin. They’ll find it under <span className="font-medium">My Organisation</span> when
                they log in.
              </p>
              <div className="flex gap-2">
                <a
                  href={`/org/${onboarded.organizationSlug}`}
                  className="text-sm font-medium text-teal-700 hover:text-teal-800"
                >
                  Open the org workspace →
                </a>
              </div>
              <DialogFooter>
                <Button onClick={() => setShowOnboard(false)}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Creates the organisation, its first site, and names the admin in one step. The
                admin must already have an Upllyft account — they’re invited, not created here.
              </p>
              <div>
                <Label htmlFor="n-name">Nursery name</Label>
                <Input id="n-name" value={nursery.name} onChange={(e) => setNursery({ ...nursery, name: e.target.value })} placeholder="Little Explorers Nursery" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="n-type">Type</Label>
                  <select id="n-type" value={nursery.type} onChange={(e) => setNursery({ ...nursery, type: e.target.value as 'NURSERY' | 'SCHOOL' })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="NURSERY">Nursery</option>
                    <option value="SCHOOL">School</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="n-auth">Licensed by</Label>
                  <select id="n-auth" value={nursery.licenseAuthority} onChange={(e) => setNursery({ ...nursery, licenseAuthority: e.target.value as any })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="KHDA">KHDA — Dubai</option>
                    <option value="ADEK">ADEK — Abu Dhabi</option>
                    <option value="MOE">MOE</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="n-em">Emirate</Label>
                  <select id="n-em" value={nursery.emirate} onChange={(e) => setNursery({ ...nursery, emirate: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
                    {['ABU_DHABI','DUBAI','SHARJAH','AJMAN','UMM_AL_QUWAIN','RAS_AL_KHAIMAH','FUJAIRAH'].map((e) => (
                      <option key={e} value={e}>{e.split('_').map((w) => w[0] + w.slice(1).toLowerCase()).join(' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="n-lic">Licence no.</Label>
                  <Input id="n-lic" value={nursery.licenseNo} onChange={(e) => setNursery({ ...nursery, licenseNo: e.target.value })} />
                </div>
              </div>
              <div>
                <Label htmlFor="n-admin">Admin’s Upllyft email</Label>
                <Input id="n-admin" type="email" value={nursery.adminEmail} onChange={(e) => setNursery({ ...nursery, adminEmail: e.target.value })} placeholder="admin@thenursery.ae" />
                <p className="text-xs text-gray-500 mt-1">They become the org admin and the site owner.</p>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setShowOnboard(false)}>Cancel</Button>
                <Button onClick={handleOnboard} disabled={onboard.isPending || !nursery.name.trim() || !nursery.adminEmail.trim()}>
                  {onboard.isPending ? 'Onboarding…' : 'Onboard'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Search */}
      <Card className="p-4">
        <Input
          placeholder="Search organizations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : !filtered.length ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                  No organizations found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium text-gray-900">{org.name}</TableCell>
                  <TableCell className="text-sm text-gray-500">{org.slug}</TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {org._count?.members ?? 0}
                  </TableCell>
                  <TableCell>
                    <Badge color={org.isVerified ? 'green' : 'yellow'}>
                      {org.isVerified ? 'Verified' : 'Pending'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <a href={`/org/${org.slug}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </a>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Organization</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Organization Name</Label>
              <Input
                placeholder="Enter name..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description (optional)..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={create.isPending || !newName.trim()}>
              {create.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
