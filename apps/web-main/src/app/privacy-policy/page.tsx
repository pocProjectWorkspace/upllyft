'use client';

import { companyContactLines } from '@/lib/company';



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
      'We may share information with third-party service providers who perform services on our behalf, such as payment processing, email delivery, hosting, and analytics. These providers are contractually obligated to protect your information.',
      'We may disclose your information if we believe disclosure is in accordance with, or required by, any applicable law, regulation, or legal process.',
      'We do not sell your personal information to third parties.',
    ],
  },
  {
    title: 'Data Protection',
    content: [
      'We take reasonable technical and organisational measures to protect your personal information against loss, theft, misuse, unauthorised access, disclosure, alteration, and destruction.',
      'Data is encrypted in transit using TLS and at rest using AES-256 encryption. Your account data and uploaded files are stored with our hosting provider in the European Union. Passwords are stored as one-way hashes, and sign-in sessions expire and can be revoked.',
      'Access to personal data is limited to people who need it for their role, and we keep audit records of key actions on accounts and on case and clinical records.',
      'We use personal information only for the purposes described in this policy, and keep it only for as long as those purposes require or as the law requires.',
      'We take steps designed to prevent data loss, but no system is immune to failure. We do not guarantee that data will never be lost, corrupted or unavailable, and you are responsible for keeping your own copies of information that is important to you.',
      'If we become aware of a breach affecting your personal information, we will notify you and the relevant authorities where applicable law requires us to.',
      'No method of transmission over the Internet or electronic storage is completely secure, and we cannot guarantee the absolute security of your data.',
    ],
  },
  {
    title: 'Children\'s Privacy',
    content: [
      'Upllyft is designed to support families with neurodivergent children. Accounts are for adults only: you must be 18 or older to create one, and we do not knowingly collect personal information directly from anyone under 18.',
      'Information about a child is provided and managed by the child\'s parent or legal guardian, or by a professional, clinic, nursery or school acting with the parent\'s or guardian\'s authorisation. We treat children\'s information with particular care and process it on the basis of that parent\'s or guardian\'s consent. If we learn that we have collected personal information directly from someone under 18, we will delete it.',
      'Developmental screening data, session notes, and progress information related to children are treated with the highest level of confidentiality and are only accessible to authorized parents/guardians and their chosen professionals.',
      'Parents and guardians can review, update, or request deletion of their child\'s information at any time by contacting us at support@upllyft.com.',
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
      ...companyContactLines(),
      'Email: support@upllyft.com',
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50/50">

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500">Last updated: October 18, 2026</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 mb-6">
          <p className="text-sm text-gray-600 leading-relaxed">
            At Upllyft, we are committed to protecting the privacy of our users, especially families
            with neurodivergent children. Upllyft is an initiative developed and operated by MindsSparc
            Private Limited, a company incorporated in India (&ldquo;MindsSparc&rdquo;, &ldquo;we&rdquo;,
            &ldquo;us&rdquo;), which is responsible for the personal information described in this
            policy. This Privacy Policy explains how we collect, use, disclose,
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
