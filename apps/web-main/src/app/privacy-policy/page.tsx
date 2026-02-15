'use client';

import { AppHeader } from '@upllyft/ui';

const sections = [
  {
    title: 'Information We Collect',
    content: [
      'We collect information you provide directly to us, such as when you create an account, fill out a form, participate in community discussions, book a session, or contact us for support.',
      'The types of information we may collect include your name, email address, password, profile information, children\'s developmental information (when voluntarily provided), session notes, community posts, and any other information you choose to provide.',
      'We automatically collect certain information when you use our platform, including your IP address, device and browser type, operating system, referral URLs, and information about how you interact with our services.',
    ],
  },
  {
    title: 'How We Use Your Information',
    content: [
      'We use the information we collect to provide, maintain, and improve our services, including to process transactions, send you related information such as session confirmations and reminders, and provide customer support.',
      'We use the information to personalize your experience, including to provide content recommendations, match you with appropriate professionals, and tailor screening assessments.',
      'We may use your information to send you technical notices, updates, security alerts, and administrative messages. We may also send you promotional communications, such as information about features, newsletters, and events, which you can opt out of at any time.',
      'We use the information to monitor and analyze trends, usage, and activities in connection with our services, and to detect, investigate, and prevent fraudulent transactions and other illegal activities.',
    ],
  },
  {
    title: 'How We Share Your Information',
    content: [
      'We may share your information with therapists, educators, and other professionals on the platform when you book sessions or engage in professional services. These professionals are bound by confidentiality obligations.',
      'We may share information with third-party service providers who perform services on our behalf, such as payment processing (Stripe), email delivery, hosting, and analytics. These providers are contractually obligated to protect your information.',
      'We may disclose your information if we believe disclosure is in accordance with, or required by, any applicable law, regulation, or legal process.',
      'We do not sell your personal information to third parties.',
    ],
  },
  {
    title: 'Data Security',
    content: [
      'We take reasonable measures to help protect your personal information from loss, theft, misuse, unauthorized access, disclosure, alteration, and destruction.',
      'All data is encrypted in transit using TLS/SSL and at rest using AES-256 encryption. Authentication tokens are securely stored and regularly rotated.',
      'We conduct regular security assessments and maintain strict access controls for our team members who handle personal data.',
      'While we strive to protect your information, no method of transmission over the Internet or electronic storage is completely secure. We cannot guarantee the absolute security of your data.',
    ],
  },
  {
    title: 'Children\'s Privacy',
    content: [
      'Upllyft is designed to support families with neurodivergent children. We are committed to protecting the privacy of children and comply with applicable children\'s privacy laws including COPPA.',
      'We do not knowingly collect personal information directly from children under 13 without parental consent. All child-related information is provided and managed by the parent or legal guardian.',
      'Developmental screening data, session notes, and progress information related to children are treated with the highest level of confidentiality and are only accessible to authorized parents/guardians and their chosen professionals.',
      'Parents and guardians can review, update, or request deletion of their child\'s information at any time by contacting us.',
    ],
  },
  {
    title: 'Your Rights',
    content: [
      'You have the right to access, correct, or delete your personal information at any time through your account settings or by contacting us.',
      'You have the right to opt out of marketing communications by following the unsubscribe instructions in our emails or updating your notification preferences.',
      'You have the right to request a copy of your personal data in a portable format. You can do this from the Settings page in your account.',
      'If you are a resident of the European Economic Area (EEA), you have additional rights under GDPR, including the right to restrict processing, object to processing, and lodge a complaint with a supervisory authority.',
      'If you are a California resident, you have additional rights under the CCPA, including the right to know what personal information we collect and the right to request deletion.',
    ],
  },
  {
    title: 'Updates to This Policy',
    content: [
      'We may update this Privacy Policy from time to time. If we make material changes, we will notify you by email or through a notice on our platform prior to the change becoming effective.',
      'We encourage you to review the Privacy Policy periodically to stay informed about our practices.',
      'Your continued use of our services after any changes to this Privacy Policy constitutes your acceptance of the updated policy.',
    ],
  },
  {
    title: 'Contact Us',
    content: [
      'If you have any questions about this Privacy Policy or our privacy practices, please contact us at:',
      'Email: privacy@upllyft.com',
      'You may also reach our Data Protection Officer at dpo@upllyft.com for questions related to data processing and your rights under applicable privacy laws.',
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader currentApp="main" />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500">Last updated: February 15, 2026</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 mb-6">
          <p className="text-sm text-gray-600 leading-relaxed">
            At Upllyft, we are committed to protecting the privacy of our users, especially families
            with neurodivergent children. This Privacy Policy explains how we collect, use, disclose,
            and safeguard your information when you use our platform, including our web applications,
            mobile applications, and related services.
          </p>
        </div>

        <div className="space-y-6">
          {sections.map((section, index) => (
            <div key={section.title} className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
              <h2 className="text-base font-semibold text-gray-900 mb-4">
                {index + 1}. {section.title}
              </h2>
              <div className="space-y-3">
                {section.content.map((paragraph, pIndex) => (
                  <p key={pIndex} className="text-sm text-gray-600 leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </a>
        </div>
      </main>
    </div>
  );
}
