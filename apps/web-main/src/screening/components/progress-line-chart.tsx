'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';

// ── Custom Tooltip for chart ──

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-3 text-sm">
      <p className="font-semibold text-gray-900 mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-medium text-gray-900">{entry.value}%</span>
        </div>
      ))}
    </div>
  );
}

export interface ProgressLineChartProps {
  chartData: Record<string, any>[];
  domainIds: string[];
  domainNameMap: Record<string, string>;
  colors: Record<string, string>;
}

/**
 * Longitudinal screening chart. Lives in its own module so `recharts` is
 * loaded lazily (via `next/dynamic`) only when a child has two or more
 * completed screenings, instead of in the screening home page's first-load JS.
 */
export default function ProgressLineChart({ chartData, domainIds, domainNameMap, colors }: ProgressLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fill: '#6b7280' }}
          tickLine={false}
          axisLine={{ stroke: '#e5e7eb' }}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 12, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <RechartsTooltip content={<ChartTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '12px' }}
          iconType="circle"
          iconSize={8}
        />
        {/* Total Score line — bolder and dashed */}
        <Line
          type="monotone"
          dataKey="totalScore"
          name="Total Score"
          stroke="#111827"
          strokeWidth={3}
          strokeDasharray="6 3"
          dot={{ r: 4, fill: '#111827' }}
          activeDot={{ r: 6 }}
        />
        {/* Domain lines */}
        {domainIds.map((domainId) => (
          <Line
            key={domainId}
            type="monotone"
            dataKey={domainId}
            name={domainNameMap[domainId] || domainId}
            stroke={colors[domainId] || '#9ca3af'}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
