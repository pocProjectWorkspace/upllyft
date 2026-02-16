'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CommunityShell } from '@/components/community-shell';
import { useCrisisResources } from '@/hooks/use-crisis';
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

export default function CrisisResourcesPage() {
  const [typeFilter, setTypeFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');

  const filters: CrisisResourceFilters = {
    ...(typeFilter && { type: typeFilter }),
    ...(stateFilter && { state: stateFilter }),
    ...(cityFilter && { city: cityFilter }),
    ...(languageFilter && { language: languageFilter }),
  };

  const { data: resources, isLoading } = useCrisisResources(
    Object.keys(filters).length > 0 ? filters : undefined,
  );

  return (
    <CommunityShell>
      <div className="space-y-6">
        {/* Back + header */}
        <Link href="/crisis" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Crisis Hub
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Crisis Resources Directory</h1>
          <p className="text-gray-500 mt-1">Find crisis and mental health resources near you</p>
        </div>

        {/* Filter bar */}
        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Select value={typeFilter || 'all'} onValueChange={(val) => setTypeFilter(val === 'all' ? '' : val)}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {CRISIS_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="State"
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
            />

            <Input
              placeholder="City"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
            />

            <Select value={languageFilter || 'all'} onValueChange={(val) => setLanguageFilter(val === 'all' ? '' : val)}>
              <SelectTrigger>
                <SelectValue placeholder="All Languages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Resource cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-5">
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-5 w-3/4" />
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
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900">{resource.name}</h3>
                    {resource.isEmergency && (
                      <Badge color="red">Emergency</Badge>
                    )}
                  </div>

                  <p className="text-sm text-gray-600">{resource.description}</p>

                  <div className="flex flex-wrap gap-2">
                    <Badge color="teal">{resource.type}</Badge>
                    <Badge color={resource.availability === '24/7' ? 'green' : 'yellow'}>
                      {resource.availability}
                    </Badge>
                    {resource.language && (
                      <Badge color="gray">{resource.language}</Badge>
                    )}
                    {resource.state && (
                      <Badge color="blue">
                        {[resource.city, resource.state].filter(Boolean).join(', ')}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
                    {resource.phone && (
                      <a
                        href={`tel:${resource.phone}`}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700"
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
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700"
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
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Online Chat
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900">No resources found</h3>
            <p className="text-sm text-gray-500 mt-1">Try adjusting your search filters.</p>
          </Card>
        )}
      </div>
    </CommunityShell>
  );
}
