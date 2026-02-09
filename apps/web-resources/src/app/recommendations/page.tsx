'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Badge, Input } from '@upllyft/ui';
import { ResourcesShell } from '@/components/resources-shell';
import { useRecommendations, useCloneWorksheet } from '@/hooks/use-worksheets';
import { worksheetTypeLabels, difficultyLabels, difficultyColors } from '@/lib/utils';

export default function RecommendationsPage() {
  const router = useRouter();
  const [childId, setChildId] = useState('');
  const [activeChildId, setActiveChildId] = useState('');

  const { data, isLoading } = useRecommendations(activeChildId);
  const cloneMutation = useCloneWorksheet();

  const recommendations = data?.recommendations ?? [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (childId.trim()) setActiveChildId(childId.trim());
  }

  return (
    <ResourcesShell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Recommendations</h1>
          <p className="text-gray-500 mt-1">
            Get personalized worksheet recommendations based on a child&apos;s progress and needs.
          </p>
        </div>

        {/* Child selector */}
        <form onSubmit={handleSubmit} className="flex gap-3 items-end">
          <div className="flex-1 max-w-sm">
            <label className="block text-sm font-medium text-gray-700 mb-1">Child ID</label>
            <Input
              placeholder="Enter child ID..."
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={!childId.trim()}>
            Get Recommendations
          </Button>
        </form>

        {/* Initial empty state */}
        {!activeChildId && !isLoading && (
          <div className="text-center py-20">
            <h3 className="text-lg font-semibold text-gray-900">Enter a child ID</h3>
            <p className="text-gray-500 mt-1">
              Provide a child ID to receive AI-powered worksheet recommendations.
            </p>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Recommendations list */}
        {activeChildId && !isLoading && recommendations.length === 0 && (
          <div className="text-center py-20">
            <h3 className="text-lg font-semibold text-gray-900">No recommendations available</h3>
            <p className="text-gray-500 mt-1">
              There are not enough completions yet to generate recommendations. Complete more worksheets first.
            </p>
          </div>
        )}

        {activeChildId && !isLoading && recommendations.length > 0 && (
          <div className="space-y-4">
            {recommendations.map((rec, idx) => {
              const ws = rec.worksheet;
              const relevancePct = Math.round(rec.relevanceScore * 100);
              const suggestedDiff = rec.suggestedDifficulty;

              return (
                <Card key={ws.id} className="p-5">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    {/* Rank */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-lg">
                      {idx + 1}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="font-semibold text-gray-900 text-lg">{ws.title}</h3>
                        <div className="flex gap-2 flex-shrink-0">
                          <Badge color="blue">{worksheetTypeLabels[ws.type]}</Badge>
                          {suggestedDiff && (
                            <Badge color={(difficultyColors[suggestedDiff] ?? 'gray') as 'green' | 'blue' | 'yellow' | 'red' | 'gray' | 'purple'}>
                              Suggested: {difficultyLabels[suggestedDiff]}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Relevance bar */}
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">Relevance</span>
                          <span className="font-medium text-teal-700">{relevancePct}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal-500 rounded-full transition-all"
                            style={{ width: `${relevancePct}%` }}
                          />
                        </div>
                      </div>

                      {/* Reasoning */}
                      <p className="text-sm text-gray-600">{rec.reasoning}</p>

                      {/* Actions */}
                      <div className="flex gap-3 pt-1">
                        <Button size="sm" onClick={() => router.push(`/${ws.id}`)}>
                          View
                        </Button>
                        {ws.isPublic && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={cloneMutation.isPending}
                            onClick={() => cloneMutation.mutate(ws.id)}
                          >
                            Clone to My Library
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ResourcesShell>
  );
}
