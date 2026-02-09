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
import { useOrganizations, useCreateOrganization } from '@/hooks/use-admin';

export default function OrganizationsPage() {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const { toast } = useToast();

  const { data: orgs, isLoading } = useOrganizations();
  const create = useCreateOrganization();

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
        <Button onClick={() => setShowCreate(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Organization
        </Button>
      </div>

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
