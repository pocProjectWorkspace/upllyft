'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CommunityShell } from '@/components/community-shell';
import { useCrisisResources, useEmergencyContacts } from '@/hooks/use-crisis';
import type { CrisisResourceFilters } from '@/lib/api/crisis';
import {
  Button,
  Card,
  Badge,
  Input,
  Skeleton,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@upllyft/ui';

const CRISIS_TYPES = [
  'Mental Health',
  'Substance Abuse',
  'Domestic Violence',
  'Child Abuse',
  'Suicide Prevention',
  'General Crisis',
];

const LANGUAGES = ['English', 'Spanish', 'Mandarin', 'Hindi', 'Arabic', 'French'];

export default function CrisisPage() {
  const [typeFilter, setTypeFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');

  const filters: CrisisResourceFilters = {
    ...(typeFilter && { type: typeFilter }),
    ...(languageFilter && { language: languageFilter }),
  };

  const { data: resources, isLoading: resourcesLoading } = useCrisisResources(
    Object.keys(filters).length > 0 ? filters : undefined,
  );
  const { data: emergency } = useEmergencyContacts();

  return (
    <CommunityShell>
      <div className="space-y-8">
        {/* Emergency banner */}
        <div className="bg-red-600 rounded-2xl p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold">Emergency Alert</h2>
              <p className="text-red-100 mt-1">
                If you or someone you know is in immediate danger, call 911 or go to the nearest emergency room.
              </p>
              <a href="tel:911">
                <Button
                  variant="outline"
                  className="mt-3 border-white text-white hover:bg-white/20 hover:text-white"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Call 911
                </Button>
              </a>
            </div>
          </div>
        </div>

        {/* Quick access cards */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Access</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 text-center" hover>
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">National Crisis Helpline</h3>
              <a href={`tel:${emergency?.helpline || '1-800-273-8255'}`} className="text-red-600 font-bold text-lg mt-1 block hover:underline">
                {emergency?.helpline || '1-800-273-8255'}
              </a>
              <p className="text-xs text-gray-500 mt-1">Available 24/7</p>
            </Card>

            <Card className="p-5 text-center" hover>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">Crisis Text Line</h3>
              <p className="text-blue-600 font-bold text-lg mt-1">
                Text HOME to {emergency?.textLine || '741741'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Free, confidential support</p>
            </Card>

            <Card className="p-5 text-center" hover>
              <Link href="/crisis/resources" className="block">
                <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">Mental Health Resources</h3>
                <p className="text-teal-600 font-medium text-sm mt-1">Browse Directory</p>
                <p className="text-xs text-gray-500 mt-1">Find local and national resources</p>
              </Link>
            </Card>

            <Card className="p-5 text-center" hover>
              <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">Emergency Services</h3>
              <a href="tel:911" className="text-orange-600 font-bold text-lg mt-1 block hover:underline">
                {emergency?.emergency || '911'}
              </a>
              <p className="text-xs text-gray-500 mt-1">For immediate emergencies</p>
            </Card>
          </div>
        </div>

        {/* Navigation links */}
        <div className="flex flex-wrap gap-3">
          <Link href="/crisis/sos">
            <Button variant="secondary" className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              SOS Emergency
            </Button>
          </Link>
          <Link href="/crisis/resources">
            <Button variant="secondary">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Resource Directory
            </Button>
          </Link>
          <Link href="/crisis/volunteer">
            <Button variant="outline">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              Volunteer
            </Button>
          </Link>
        </div>

        {/* Filter section */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Crisis Resources</h2>
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="w-full sm:w-56">
                <Select
                  value={typeFilter}
                  onValueChange={setTypeFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Crisis Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Crisis Types</SelectItem>
                    {CRISIS_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-56">
                <Select
                  value={languageFilter}
                  onValueChange={setLanguageFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Languages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Languages</SelectItem>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </div>

        {/* Resource cards */}
        {resourcesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-5">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </Card>
            ))}
          </div>
        ) : resources && resources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resources.map((resource) => (
              <Card key={resource.id} className="p-5" hover>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{resource.name}</h3>
                      {resource.isEmergency && (
                        <Badge color="red">Emergency</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2">{resource.description}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge color="teal">{resource.type}</Badge>
                      <Badge color="green">{resource.availability}</Badge>
                      {resource.language && <Badge color="gray">{resource.language}</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-3">
                      {resource.phone && (
                        <a
                          href={`tel:${resource.phone}`}
                          className="inline-flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {resource.phone}
                        </a>
                      )}
                      {resource.website && (
                        <a
                          href={resource.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Website
                        </a>
                      )}
                      {resource.chatUrl && (
                        <a
                          href={resource.chatUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          Chat
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-gray-500">No crisis resources found matching your filters.</p>
          </Card>
        )}
      </div>
    </CommunityShell>
  );
}
