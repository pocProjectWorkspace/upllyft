import { useState } from 'react';
import { X, UserPlus, CheckCircle2 } from 'lucide-react';
import { createTherapist, type CreateTherapistInput } from '@/lib/admin-api';

export function AddTherapistModal({
    open,
    onClose,
    onCreated,
}: {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState<CreateTherapistInput>({
        name: '',
        email: '',
        title: '',
        phone: '',
        specializations: [],
    });

    const [specialtyInput, setSpecialtyInput] = useState('');

    if (!open) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await createTherapist(formData);
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                setFormData({ name: '', email: '', title: '', phone: '', specializations: [] });
                onCreated();
                onClose();
            }, 1500);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create therapist');
        } finally {
            setLoading(false);
        }
    };

    const handleAddSpecialty = () => {
        if (specialtyInput.trim() && !formData.specializations!.includes(specialtyInput.trim())) {
            setFormData({
                ...formData,
                specializations: [...(formData.specializations || []), specialtyInput.trim()],
            });
            setSpecialtyInput('');
        }
    };

    const handleRemoveSpecialty = (spec: string) => {
        setFormData({
            ...formData,
            specializations: formData.specializations!.filter((s) => s !== spec),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center">
                            <UserPlus className="w-4 h-4 text-teal-600" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">Add New Therapist</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-50 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    {success ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 className="w-8 h-8 text-green-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Therapist Created!</h3>
                            <p className="text-sm text-gray-500 max-w-sm">
                                The therapist has been added to the directory and an invitation has been sent to their email.
                            </p>
                        </div>
                    ) : (
                        <form id="add-therapist-form" onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700">Full Name *</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-colors"
                                        placeholder="Dr. Sarah Smith"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700">Email Address *</label>
                                    <input
                                        required
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-colors"
                                        placeholder="sarah@clinic.com"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700">Job Title</label>
                                    <input
                                        type="text"
                                        value={formData.title || ''}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-colors"
                                        placeholder="e.g. Speech Therapist"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700">Phone Number</label>
                                    <input
                                        type="tel"
                                        value={formData.phone || ''}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-colors"
                                        placeholder="+971 50 123 4567"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-700">Specializations</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={specialtyInput}
                                        onChange={(e) => setSpecialtyInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddSpecialty();
                                            }
                                        }}
                                        placeholder="Add specialty and press enter..."
                                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-colors"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddSpecialty}
                                        disabled={!specialtyInput.trim()}
                                        className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors"
                                    >
                                        Add
                                    </button>
                                </div>
                                {formData.specializations && formData.specializations.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {formData.specializations.map((spec) => (
                                            <span
                                                key={spec}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-teal-50 text-teal-700 text-xs font-medium rounded-lg"
                                            >
                                                {spec}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveSpecialty(spec)}
                                                    className="hover:text-teal-900"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </form>
                    )}
                </div>

                {/* Footer */}
                {!success && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="add-therapist-form"
                            disabled={loading || !formData.name || !formData.email}
                            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-xl hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Therapist'
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
