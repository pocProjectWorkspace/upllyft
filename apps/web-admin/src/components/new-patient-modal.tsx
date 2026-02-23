'use client';

import { useState } from 'react';
import { X, User, Phone, Mail, Calendar, AlertCircle, Loader2, UserRound } from 'lucide-react';
import { Button, Input, Label } from '@upllyft/ui';
import { createWalkinPatient, type CreateWalkinPatientInput } from '@/lib/admin-api';

interface NewPatientModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: (patientId: string) => void;
}

const REFERRAL_OPTIONS = [
    'Walk-in',
    'GP / Paediatrician',
    'School',
    'Community Health Center',
    'Online',
    'Other',
];

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];

const RELATIONSHIP_OPTIONS = ['Mother', 'Father', 'Guardian', 'Grandparent', 'Other'];

export function NewPatientModal({ open, onClose, onSuccess }: NewPatientModalProps) {
    const [form, setForm] = useState<CreateWalkinPatientInput>({
        firstName: '',
        dateOfBirth: '',
        gender: 'Male',
        guardianName: '',
        guardianPhone: '',
        guardianEmail: '',
        guardianRelationship: 'Mother',
        primaryConcern: '',
        referralSource: 'Walk-in',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!open) return null;

    function set<K extends keyof CreateWalkinPatientInput>(
        key: K,
        value: CreateWalkinPatientInput[K],
    ) {
        setForm((prev) => ({ ...prev, [key]: value }));
        setError(null);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.firstName.trim()) return setError('Child first name is required.');
        if (!form.dateOfBirth) return setError('Date of birth is required.');
        if (!form.guardianName.trim()) return setError('Guardian name is required.');
        if (!form.guardianPhone.trim()) return setError('Guardian phone is required.');

        setLoading(true);
        setError(null);
        try {
            const patient = await createWalkinPatient(form);
            onSuccess(patient.id);
            // Reset form
            setForm({
                firstName: '',
                dateOfBirth: '',
                gender: 'Male',
                guardianName: '',
                guardianPhone: '',
                guardianEmail: '',
                guardianRelationship: 'Mother',
                primaryConcern: '',
                referralSource: 'Walk-in',
            });
        } catch (err: unknown) {
            const msg =
                err instanceof Error
                    ? err.message
                    : (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                    'Failed to create patient. Please try again.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    }

    return (
        /* Backdrop */
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

            {/* Modal panel */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center">
                            <UserRound className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-gray-900">Register Walk-in Patient</h2>
                            <p className="text-xs text-gray-500">Patient will be added to the intake queue</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Child Section */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <User className="w-4 h-4 text-teal-600" />
                            Child Information
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                                    First Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="firstName"
                                    placeholder="e.g. Ahmed"
                                    value={form.firstName}
                                    onChange={(e) => set('firstName', e.target.value)}
                                    className="rounded-xl border-gray-200 focus:ring-teal-500 focus:border-teal-500"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="dateOfBirth" className="text-sm font-medium text-gray-700">
                                    Date of Birth <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="dateOfBirth"
                                    type="date"
                                    value={form.dateOfBirth}
                                    onChange={(e) => set('dateOfBirth', e.target.value)}
                                    max={new Date().toISOString().split('T')[0]}
                                    className="rounded-xl border-gray-200 focus:ring-teal-500 focus:border-teal-500"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="gender" className="text-sm font-medium text-gray-700">
                                    Gender <span className="text-red-500">*</span>
                                </Label>
                                <select
                                    id="gender"
                                    value={form.gender}
                                    onChange={(e) => set('gender', e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                >
                                    {GENDER_OPTIONS.map((g) => (
                                        <option key={g} value={g}>
                                            {g}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="referralSource" className="text-sm font-medium text-gray-700">
                                    Referral Source
                                </Label>
                                <select
                                    id="referralSource"
                                    value={form.referralSource}
                                    onChange={(e) => set('referralSource', e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                >
                                    {REFERRAL_OPTIONS.map((r) => (
                                        <option key={r} value={r}>
                                            {r}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="mt-4 space-y-1.5">
                            <Label htmlFor="primaryConcern" className="text-sm font-medium text-gray-700">
                                Primary Concern / Reason for Visit
                            </Label>
                            <textarea
                                id="primaryConcern"
                                placeholder="e.g. Delayed speech, sensory processing difficulties, autism assessment..."
                                value={form.primaryConcern}
                                onChange={(e) => set('primaryConcern', e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                            />
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-100" />

                    {/* Guardian Section */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <Phone className="w-4 h-4 text-teal-600" />
                            Guardian / Parent Information
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="guardianName" className="text-sm font-medium text-gray-700">
                                    Full Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="guardianName"
                                    placeholder="e.g. Mohammed Al-Rashid"
                                    value={form.guardianName}
                                    onChange={(e) => set('guardianName', e.target.value)}
                                    className="rounded-xl border-gray-200 focus:ring-teal-500 focus:border-teal-500"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="guardianRelationship" className="text-sm font-medium text-gray-700">
                                    Relationship to Child
                                </Label>
                                <select
                                    id="guardianRelationship"
                                    value={form.guardianRelationship}
                                    onChange={(e) => set('guardianRelationship', e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                >
                                    {RELATIONSHIP_OPTIONS.map((r) => (
                                        <option key={r} value={r}>
                                            {r}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="guardianPhone" className="text-sm font-medium text-gray-700">
                                    Phone <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="guardianPhone"
                                    type="tel"
                                    placeholder="+971 50 XXX XXXX"
                                    value={form.guardianPhone}
                                    onChange={(e) => set('guardianPhone', e.target.value)}
                                    className="rounded-xl border-gray-200 focus:ring-teal-500 focus:border-teal-500"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="guardianEmail" className="text-sm font-medium text-gray-700">
                                    Email (Optional)
                                </Label>
                                <Input
                                    id="guardianEmail"
                                    type="email"
                                    placeholder="parent@example.com"
                                    value={form.guardianEmail}
                                    onChange={(e) => set('guardianEmail', e.target.value)}
                                    className="rounded-xl border-gray-200 focus:ring-teal-500 focus:border-teal-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={loading}
                            className="rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl flex items-center gap-2 px-6"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Registering...
                                </>
                            ) : (
                                'Register Patient'
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
