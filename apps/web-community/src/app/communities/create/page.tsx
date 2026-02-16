'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CommunityShell } from '@/components/community-shell';
import { useCreateCommunity } from '@/hooks/use-community';
import {
  Card,
  Button,
  Input,
  Textarea,
  Badge,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@upllyft/ui';
import type { CreateCommunityDto } from '@/lib/api/community';

const COMMUNITY_TYPES = [
  {
    value: 'CONDITION_SPECIFIC',
    label: 'Condition',
    description: 'For specific conditions like Autism, ADHD, Dyslexia, etc.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    gradient: 'from-purple-400 to-purple-600',
  },
  {
    value: 'REGIONAL',
    label: 'Regional',
    description: 'Connect with families and professionals in your area.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    gradient: 'from-blue-400 to-blue-600',
  },
  {
    value: 'PROFESSIONAL',
    label: 'Professional',
    description: 'For therapists, educators, and other professionals.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    gradient: 'from-pink-400 to-rose-500',
  },
] as const;

const SUGGESTED_TAGS = [
  'Autism', 'ADHD', 'Dyslexia', 'Speech Delay', 'Sensory Processing',
  'ABA Therapy', 'Occupational Therapy', 'Speech Therapy', 'IEP',
  'Parenting', 'Education', 'Research', 'Support Group', 'Resources',
];

function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { number: 1, label: 'Details' },
    { number: 2, label: 'Settings' },
    { number: 3, label: 'Review' },
  ];

  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 ${
                currentStep >= step.number
                  ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {currentStep > step.number ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step.number
              )}
            </div>
            <span
              className={`text-xs mt-1.5 font-medium ${
                currentStep >= step.number ? 'text-pink-600' : 'text-gray-400'
              }`}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`w-20 h-0.5 mx-3 mt-[-20px] transition-all duration-200 ${
                currentStep > step.number ? 'bg-pink-500' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function CreateCommunityPage() {
  const router = useRouter();
  const createMutation = useCreateCommunity();
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<CreateCommunityDto>({
    name: '',
    description: '',
    type: '',
    isPrivate: false,
    requiresApproval: false,
    whatsappEnabled: false,
    primaryLanguage: 'en',
    tags: [],
  });

  const [tagInput, setTagInput] = useState('');

  function updateForm(updates: Partial<CreateCommunityDto>) {
    setForm((prev) => ({ ...prev, ...updates }));
    // Clear related errors
    const keys = Object.keys(updates);
    setErrors((prev) => {
      const next = { ...prev };
      keys.forEach((key) => delete next[key]);
      return next;
    });
  }

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (trimmed && !form.tags.includes(trimmed)) {
      updateForm({ tags: [...form.tags, trimmed] });
    }
    setTagInput('');
  }

  function removeTag(tag: string) {
    updateForm({ tags: form.tags.filter((t) => t !== tag) });
  }

  function validateStep1(): boolean {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = 'Community name is required';
    if (form.name.length > 100) newErrors.name = 'Name must be under 100 characters';
    if (!form.description.trim()) newErrors.description = 'Description is required';
    if (form.description.length > 500) newErrors.description = 'Description must be under 500 characters';
    if (!form.type) newErrors.type = 'Please select a community type';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleNext() {
    if (step === 1 && !validateStep1()) return;
    setStep((s) => Math.min(3, s + 1));
  }

  function handleBack() {
    setStep((s) => Math.max(1, s - 1));
  }

  async function handleSubmit() {
    createMutation.mutate(form, {
      onSuccess: (data) => {
        router.push(`/communities/${data.id}`);
      },
    });
  }

  return (
    <CommunityShell>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Create Community</h1>
          <p className="text-gray-500 mt-1">
            Build a space for parents, therapists, and educators to connect
          </p>
        </div>

        <StepIndicator currentStep={step} />

        {/* Step 1: Details */}
        {step === 1 && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Community Details</h2>

            <div className="space-y-5">
              <div>
                <Input
                  label="Community Name"
                  placeholder="e.g., Autism Support - Bay Area"
                  value={form.name}
                  onChange={(e) => updateForm({ name: e.target.value })}
                  error={errors.name}
                />
              </div>

              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">Description</Label>
                <Textarea
                  placeholder="Describe what this community is about and who it's for..."
                  value={form.description}
                  onChange={(e) => updateForm({ description: e.target.value })}
                  rows={4}
                  className={errors.description ? 'border-red-300 focus-visible:border-red-500 focus-visible:ring-red-500/20' : ''}
                />
                {errors.description && (
                  <p className="mt-1 text-xs text-red-500">{errors.description}</p>
                )}
                <p className="mt-1 text-xs text-gray-400">{form.description.length}/500</p>
              </div>

              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-3">Community Type</Label>
                {errors.type && (
                  <p className="mb-2 text-xs text-red-500">{errors.type}</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {COMMUNITY_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => updateForm({ type: type.value })}
                      className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                        form.type === type.value
                          ? 'border-pink-500 bg-pink-50/50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${type.gradient} flex items-center justify-center text-white mb-2`}
                      >
                        {type.icon}
                      </div>
                      <p className="font-medium text-gray-900 text-sm">{type.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{type.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-pink-50 text-pink-700 text-xs font-medium"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-pink-900"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag(tagInput);
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => addTag(tagInput)}
                    disabled={!tagInput.trim()}
                    className="shrink-0"
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <span className="text-xs text-gray-400 mr-1">Suggestions:</span>
                  {SUGGESTED_TAGS.filter((t) => !form.tags.includes(t))
                    .slice(0, 8)
                    .map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => addTag(tag)}
                        className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 text-xs hover:bg-gray-200 hover:text-gray-700 transition-colors"
                      >
                        + {tag}
                      </button>
                    ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-8 pt-6 border-t border-gray-100">
              <Button onClick={handleNext}>
                Continue
                <svg className="w-4 h-4 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Settings */}
        {step === 2 && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Privacy & Settings</h2>

            <div className="space-y-6">
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-3">Privacy</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => updateForm({ isPrivate: false })}
                    className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                      !form.isPrivate
                        ? 'border-pink-500 bg-pink-50/50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-5 h-5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="font-medium text-gray-900 text-sm">Public</p>
                    </div>
                    <p className="text-xs text-gray-500">Anyone can find and join this community</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateForm({ isPrivate: true })}
                    className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                      form.isPrivate
                        ? 'border-pink-500 bg-pink-50/50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <p className="font-medium text-gray-900 text-sm">Private</p>
                    </div>
                    <p className="text-xs text-gray-500">Only invited members can join</p>
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="block text-sm font-medium text-gray-700">Require Approval</Label>
                    <p className="text-xs text-gray-500 mt-0.5">New members must be approved before joining</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateForm({ requiresApproval: !form.requiresApproval })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      form.requiresApproval ? 'bg-pink-500' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        form.requiresApproval ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">Language</Label>
                <Select value={form.primaryLanguage} onValueChange={(v) => updateForm({ primaryLanguage: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="pt">Portuguese</SelectItem>
                    <SelectItem value="hi">Hindi</SelectItem>
                    <SelectItem value="ar">Arabic</SelectItem>
                    <SelectItem value="zh">Chinese</SelectItem>
                    <SelectItem value="ja">Japanese</SelectItem>
                    <SelectItem value="ko">Korean</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">Rules (optional)</Label>
                <Textarea
                  placeholder="Set community guidelines and rules..."
                  value={form.rules || ''}
                  onChange={(e) => updateForm({ rules: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">Welcome Message (optional)</Label>
                <Textarea
                  placeholder="Message shown to new members when they join..."
                  value={form.welcomeMessage || ''}
                  onChange={(e) => updateForm({ welcomeMessage: e.target.value })}
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
              <Button variant="outline" onClick={handleBack}>
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </Button>
              <Button onClick={handleNext}>
                Continue
                <svg className="w-4 h-4 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Review & Create</h2>

            <div className="space-y-6">
              {/* Preview Card */}
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="h-24 bg-gradient-to-r from-pink-400 via-pink-500 to-rose-600" />
                <div className="p-5 -mt-6">
                  <div className="flex items-end gap-3 mb-3">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-xl shadow-lg border-3 border-white shrink-0">
                      {form.name.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">{form.name || 'Untitled Community'}</h3>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {form.description || 'No description provided'}
                  </p>
                </div>
              </div>

              {/* Details Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Type</p>
                    <p className="text-sm text-gray-700 mt-0.5">
                      {COMMUNITY_TYPES.find((t) => t.value === form.type)?.label || form.type}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Privacy</p>
                    <p className="text-sm text-gray-700 mt-0.5">
                      {form.isPrivate ? 'Private' : 'Public'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Approval Required</p>
                    <p className="text-sm text-gray-700 mt-0.5">
                      {form.requiresApproval ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Language</p>
                    <p className="text-sm text-gray-700 mt-0.5">{form.primaryLanguage.toUpperCase()}</p>
                  </div>
                  {form.tags.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {form.tags.map((tag) => (
                          <Badge key={tag} color="red">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {form.rules && (
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Rules</p>
                      <p className="text-sm text-gray-700 mt-0.5 line-clamp-2">{form.rules}</p>
                    </div>
                  )}
                </div>
              </div>

              {createMutation.isError && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                  <p className="text-sm text-red-700">
                    Failed to create community. Please try again.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
              <Button variant="outline" onClick={handleBack}>
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Community
                    <svg className="w-4 h-4 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </CommunityShell>
  );
}
