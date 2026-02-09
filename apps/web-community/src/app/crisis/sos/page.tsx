'use client';

import Link from 'next/link';
import { CommunityShell } from '@/components/community-shell';
import { useEmergencyContacts } from '@/hooks/use-crisis';
import { Button, Card } from '@upllyft/ui';

const HOTLINES = [
  { name: 'National Suicide Prevention Lifeline', number: '988', description: 'Call or text 988, available 24/7' },
  { name: 'Crisis Text Line', number: '741741', description: 'Text HOME to 741741' },
  { name: 'National Domestic Violence Hotline', number: '1-800-799-7233', description: 'Available 24/7' },
  { name: 'SAMHSA National Helpline', number: '1-800-662-4357', description: 'Free, confidential, 24/7' },
  { name: 'Childhelp National Child Abuse Hotline', number: '1-800-422-4453', description: 'Available 24/7' },
  { name: 'Veterans Crisis Line', number: '988', description: 'Press 1 after dialing 988' },
];

const SAFETY_TIPS = [
  'Move to a safe location if possible',
  'Stay on the line with the crisis counselor',
  'Remove access to any harmful objects',
  'Reach out to a trusted friend, family member, or neighbor',
  'Take slow, deep breaths to help stay calm',
  'Remember: it is okay to ask for help',
  'Do not make any major decisions during a crisis',
  'Keep your phone charged and nearby',
];

export default function SOSPage() {
  const { data: emergency } = useEmergencyContacts();

  return (
    <CommunityShell>
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Emergency banner */}
        <div className="bg-red-600 rounded-2xl p-8 text-white text-center">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Emergency SOS</h1>
          <p className="text-red-100 mt-2 max-w-md mx-auto">
            If you or someone you know is in immediate danger, please call emergency services right away.
          </p>
          <a href="tel:911" className="block mt-6">
            <button className="bg-white text-red-600 font-bold text-xl px-12 py-4 rounded-2xl hover:bg-red-50 transition-colors shadow-lg">
              <span className="flex items-center justify-center gap-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Call {emergency?.emergency || '911'}
              </span>
            </button>
          </a>
        </div>

        {/* Emergency hotlines */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Emergency Hotlines</h2>
          <div className="space-y-3">
            {HOTLINES.map((hotline) => (
              <Card key={hotline.name} className="p-4" hover>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm">{hotline.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{hotline.description}</p>
                  </div>
                  <a
                    href={`tel:${hotline.number.replace(/\D/g, '')}`}
                    className="flex-shrink-0"
                  >
                    <Button size="sm" className="bg-red-600 hover:bg-red-700 from-red-600 to-red-700">
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {hotline.number}
                    </Button>
                  </a>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Safety tips */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Safety Tips</h2>
          <Card className="p-6">
            <ul className="space-y-3">
              {SAFETY_TIPS.map((tip, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-700">{tip}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Back link */}
        <div className="text-center pb-4">
          <Link href="/crisis" className="inline-flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Crisis Resources
          </Link>
        </div>
      </div>
    </CommunityShell>
  );
}
