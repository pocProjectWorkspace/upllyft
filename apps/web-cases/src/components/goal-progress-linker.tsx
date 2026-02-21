'use client';

import { useState, useEffect } from 'react';
import { useIEPs } from '@/hooks/use-cases';
import { Label, Skeleton } from '@upllyft/ui';
import { goalProgressRatingLabels, RATING_TO_VALUE } from '@/lib/utils';
import type { IEPGoal } from '@/lib/api/cases';

export interface GoalProgressEntry {
  goalId: string;
  progressNote: string;
  progressValue: number;
}

interface GoalProgressLinkerProps {
  caseId: string;
  value: GoalProgressEntry[];
  onChange: (entries: GoalProgressEntry[]) => void;
  disabled?: boolean;
}

const RATINGS = ['REGRESSION', 'MAINTAINING', 'PROGRESSING', 'ACHIEVED'] as const;

export function GoalProgressLinker({ caseId, value, onChange, disabled }: GoalProgressLinkerProps) {
  const { data: ieps, isLoading } = useIEPs(caseId);

  // Flatten all goals from all active/draft IEPs
  const allGoals: IEPGoal[] = [];
  if (Array.isArray(ieps)) {
    for (const iep of ieps) {
      if (iep.goals) {
        allGoals.push(...iep.goals);
      }
    }
  }

  const selectedGoalIds = new Set(value.map((e) => e.goalId));

  const toggleGoal = (goalId: string) => {
    if (disabled) return;
    if (selectedGoalIds.has(goalId)) {
      onChange(value.filter((e) => e.goalId !== goalId));
    } else {
      onChange([...value, { goalId, progressNote: 'MAINTAINING', progressValue: RATING_TO_VALUE['MAINTAINING'] }]);
    }
  };

  const setRating = (goalId: string, rating: string) => {
    if (disabled) return;
    onChange(
      value.map((e) =>
        e.goalId === goalId
          ? { ...e, progressNote: rating, progressValue: RATING_TO_VALUE[rating] ?? 25 }
          : e,
      ),
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (allGoals.length === 0) {
    return (
      <div className="text-sm text-gray-400 py-3">
        No IEP goals found for this case. Create an IEP with goals first.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-gray-700">Link Goal Progress</Label>
      <div className="space-y-2">
        {allGoals.map((goal) => {
          const isSelected = selectedGoalIds.has(goal.id);
          const entry = value.find((e) => e.goalId === goal.id);

          return (
            <div
              key={goal.id}
              className={`border rounded-lg p-3 transition-colors ${
                isSelected ? 'border-teal-300 bg-teal-50/50' : 'border-gray-200'
              }`}
            >
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleGoal(goal.id)}
                  disabled={disabled}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 line-clamp-2">
                    {goal.goalText}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {goal.domain} · Current: {goal.currentProgress}%
                  </p>
                </div>
              </label>

              {isSelected && (
                <div className="mt-3 ml-7 flex flex-wrap gap-2">
                  {RATINGS.map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      disabled={disabled}
                      onClick={() => setRating(goal.id, rating)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        entry?.progressNote === rating
                          ? rating === 'REGRESSION'
                            ? 'bg-red-100 text-red-700 ring-1 ring-red-300'
                            : rating === 'MAINTAINING'
                              ? 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300'
                              : rating === 'PROGRESSING'
                                ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                                : 'bg-green-100 text-green-700 ring-1 ring-green-300'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {goalProgressRatingLabels[rating]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
