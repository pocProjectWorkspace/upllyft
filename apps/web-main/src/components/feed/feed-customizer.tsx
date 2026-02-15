'use client';

import { useState } from 'react';
import type { FeedPreferences, FeedDensity } from '@/lib/api/feeds';
import { FeedDensityToggle } from './feed-density-toggle';

interface FeedCustomizerProps {
  preferences: FeedPreferences;
  density: FeedDensity;
  onDensityChange: (density: FeedDensity) => void;
  onWeightsChange: (weights: FeedPreferences['contentWeights']) => void;
  onAddMutedKeyword: (keyword: string) => void;
  onRemoveMutedKeyword: (keyword: string) => void;
  onAddCategory: (category: string) => void;
  onRemoveCategory: (category: string) => void;
  categories: string[];
}

export function FeedCustomizer({
  preferences,
  density,
  onDensityChange,
  onWeightsChange,
  onAddMutedKeyword,
  onRemoveMutedKeyword,
  onAddCategory,
  onRemoveCategory,
  categories,
}: FeedCustomizerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');
  const [weights, setWeights] = useState(preferences.contentWeights);

  function handleKeywordAdd(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && keywordInput.trim()) {
      e.preventDefault();
      onAddMutedKeyword(keywordInput.trim());
      setKeywordInput('');
    }
  }

  function handleWeightChange(key: keyof FeedPreferences['contentWeights'], value: number) {
    const updated = { ...weights, [key]: value };
    setWeights(updated);
    onWeightsChange(updated);
  }

  const weightLabels: Record<keyof FeedPreferences['contentWeights'], string> = {
    discussions: 'Discussions',
    questions: 'Questions',
    resources: 'Resources',
    caseStudies: 'Case Studies',
  };

  const unselectedCategories = categories.filter(
    (c) => !preferences.preferredCategories.includes(c),
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-2xl transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Customize Feed
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-5 border-t border-gray-100 pt-4">
          {/* Density */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Display Density
            </label>
            <FeedDensityToggle density={density} onChange={onDensityChange} />
          </div>

          {/* Content Weights */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Content Priority
            </label>
            <div className="space-y-2.5">
              {(Object.keys(weightLabels) as (keyof FeedPreferences['contentWeights'])[]).map(
                (key) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 w-24">{weightLabels[key]}</span>
                    <input
                      type="range"
                      min={0}
                      max={2}
                      step={0.5}
                      value={weights[key]}
                      onChange={(e) => handleWeightChange(key, parseFloat(e.target.value))}
                      className="flex-1 h-1.5 bg-gray-200 rounded-full accent-teal-500"
                    />
                    <span className="text-xs text-gray-400 w-6 text-right">
                      {weights[key] === 0 ? 'Off' : weights[key] === 1 ? 'Norm' : 'High'}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>

          {/* Preferred Categories */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Preferred Categories
            </label>
            {preferences.preferredCategories.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {preferences.preferredCategories.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1 text-xs bg-teal-50 text-teal-700 px-2 py-1 rounded-full"
                  >
                    {cat}
                    <button
                      onClick={() => onRemoveCategory(cat)}
                      className="text-teal-400 hover:text-teal-600"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
            {unselectedCategories.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {unselectedCategories.slice(0, 6).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => onAddCategory(cat)}
                    className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full hover:bg-teal-50 hover:text-teal-700 transition-colors"
                  >
                    + {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Muted Keywords */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Muted Keywords
            </label>
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={handleKeywordAdd}
              placeholder="Type keyword and press Enter"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
            />
            {preferences.mutedKeywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {preferences.mutedKeywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full"
                  >
                    {kw}
                    <button
                      onClick={() => onRemoveMutedKeyword(kw)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
