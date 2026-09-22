import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Upllyft - Learning Resources',
  description: 'AI-powered worksheets, assignments and a community resource library.',
};

/**
 * Resources section of the hub (merged from the former web-resources app).
 * The shared header comes from the root AppFrame; pages keep using
 * ResourcesShell for their auth guard and content container.
 */
export default function ResourcesLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-gray-50/50">{children}</div>;
}
