'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import {
    Button,
    Card,
    Skeleton,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    Input,
    Label,
    useToast
} from '@upllyft/ui';
import { getClinicDetails, assignTherapistToClinic, removeTherapistFromClinic, type Clinic } from '@/lib/api/admin';

export default function ClinicDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const [clinic, setClinic] = useState<Clinic | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const { toast } = useToast();
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [newTherapistEmail, setNewTherapistEmail] = useState('');
    const [isAssigning, setIsAssigning] = useState(false);
    const [removingTherapistId, setRemovingTherapistId] = useState<string | null>(null);

    const fetchClinic = async () => {
        try {
            const data = await getClinicDetails(resolvedParams.id);
            setClinic(data);
        } catch (error) {
            console.error("Failed to load clinic details:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchClinic();
    }, [resolvedParams.id]);

    const handleAssignTherapist = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTherapistEmail) return;

        try {
            setIsAssigning(true);
            await assignTherapistToClinic(resolvedParams.id, newTherapistEmail);
            toast({ title: 'Success', description: 'Therapist successfully assigned to clinic.' });
            setNewTherapistEmail('');
            setIsManageModalOpen(false);
            await fetchClinic();
        } catch (error: any) {
            toast({
                title: 'Error assigning therapist',
                description: error.response?.data?.message || 'Could not assign therapist. Check if the email exists and represents an active Therapist account.',
                variant: 'destructive'
            });
        } finally {
            setIsAssigning(false);
        }
    };

    const handleRemoveTherapist = async (therapistId: string) => {
        try {
            setRemovingTherapistId(therapistId);
            await removeTherapistFromClinic(resolvedParams.id, therapistId);
            toast({ title: 'Success', description: 'Therapist removed from this clinic.' });
            await fetchClinic();
        } catch (error: any) {
            toast({
                title: 'Operation failed',
                description: error.response?.data?.message || 'Failed to remove therapist.',
                variant: 'destructive'
            });
        } finally {
            setRemovingTherapistId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="p-8 max-w-5xl mx-auto space-y-6">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-64 w-full rounded-xl" />
                <div className="grid grid-cols-3 gap-6">
                    <Skeleton className="col-span-2 h-96 rounded-xl" />
                    <Skeleton className="col-span-1 h-96 rounded-xl" />
                </div>
            </div>
        );
    }

    if (!clinic) {
        return (
            <div className="p-8 text-center">
                <h1 className="text-2xl font-bold text-gray-900">Clinic not found</h1>
                <Button onClick={() => router.back()} className="mt-4" variant="outline">Go Back</Button>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-6">
            <Button
                variant="ghost"
                onClick={() => router.push('/admin/clinics')}
                className="mb-2 -ml-2 text-gray-500 hover:text-gray-900"
            >
                ← Back to Clinics
            </Button>

            {/* Header / Branding Area */}
            <div
                className="relative w-full h-48 rounded-xl overflow-hidden shadow-sm"
                style={{ backgroundColor: clinic.primaryColor ?? '#0f766e' }}
            >
                {clinic.bannerUrl && (
                    <img
                        src={clinic.bannerUrl}
                        alt="Banner"
                        className="absolute inset-0 w-full h-full object-cover opacity-90 mix-blend-overlay"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                <div className="absolute bottom-0 left-0 p-6 flex items-end gap-5 w-full">
                    {clinic.logoUrl ? (
                        <div className="w-20 h-20 bg-white rounded-lg p-1.5 shadow-lg shrink-0">
                            <img src={clinic.logoUrl} alt="Logo" className="w-full h-full object-contain rounded-md" />
                        </div>
                    ) : (
                        <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center border border-white/30 shadow-lg shrink-0 text-white font-bold text-2xl">
                            {clinic.name.charAt(0)}
                        </div>
                    )}
                    <div className="text-white">
                        <h1 className="text-3xl font-bold shadow-sm">{clinic.name}</h1>
                        <p className="opacity-90 mt-1 flex items-center gap-2 text-sm">
                            🏬 {clinic.organization?.name || 'Independent Clinic'}
                        </p>
                        {clinic.accentColor && (
                            <div className="w-12 h-1.5 mt-3 rounded-full shadow-sm" style={{ backgroundColor: clinic.accentColor }} />
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Main Info */}
                <div className="md:col-span-2 space-y-6">
                    <Card className="p-6">
                        <h2 className="text-lg font-bold mb-4">Clinic Profile</h2>
                        <div className="grid sm:grid-cols-2 gap-y-4 gap-x-8">
                            <div>
                                <div className="text-sm text-gray-500 mb-1 flex items-center gap-2">✉️ Contact Email</div>
                                <div className="font-medium">{clinic.email || 'Not provided'}</div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-500 mb-1 flex items-center gap-2">📞 Phone Number</div>
                                <div className="font-medium">{clinic.phone || 'Not provided'}</div>
                            </div>
                            <div className="col-span-2">
                                <div className="text-sm text-gray-500 mb-1 flex items-center gap-2">📍 Physical Address</div>
                                <div className="font-medium">{clinic.address || 'Not provided'}</div>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold">Assigned Members</h2>
                            <Dialog open={isManageModalOpen} onOpenChange={setIsManageModalOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">Manage Members</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Assign Therapist to Clinic</DialogTitle>
                                        <DialogDescription>
                                            Enter the email address of an authenticated Therapist to link their profile to this Clinic's roster.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handleAssignTherapist} className="space-y-4 pt-4">
                                        <div className="space-y-2">
                                            <Label>Therapist Email</Label>
                                            <Input
                                                type="email"
                                                placeholder="dr.jane@example.com"
                                                value={newTherapistEmail}
                                                onChange={(e) => setNewTherapistEmail(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="flex justify-end gap-3 pt-2">
                                            <Button type="button" variant="ghost" onClick={() => setIsManageModalOpen(false)}>
                                                Cancel
                                            </Button>
                                            <Button type="submit" disabled={isAssigning || !newTherapistEmail}>
                                                {isAssigning ? 'Assigning...' : 'Assign to Clinic'}
                                            </Button>
                                        </div>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>

                        {clinic.therapists && clinic.therapists.length > 0 ? (
                            <div className="space-y-3 mt-6">
                                {clinic.therapists.map((t) => (
                                    <div key={t.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50/50">
                                        <div className="flex items-center gap-3">
                                            {t.user.image ? (
                                                <img src={t.user.image} alt={t.user.name} className="w-8 h-8 rounded-full border border-gray-200" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex flex-shrink-0 items-center justify-center font-bold text-xs">
                                                    {t.user.name?.charAt(0) || t.user.email.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="truncate text-ellipsis">
                                                <p className="text-sm font-medium text-gray-900 leading-none">{t.user.name}</p>
                                                <p className="text-xs text-gray-500 mt-1">{t.user.email}</p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleRemoveTherapist(t.id)}
                                            disabled={removingTherapistId === t.id}
                                        >
                                            {removingTherapistId === t.id ? 'Removing...' : 'Remove'}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-gray-500 py-6 mt-4 text-center border border-dashed rounded-lg bg-gray-50">
                                <p>There are no therapists actively assigned to this clinic roster yet.</p>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <Card className="p-6">
                        <h2 className="text-lg font-bold mb-4">Clinic Administrator</h2>
                        <div className="flex items-center gap-4">
                            <div className="truncate text-ellipsis">
                                <div className="font-medium text-gray-900 truncate">{clinic.admin?.name || 'Pending Onboarding'}</div>
                                <div className="text-sm text-gray-500 truncate">{clinic.admin?.email}</div>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h2 className="text-lg font-bold mb-4 text-gray-900">Platform Usage</h2>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                                <span className="text-gray-500">Therapists Enrolled</span>
                                <span className="font-bold">{clinic._count?.therapists ?? 0}</span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                                <span className="text-gray-500">Active Cases</span>
                                <span className="font-bold">{clinic._count?.cases ?? 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">Bookings Managed</span>
                                <span className="font-bold">{clinic._count?.bookings ?? 0}</span>
                            </div>
                        </div>
                    </Card>
                </div>

            </div>
        </div>
    );
}
