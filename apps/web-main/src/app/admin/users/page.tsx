'use client';

import { useState } from 'react';
import {
  Card,
  Badge,
  Button,
  Input,
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
  Avatar,
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
import { useAdminUsers, useUpdateUserRole, useBanUser } from '@/hooks/use-admin';
import type { AdminUser } from '@/lib/api/admin';

const ROLES = ['All', 'USER', 'THERAPIST', 'EDUCATOR', 'ORGANIZATION', 'ADMIN', 'MODERATOR'] as const;
const STATUSES = ['All', 'ACTIVE', 'BANNED', 'PENDING'] as const;

const roleBadgeColor: Record<string, 'teal' | 'green' | 'blue' | 'purple' | 'red' | 'yellow' | 'gray'> = {
  USER: 'gray',
  THERAPIST: 'teal',
  EDUCATOR: 'blue',
  ORGANIZATION: 'purple',
  ADMIN: 'red',
  MODERATOR: 'yellow',
};

const statusBadgeColor: Record<string, 'green' | 'red' | 'yellow'> = {
  ACTIVE: 'green',
  BANNED: 'red',
  PENDING: 'yellow',
};

function formatDate(dateStr?: string) {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function UsersPage() {
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState('');
  const [banTarget, setBanTarget] = useState<AdminUser | null>(null);
  const { toast } = useToast();

  const params: { role?: string; status?: string } = {};
  if (roleFilter !== 'All') params.role = roleFilter;
  if (statusFilter !== 'All') params.status = statusFilter;

  const { data: users, isLoading } = useAdminUsers(params);
  const updateRole = useUpdateUserRole();
  const ban = useBanUser();

  const filtered = (users ?? []).filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  const handleEditRole = () => {
    if (!editUser || !editRole) return;
    updateRole.mutate(
      { userId: editUser.id, role: editRole },
      {
        onSuccess: () => {
          toast({ title: 'Role updated', description: `${editUser.name || editUser.email} is now ${editRole}` });
          setEditUser(null);
        },
        onError: () => toast({ title: 'Failed to update role', variant: 'destructive' }),
      },
    );
  };

  const handleBan = () => {
    if (!banTarget) return;
    ban.mutate(banTarget.id, {
      onSuccess: () => {
        toast({ title: 'User banned', description: `${banTarget.name || banTarget.email} has been banned` });
        setBanTarget(null);
      },
      onError: () => toast({ title: 'Failed to ban user', variant: 'destructive' }),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-500 mt-1">Search, filter, and manage platform users</p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r === 'All' ? 'All Roles' : r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === 'All' ? 'All Statuses' : s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Users table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar name={user.name || user.email} src={user.image || undefined} size="sm" />
                      <div>
                        <p className="font-medium text-gray-900">{user.name || '—'}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge color={roleBadgeColor[user.role] ?? 'gray'}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge color={statusBadgeColor[user.status] ?? 'gray'}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {formatDate(user.lastLoginAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditUser(user);
                          setEditRole(user.role);
                        }}
                      >
                        Edit
                      </Button>
                      {user.status !== 'BANNED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setBanTarget(user)}
                        >
                          Ban
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Edit role dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-3">
              Change role for <strong>{editUser?.name || editUser?.email}</strong>
            </p>
            <Select value={editRole} onValueChange={setEditRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.filter((r) => r !== 'All').map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditRole} disabled={updateRole.isPending}>
              {updateRole.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban confirmation */}
      <AlertDialog open={!!banTarget} onOpenChange={() => setBanTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ban User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to ban <strong>{banTarget?.name || banTarget?.email}</strong>?
              This action can be reversed later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBan}
              className="bg-red-600 hover:bg-red-700"
            >
              {ban.isPending ? 'Banning...' : 'Ban User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
