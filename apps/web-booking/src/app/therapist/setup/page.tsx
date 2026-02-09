'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookingShell } from '@/components/booking-shell';
import { useCreateTherapistProfile } from '@/hooks/use-marketplace';
import type { CreateTherapistProfileDto } from '@/lib/api/marketplace';
import {
  Button,
  Card,
  Badge,
  Input,
  Label,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  toast,
} from '@upllyft/ui';

const PRESET_SPECIALIZATIONS = [
  'Autism Spectrum Disorder',
  'ADHD',
  'Speech & Language',
  'Occupational Therapy',
  'Behavioral Therapy',
  'Developmental Delays',
  'Sensory Processing',
  'Social Skills',
  'Anxiety & Stress',
  'Learning Disabilities',
  'Motor Skills',
  'Feeding Therapy',
];

const PRESET_LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'Mandarin',
  'Arabic',
  'Hindi',
  'Portuguese',
  'German',
  'Japanese',
  'Korean',
];

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Australia/Sydney',
  'Pacific/Auckland',
];

export default function TherapistSetupPage() {
  const router = useRouter();
  const createProfile = useCreateTherapistProfile();

  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [credentials, setCredentials] = useState<string[]>([]);
  const [credentialInput, setCredentialInput] = useState('');
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [languageInput, setLanguageInput] = useState('');
  const [defaultTimezone, setDefaultTimezone] = useState('');

  function addCredential() {
    const trimmed = credentialInput.trim();
    if (trimmed && !credentials.includes(trimmed)) {
      setCredentials([...credentials, trimmed]);
      setCredentialInput('');
    }
  }

  function removeCredential(c: string) {
    setCredentials(credentials.filter((x) => x !== c));
  }

  function toggleSpecialization(s: string) {
    setSpecializations((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  function addLanguage() {
    const trimmed = languageInput.trim();
    if (trimmed && !languages.includes(trimmed)) {
      setLanguages([...languages, trimmed]);
      setLanguageInput('');
    }
  }

  function toggleLanguage(l: string) {
    setLanguages((prev) =>
      prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l],
    );
  }

  function removeLanguage(l: string) {
    setLanguages(languages.filter((x) => x !== l));
  }

  async function handleSubmit() {
    if (!title.trim() || !bio.trim() || !yearsExperience || !defaultTimezone) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }

    const data: CreateTherapistProfileDto = {
      title: title.trim(),
      bio: bio.trim(),
      yearsExperience: parseInt(yearsExperience, 10),
      credentials,
      specializations,
      languages,
      defaultTimezone,
    };

    createProfile.mutate(data, {
      onSuccess: () => {
        router.push('/therapist/dashboard');
      },
    });
  }

  return (
    <BookingShell>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Set Up Your Profile</h1>
          <p className="text-gray-500 mt-2">Complete your therapist profile to start accepting bookings</p>
        </div>

        {/* Basic Info */}
        <Card className="rounded-2xl">
          <div className="p-6 pb-0">
            <h3 className="flex items-center gap-2 font-semibold">
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Basic Information
            </h3>
            <p className="text-sm text-gray-500">Tell clients about yourself and your experience</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Professional Title *</Label>
              <Input
                id="title"
                placeholder="e.g. Licensed Clinical Psychologist"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio *</Label>
              <Textarea
                id="bio"
                placeholder="Describe your approach, experience, and what clients can expect..."
                rows={5}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="years">Years of Experience *</Label>
              <Input
                id="years"
                type="number"
                min={0}
                max={60}
                placeholder="e.g. 10"
                value={yearsExperience}
                onChange={(e) => setYearsExperience(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Credentials */}
        <Card className="rounded-2xl">
          <div className="p-6 pb-0">
            <h3 className="flex items-center gap-2 font-semibold">
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              Credentials
            </h3>
            <p className="text-sm text-gray-500">Add your professional certifications and licenses</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="e.g. PhD Clinical Psychology, BCBA"
                value={credentialInput}
                onChange={(e) => setCredentialInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCredential())}
              />
              <Button type="button" onClick={addCredential} className="bg-teal-600 hover:bg-teal-700 text-white shrink-0">
                Add
              </Button>
            </div>
            {credentials.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {credentials.map((c) => (
                  <Badge key={c} color="blue" className="flex items-center gap-1 px-3 py-1">
                    {c}
                    <button type="button" onClick={() => removeCredential(c)} className="ml-1 hover:text-red-500">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Specializations */}
        <Card className="rounded-2xl">
          <div className="p-6 pb-0">
            <h3 className="flex items-center gap-2 font-semibold">
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              Specializations
            </h3>
            <p className="text-sm text-gray-500">Select the areas you specialize in</p>
          </div>
          <div className="p-6">
            <div className="flex flex-wrap gap-2">
              {PRESET_SPECIALIZATIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSpecialization(s)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                    specializations.includes(s)
                      ? 'bg-teal-50 border-teal-300 text-teal-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {specializations.includes(s) && (
                    <svg className="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {s}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Languages */}
        <Card className="rounded-2xl">
          <div className="p-6 pb-0">
            <h3 className="flex items-center gap-2 font-semibold">
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
              Languages
            </h3>
            <p className="text-sm text-gray-500">Select or add languages you can conduct sessions in</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex flex-wrap gap-2">
              {PRESET_LANGUAGES.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => toggleLanguage(l)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                    languages.includes(l)
                      ? 'bg-teal-50 border-teal-300 text-teal-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {languages.includes(l) && (
                    <svg className="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {l}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add another language..."
                value={languageInput}
                onChange={(e) => setLanguageInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
              />
              <Button type="button" onClick={addLanguage} className="bg-teal-600 hover:bg-teal-700 text-white shrink-0">
                Add
              </Button>
            </div>
            {languages.filter((l) => !PRESET_LANGUAGES.includes(l)).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {languages
                  .filter((l) => !PRESET_LANGUAGES.includes(l))
                  .map((l) => (
                    <Badge key={l} color="purple" className="flex items-center gap-1 px-3 py-1">
                      {l}
                      <button type="button" onClick={() => removeLanguage(l)} className="ml-1 hover:text-red-500">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </Badge>
                  ))}
              </div>
            )}
          </div>
        </Card>

        {/* Timezone */}
        <Card className="rounded-2xl">
          <div className="p-6 pb-0">
            <h3 className="flex items-center gap-2 font-semibold">
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Timezone
            </h3>
            <p className="text-sm text-gray-500">Your default timezone for scheduling</p>
          </div>
          <div className="p-6">
            <Select value={defaultTimezone} onValueChange={setDefaultTimezone}>
              <SelectTrigger>
                <SelectValue placeholder="Select your timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Submit */}
        <div className="flex justify-end pb-8">
          <Button
            onClick={handleSubmit}
            disabled={createProfile.isPending}
            className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white px-8 py-3 rounded-xl text-base font-semibold"
          >
            {createProfile.isPending ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating Profile...
              </span>
            ) : (
              'Create Profile'
            )}
          </Button>
        </div>
      </div>
    </BookingShell>
  );
}
