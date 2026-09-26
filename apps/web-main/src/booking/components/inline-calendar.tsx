'use client';

import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isBefore,
  addMonths,
  subMonths,
} from 'date-fns';

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

const WEEKDAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function InlineCalendar({
  selectedDate,
  onSelectDate,
}: {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = useMemo(() => new Date(), []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <div className="select-none">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          disabled={isBefore(endOfMonth(subMonths(currentMonth, 1)), todayStart)}
        >
          <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
        </button>
        <h3 className="text-base font-semibold text-gray-900">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <ChevronRightIcon className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_HEADERS.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isPastDay = isBefore(day, todayStart);
          const isToday = isSameDay(day, today);

          return (
            <button
              key={day.toISOString()}
              onClick={() => !isPastDay && isCurrentMonth && onSelectDate(day)}
              disabled={isPastDay || !isCurrentMonth}
              className={`
                relative h-10 rounded-xl text-sm font-medium transition-all
                ${!isCurrentMonth ? 'text-gray-300 cursor-default' : ''}
                ${isPastDay && isCurrentMonth ? 'text-gray-300 cursor-not-allowed' : ''}
                ${!isPastDay && isCurrentMonth && !isSelected ? 'text-gray-700 hover:bg-teal-50 cursor-pointer' : ''}
                ${isSelected ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-sm' : ''}
                ${isToday && !isSelected ? 'ring-1 ring-teal-400' : ''}
              `}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}
