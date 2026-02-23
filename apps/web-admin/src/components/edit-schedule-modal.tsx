import { useState, useEffect } from 'react';
import { X, CheckCircle2, Clock, Plus, Trash2 } from 'lucide-react';
import { updateTherapistSchedule, type UpdateScheduleInput } from '@/lib/admin-api';

const DAY_OPTIONS = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
];

interface Slot {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
}

export function EditScheduleModal({
    open,
    therapistId,
    initialAvailability,
    onClose,
    onUpdated,
}: {
    open: boolean;
    therapistId: string;
    initialAvailability: { dayOfWeek: number; startTime: string; endTime: string }[];
    onClose: () => void;
    onUpdated: () => void;
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [slots, setSlots] = useState<Slot[]>([]);

    useEffect(() => {
        if (open) {
            setSlots(initialAvailability.length > 0 ? [...initialAvailability] : [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }]);
            setSuccess(false);
            setError(null);
        }
    }, [open, initialAvailability]);

    if (!open) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await updateTherapistSchedule(therapistId, { availability: slots });
            setSuccess(true);
            setTimeout(() => {
                onUpdated();
                onClose();
            }, 1500);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update schedule');
        } finally {
            setLoading(false);
        }
    };

    const addSlot = () => {
        setSlots([...slots, { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }]);
    };

    const removeSlot = (index: number) => {
        setSlots(slots.filter((_, i) => i !== index));
    };

    const updateSlot = (index: number, field: keyof Slot, value: any) => {
        const newSlots = [...slots];
        newSlots[index] = { ...newSlots[index], [field]: value };
        setSlots(newSlots);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center">
                            <Clock className="w-4 h-4 text-teal-600" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">Edit Availability Schedule</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-50 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {success ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 className="w-8 h-8 text-green-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Schedule Updated!</h3>
                            <p className="text-sm text-gray-500 max-w-sm">
                                The therapist's availability schedule has been successfully saved.
                            </p>
                        </div>
                    ) : (
                        <form id="edit-schedule-form" onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-3">
                                {slots.map((slot, index) => (
                                    <div key={index} className="flex gap-2 items-center p-3 bg-gray-50 rounded-xl border border-gray-200">
                                        <select
                                            value={slot.dayOfWeek}
                                            onChange={(e) => updateSlot(index, 'dayOfWeek', parseInt(e.target.value))}
                                            className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                                        >
                                            {DAY_OPTIONS.map((opt) => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="time"
                                            value={slot.startTime}
                                            onChange={(e) => updateSlot(index, 'startTime', e.target.value)}
                                            className="w-32 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                                        />
                                        <span className="text-gray-400">-</span>
                                        <input
                                            type="time"
                                            value={slot.endTime}
                                            onChange={(e) => updateSlot(index, 'endTime', e.target.value)}
                                            className="w-32 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeSlot(index)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={addSlot}
                                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:border-teal-400 hover:text-teal-700 hover:bg-teal-50 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Add Availability Slot
                            </button>
                        </form>
                    )}
                </div>

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
                            form="edit-schedule-form"
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-xl hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Schedule'
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
