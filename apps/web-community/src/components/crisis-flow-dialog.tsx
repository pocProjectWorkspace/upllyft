'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Alert,
  AlertDescription,
  useToast,
} from '@upllyft/ui';
import { createCrisisIncident, type CrisisResource } from '@/lib/api/crisis';

interface CrisisFlowDialogProps {
  open: boolean;
  onClose: () => void;
}

const CRISIS_TYPES = [
  {
    id: 'SUICIDE_RISK',
    label: 'Thoughts of self-harm',
    color: 'red',
    urgent: true,
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
  {
    id: 'PANIC_ATTACK',
    label: 'Panic/Anxiety attack',
    color: 'orange',
    urgent: true,
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    id: 'MELTDOWN',
    label: 'Meltdown/Sensory overload',
    color: 'yellow',
    urgent: false,
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
  },
  {
    id: 'FAMILY_CONFLICT',
    label: 'Family/Relationship crisis',
    color: 'blue',
    urgent: false,
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    id: 'MEDICAL_EMERGENCY',
    label: 'Medical emergency',
    color: 'red',
    urgent: true,
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    ),
  },
  {
    id: 'BURNOUT',
    label: 'Feeling overwhelmed',
    color: 'purple',
    urgent: false,
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      </svg>
    ),
  },
];

const URGENCY_LEVELS = [
  { id: 'IMMEDIATE', label: 'I need help right now', description: 'Immediate professional support', color: 'red' },
  { id: 'HIGH', label: 'Within the next few hours', description: 'Urgent but not immediate', color: 'orange' },
  { id: 'MODERATE', label: 'Within 24 hours', description: 'Need support soon', color: 'yellow' },
  { id: 'LOW', label: 'General support needed', description: 'Information and resources', color: 'green' },
];

const COLOR_MAP: Record<string, { bg: string; text: string; dot: string }> = {
  red: { bg: 'bg-red-100', text: 'text-red-600', dot: 'bg-red-500' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-600', dot: 'bg-orange-500' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', dot: 'bg-yellow-500' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-600', dot: 'bg-blue-500' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600', dot: 'bg-purple-500' },
  green: { bg: 'bg-green-100', text: 'text-green-600', dot: 'bg-green-500' },
};

