import { useState, useEffect } from 'react';
import { X, CheckCircle2, Tag, Plus, Trash2 } from 'lucide-react';
import {
    getTherapistSessionTypes,
    createSessionType,
    updateSessionType,
    deleteSessionType,
    upsertSessionPricing,
    type SessionType,
} from '@/lib/admin-api';

interface Draft {
    id?: string; // existing session type id, undefined for new
    name: string;
    description: string;
    duration: number;
    defaultPrice: number;
    overridePrice: string; // empty string means no override
    currency: string;
}

function emptyDraft(): Draft {
    return {
        name: '',
        description: '',
        duration: 45,
        defaultPrice: 0,
        overridePrice: '',
        currency: 'INR',
    };
}

export function EditSessionTypesModal({
    open,
    therapistId,
    onClose,
    onUpdated,
}: {
    open: boolean;
    therapistId: string;
    onClose: () => void;
    onUpdated: () => void;
}) {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [originalIds, setOriginalIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (open) {
            setSuccess(false);
            setError(null);
            setFetching(true);
            getTherapistSessionTypes(therapistId)
                .then((types) => {
                    if (types.length === 0) {
                        setDrafts([emptyDraft()]);
                        setOriginalIds(new Set());
                    } else {
                        const ids = new Set<string>();
                        setDrafts(
                            types.map((t) => {
                                ids.add(t.id);
                                const pricing = t.sessionPricing?.[0];
                                return {
                                    id: t.id,
                                    name: t.name,
                                    description: t.description || '',
                                    duration: t.duration,
                                    defaultPrice: t.defaultPrice,
                                    overridePrice: pricing ? String(pricing.price) : '',
                                    currency: t.currency,
                                };
                            }),
                        );
                        setOriginalIds(ids);
                    }
                })
                .catch(() => {
                    setDrafts([emptyDraft()]);
                    setOriginalIds(new Set());
                })
                .finally(() => setFetching(false));
        }
    }, [open, therapistId]);

    if (!open) return null;

    const addDraft = () => {
        setDrafts([...drafts, emptyDraft()]);
    };

    const removeDraft = (index: number) => {
        setDrafts(drafts.filter((_, i) => i !== index));
    };

    const updateDraft = (index: number, field: keyof Draft, value: any) => {
        const next = [...drafts];
        next[index] = { ...next[index], [field]: value };
        setDrafts(next);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validate
        for (const d of drafts) {
            if (!d.name.trim()) {
                setError('All session types must have a name.');
                return;
            }
            if (d.duration < 1) {
                setError('Duration must be at least 1 minute.');
                return;
            }
            if (d.defaultPrice < 0) {
                setError('Price cannot be negative.');
                return;
            }
        }

        setLoading(true);
        try {
            // Determine which original IDs are still present
            const currentIds = new Set(drafts.filter((d) => d.id).map((d) => d.id!));
            const removedIds = [...originalIds].filter((id) => !currentIds.has(id));

            // Soft-delete removed session types
            for (const id of removedIds) {
                await deleteSessionType(therapistId, id);
            }

            // Create new / update existing
            for (const draft of drafts) {
                if (draft.id) {
                    // Update existing
                    await updateSessionType(therapistId, draft.id, {
                        name: draft.name,
                        description: draft.description || undefined,
                        duration: draft.duration,
                        defaultPrice: draft.defaultPrice,
                    });
                    // Upsert pricing if override set
                    if (draft.overridePrice !== '') {
                        await upsertSessionPricing(therapistId, {
                            sessionTypeId: draft.id,
                            basePrice: parseFloat(draft.overridePrice),
                            currency: draft.currency,
                        });
                    }
                } else {
                    // Create new
                    const created = await createSessionType(therapistId, {
                        name: draft.name,
                        description: draft.description || undefined,
                        duration: draft.duration,
                        defaultPrice: draft.defaultPrice,
                        currency: draft.currency,
                    });
                    // Upsert pricing if override set
                    if (draft.overridePrice !== '') {
                        await upsertSessionPricing(therapistId, {
                            sessionTypeId: created.id,
                            basePrice: parseFloat(draft.overridePrice),
                            currency: draft.currency,
                        });
                    }
                }
            }

            setSuccess(true);
            setTimeout(() => {
                onUpdated();
                onClose();
            }, 1500);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to save session types');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center">
                            <Tag className="w-4 h-4 text-teal-600" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">Edit Session Types</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-50 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto">
                    {success ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 className="w-8 h-8 text-green-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Session Types Saved!</h3>
                            <p className="text-sm text-gray-500 max-w-sm">
                                The therapist&apos;s session types and pricing have been successfully updated.
                            </p>
                        </div>
                    ) : fetching ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <form id="edit-session-types-form" onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-3">
                                {drafts.map((draft, index) => (
                                    <div
                                        key={index}
                                        className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                {draft.id ? 'Existing' : 'New'} Session Type
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => removeDraft(index)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            {/* Name */}
                                            <div className="col-span-2">
                                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                                    Name <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={draft.name}
                                                    onChange={(e) => updateDraft(index, 'name', e.target.value)}
                                                    placeholder="e.g. Speech Therapy, OT Session"
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                                                />
                                            </div>

                                            {/* Description */}
                                            <div className="col-span-2">
                                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                                    Description
                                                </label>
                                                <input
                                                    type="text"
                                                    value={draft.description}
                                                    onChange={(e) => updateDraft(index, 'description', e.target.value)}
                                                    placeholder="Brief description (optional)"
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                                                />
                                            </div>

                                            {/* Duration */}
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                                    Duration (mins) <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={draft.duration}
                                                    onChange={(e) => updateDraft(index, 'duration', parseInt(e.target.value) || 0)}
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                                                />
                                            </div>

                                            {/* Default Price */}
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                                    Default Price <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step="0.01"
                                                    value={draft.defaultPrice}
                                                    onChange={(e) => updateDraft(index, 'defaultPrice', parseFloat(e.target.value) || 0)}
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                                                />
                                            </div>

                                            {/* Override Price */}
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                                    Override Price
                                                </label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step="0.01"
                                                    value={draft.overridePrice}
                                                    onChange={(e) => updateDraft(index, 'overridePrice', e.target.value)}
                                                    placeholder="Optional"
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                                                />
                                            </div>

                                            {/* Currency */}
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                                    Currency
                                                </label>
                                                <select
                                                    value={draft.currency}
                                                    onChange={(e) => updateDraft(index, 'currency', e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                                                >
                                                    <option value="INR">INR</option>
                                                    <option value="AED">AED</option>
                                                    <option value="USD">USD</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={addDraft}
                                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:border-teal-400 hover:text-teal-700 hover:bg-teal-50 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Add Session Type
                            </button>
                        </form>
                    )}
                </div>

                {/* Footer */}
                {!success && !fetching && (
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
                            form="edit-session-types-form"
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-xl hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Session Types'
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
