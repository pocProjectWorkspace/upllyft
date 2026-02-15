'use client';

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@upllyft/ui';
import type { FeedFilters } from '@/lib/api/feeds';

interface AdvancedFiltersProps {
  filters: FeedFilters;
  onChange: (filters: FeedFilters) => void;
  categories: string[];
}

const POST_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'DISCUSSION', label: 'Discussion' },
  { value: 'QUESTION', label: 'Question' },
  { value: 'RESOURCE', label: 'Resource' },
  { value: 'CASE_STUDY', label: 'Case Study' },
];

const DATE_RANGES = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

export function AdvancedFilters({ filters, onChange, categories }: AdvancedFiltersProps) {
  const [tagInput, setTagInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  function handleTagAdd(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTags = [...(filters.tags || []), tagInput.trim()];
      onChange({ ...filters, tags: newTags });
      setTagInput('');
    }
  }

  function handleTagRemove(tag: string) {
    const newTags = (filters.tags || []).filter((t) => t !== tag);
    onChange({ ...filters, tags: newTags.length > 0 ? newTags : undefined });
  }

  function handleClearAll() {
    onChange({});
  }

  const hasActiveFilters =
    filters.postType || filters.category || filters.tags?.length || filters.dateRange;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
          {hasActiveFilters && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-teal-500 rounded-full">
              {[filters.postType, filters.category, filters.dateRange].filter(Boolean).length +
                (filters.tags?.length || 0)}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Post Type */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Post Type</label>
              <Select
                value={filters.postType || ''}
                onValueChange={(v) => onChange({ ...filters, postType: v || undefined })}
              >
                <SelectTrigger className="w-full h-9 text-sm">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  {POST_TYPES.map((type) => (
                    <SelectItem key={type.value || 'all'} value={type.value || 'all'}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
              <Select
                value={filters.category || ''}
                onValueChange={(v) => onChange({ ...filters, category: v || undefined })}
              >
                <SelectTrigger className="w-full h-9 text-sm">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date Range</label>
            <Select
              value={filters.dateRange || 'all'}
              onValueChange={(v) =>
                onChange({
                  ...filters,
                  dateRange: v === 'all' ? undefined : (v as FeedFilters['dateRange']),
                })
              }
            >
              <SelectTrigger className="w-full h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGES.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tags</label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagAdd}
              placeholder="Type a tag and press Enter"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
            />
            {filters.tags && filters.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {filters.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full"
                  >
                    #{tag}
                    <button
                      onClick={() => handleTagRemove(tag)}
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
          </div>

          {/* Clear All */}
          {hasActiveFilters && (
            <button
              onClick={handleClearAll}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
