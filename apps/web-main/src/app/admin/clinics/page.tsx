'use client';

import { useState } from 'react';
import {
    Card,
    Button,
    Input,
    Label,
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
import { useClinics, useCreateClinic, useOrganizations } from '@/hooks/use-admin';

export default function ClinicsPage() {
    const [search, setSearch] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newAddress, setNewAddress] = useState('');
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [selectedOrgId, setSelectedOrgId] = useState('');

    const { toast } = useToast();

    const { data: clinics, isLoading } = useClinics();
    const { data: orgs } = useOrganizations();
    const create = useCreateClinic();

    const filtered = (clinics ?? []).filter((c) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) || (c.email && c.email.toLowerCase().includes(q));
    });

    const handleCreate = () => {
        if (!newName.trim() || !newAdminEmail.trim() || !selectedOrgId) return;

        create.mutate(
            {
                name: newName.trim(),
                email: newEmail.trim() || undefined,
                address: newAddress.trim() || undefined,
                phone: newPhone.trim() || undefined,
                adminEmail: newAdminEmail.trim(),
                organizationId: selectedOrgId,
            },
            {
                onSuccess: () => {
                    toast({ title: 'Clinic created', description: `${newName} has been created` });
                    setShowCreate(false);
                    setNewName('');
                    setNewEmail('');
                    setNewPhone('');
                    setNewAddress('');
                    setNewAdminEmail('');
                    setSelectedOrgId('');
                },
                onError: (err: any) => toast({ title: 'Failed to create clinic', description: err.response?.data?.message || err.message, variant: 'destructive' }),
            },
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Clinics (B2B SaaS)</h1>
                    <p className="text-gray-500 mt-1">Manage provisioned SaaS Clinics and branches</p>
                </div>
                <Button onClick={() => setShowCreate(true)}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Provision Clinic
                </Button>
            </div>

            {/* Search */}
            <Card className="p-4">
                <Input
                    placeholder="Search clinics..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </Card>

            {/* Table */}
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Clinic Name</TableHead>
                            <TableHead>Organization</TableHead>
                            <TableHead>Clinic Admin</TableHead>
                            <TableHead>Therapists</TableHead>
                            <TableHead>Active Cases</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <TableRow key={i}>
                                    {Array.from({ length: 6 }).map((_, j) => (
                                        <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : !filtered.length ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                                    No provisioned clinics found
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map((clinic) => (
                                <TableRow key={clinic.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            {clinic.logoUrl ? (
                                                <img src={clinic.logoUrl} alt={clinic.name} className="w-10 h-10 rounded-lg object-cover border border-gray-100" />
                                            ) : (
                                                <div
                                                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-medium"
                                                    style={{ backgroundColor: clinic.primaryColor || '#0d9488' }}
                                                >
                                                    {clinic.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-medium text-gray-900">{clinic.name}</div>
                                                <div className="text-xs text-gray-500">{clinic.email || 'N/A'}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm font-medium">
                                        {clinic.organization?.name || 'Unassigned'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">{clinic.admin?.name || 'Unknown'}</div>
                                        <div className="text-xs text-gray-500">{clinic.admin?.email}</div>
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-600">
                                        {clinic._count?.therapists ?? 0}
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-600">
                                        {clinic._count?.cases ?? 0}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm">
                                            View
                                        </Button>
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
                        <DialogTitle>Provision SaaS Clinic</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Organization Parent</Label>
                            <select
                                title="organization"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={selectedOrgId}
                                onChange={(e) => setSelectedOrgId(e.target.value)}
                            >
                                <option value="">Select Organization...</option>
                                {orgs?.map((o) => (
                                    <option key={o.id} value={o.id}>{o.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>Clinic Name</Label>
                            <Input
                                placeholder="e.g. Al Noor Branch"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Clinic Admin Email</Label>
                            <Input
                                type="email"
                                placeholder="Must belong to existing Upllyft user..."
                                value={newAdminEmail}
                                onChange={(e) => setNewAdminEmail(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Email (Optional)</Label>
                                <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Phone (Optional)</Label>
                                <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Address (Optional)</Label>
                            <Input
                                value={newAddress}
                                onChange={(e) => setNewAddress(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreate(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreate} disabled={create.isPending || !newName.trim() || !newAdminEmail.trim() || !selectedOrgId}>
                            {create.isPending ? 'Provisioning...' : 'Provision Clinic'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