export function CrisisFlowDialog({ open, onClose }: CrisisFlowDialogProps) {
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [urgencyLevel, setUrgencyLevel] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [resources, setResources] = useState<CrisisResource[]>([]);
  const [nextSteps, setNextSteps] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setStep(1);
      setSelectedType(null);
      setUrgencyLevel(null);
      setDescription('');
      setResources([]);
      setNextSteps([]);
      setError(null);
      getUserLocation();
    }
  }, [open]);

  const getUserLocation = () => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation(`${position.coords.latitude},${position.coords.longitude}`);
        },
        () => {
          // Location not available — that's fine
        },
      );
    }
  };

  const handleTypeSelect = (typeId: string) => {
    setSelectedType(typeId);
    // Auto-escalate for medical emergency or suicide risk
    if (typeId === 'MEDICAL_EMERGENCY' || typeId === 'SUICIDE_RISK') {
      setUrgencyLevel('IMMEDIATE');
      handleSubmit('IMMEDIATE', typeId);
    } else {
      setStep(2);
    }
  };

  const handleUrgencySelect = (level: string) => {
    setUrgencyLevel(level);
    if (level === 'IMMEDIATE') {
      handleSubmit(level, selectedType!);
    } else {
      setStep(3);
    }
  };

  const handleSubmit = async (urgency?: string, type?: string) => {
    setLoading(true);
    setError(null);

    try {
      const resp = await createCrisisIncident({
        type: type || selectedType!,
        urgencyLevel: urgency || urgencyLevel!,
        description: description || undefined,
        location: location || undefined,
        contactNumber: contactNumber || undefined,
        preferredLang: 'en',
      });

      setResources(resp.resources || []);
      setNextSteps(resp.nextSteps || []);
      setStep(4);

      toast({ title: 'Support resources found', description: "We've found help resources for you" });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to get resources');
      toast({ title: 'Error', description: 'Failed to get resources. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const titles: Record<number, string> = {
    1: 'Crisis Support - How can we help?',
    2: 'How urgent is your situation?',
    3: 'Additional Information (Optional)',
    4: 'Support Resources',
  };

  const descriptions: Record<number, string> = {
    1: 'Select the type of support you need',
    2: 'This helps us connect you with the right resources',
    3: 'Any details you provide can help us better assist you',
    4: 'Here are resources that can help you right now',
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{titles[step]}</DialogTitle>
          <DialogDescription>{descriptions[step]}</DialogDescription>
        </DialogHeader>

        {/* Back button */}
        {step > 1 && step < 4 && (
          <button
            onClick={() => setStep(step - 1)}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 w-fit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        )}

        {/* Step 1: Crisis Type Selection */}
        {step === 1 && (
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CRISIS_TYPES.map((type) => {
                const colors = COLOR_MAP[type.color] || COLOR_MAP.red;
                return (
                  <button
                    key={type.id}
                    onClick={() => handleTypeSelect(type.id)}
                    className={`flex items-center gap-3 p-4 rounded-2xl border border-gray-200 hover:shadow-md transition-all text-left ${
                      selectedType === type.id ? 'ring-2 ring-teal-500' : ''
                    }`}
                  >
                    <div className={`p-2 rounded-full ${colors.bg}`}>
                      <span className={colors.text}>{type.icon}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{type.label}</p>
                      {type.urgent && <p className="text-xs text-red-600">Urgent</p>}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Emergency notice */}
            <div className="border border-red-200 bg-red-50 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="text-sm text-red-700">
                  <strong>For immediate medical emergencies, call 911</strong>
                  <br />
                  Suicide & Crisis Lifeline: 988 (24/7)
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Urgency Level */}
        {step === 2 && (
          <div className="space-y-3 mt-4">
            {URGENCY_LEVELS.map((level) => {
              const colors = COLOR_MAP[level.color] || COLOR_MAP.green;
              return (
                <button
                  key={level.id}
                  onClick={() => handleUrgencySelect(level.id)}
                  className={`flex items-center justify-between w-full p-4 rounded-2xl border border-gray-200 hover:shadow-md transition-all text-left ${
                    urgencyLevel === level.id ? 'ring-2 ring-teal-500' : ''
                  }`}
                >
                  <div>
                    <p className="font-medium text-gray-900">{level.label}</p>
                    <p className="text-sm text-gray-500">{level.description}</p>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${colors.dot}`} />
                </button>
              );
            })}
          </div>
        )}

        {/* Step 3: Additional Information */}
        {step === 3 && (
          <div className="space-y-4 mt-4">
            <div>
              <label htmlFor="crisis-desc" className="block text-sm font-medium text-gray-700 mb-1">
                Tell us more (optional)
              </label>
              <textarea
                id="crisis-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you're experiencing..."
                rows={4}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none resize-none"
              />
            </div>

            <div>
              <label htmlFor="crisis-phone" className="block text-sm font-medium text-gray-700 mb-1">
                Contact number (optional)
              </label>
              <input
                id="crisis-phone"
                type="tel"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="Your phone number for callback"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => handleSubmit()}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Skip
              </button>
              <button
                onClick={() => handleSubmit()}
                disabled={loading}
                className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl px-6 py-2 text-sm font-medium hover:from-teal-600 hover:to-teal-700 shadow-md disabled:opacity-50"
              >
                {loading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {loading ? 'Getting Resources...' : 'Get Resources'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Resources */}
        {step === 4 && (
          <div className="space-y-4 mt-4">
            {/* Next Steps */}
            {nextSteps.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Recommended Steps:</h3>
                <ol className="list-decimal list-inside space-y-1">
                  {nextSteps.map((s, idx) => (
                    <li key={idx} className="text-sm text-gray-700">{s}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* Resource cards */}
            {resources.length > 0 ? (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Available Resources:</h3>
                <div className="space-y-3">
                  {resources.map((r) => (
                    <div key={r.id} className="border border-gray-200 rounded-2xl p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{r.name}</p>
                          <p className="text-sm text-gray-500 mt-0.5">{r.description}</p>
                        </div>
                        {r.isEmergency && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                            Emergency
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {r.phone && (
                          <a
                            href={`tel:${r.phone}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg text-sm font-medium hover:bg-teal-100"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            Call {r.phone}
                          </a>
                        )}
                        {r.chatUrl && (
                          <a
                            href={r.chatUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            Chat
                          </a>
                        )}
                        {r.website && (
                          <a
                            href={r.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
                            </svg>
                            Website
                          </a>
                        )}
                      </div>
                      {r.availability && (
                        <p className="text-xs text-gray-400 mt-2">{r.availability}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  No specific resources found for your location. Please call the national helpline: 988
                </AlertDescription>
              </Alert>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t border-gray-100">
              <button
                onClick={() => {
                  setStep(1);
                  setSelectedType(null);
                  setUrgencyLevel(null);
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Start Over
              </button>
              <button
                onClick={onClose}
                className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl px-6 py-2 text-sm font-medium hover:from-teal-600 hover:to-teal-700 shadow-md"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="mt-4 border border-red-200 bg-red-50 rounded-xl p-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
