'use client';

import { AppHeader } from '@upllyft/ui';

const sections = [
  {
    title: 'Acceptance of Terms',
    content: [
      'By accessing or using Upllyft\'s platform, including our web applications, mobile applications, and related services (collectively, the "Services"), you agree to be bound by these Terms of Service.',
      'If you do not agree to these terms, you may not access or use our Services. If you are using the Services on behalf of an organization, you represent and warrant that you have the authority to bind that organization to these terms.',
      'We reserve the right to update these terms at any time. Your continued use of the Services after changes are posted constitutes your acceptance of the revised terms.',
    ],
  },
  {
    title: 'Description of Service',
    content: [
      'Upllyft is a platform designed to support neurodivergent communities by connecting families, therapists, educators, and organizations. Our Services include community forums, developmental screening tools, professional booking, resource libraries, case management, and related features.',
      'We provide tools and a platform for communication and connection, but we are not a healthcare provider. The information and services available through our platform are not a substitute for professional medical advice, diagnosis, or treatment.',
      'We strive to maintain the availability and reliability of our Services but do not guarantee uninterrupted or error-free operation. We may modify, suspend, or discontinue any aspect of the Services at any time.',
    ],
  },
  {
    title: 'User Accounts',
    content: [
      'To access certain features of our Services, you must create an account. You agree to provide accurate, current, and complete information during registration and to keep your account information up to date.',
      'You are responsible for safeguarding your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.',
      'We reserve the right to suspend or terminate your account if any information provided is inaccurate, misleading, or violates these terms. You may not create multiple accounts, share your account, or transfer your account to another person without our consent.',
      'You must be at least 18 years of age to create an account. Parents and guardians manage accounts and information on behalf of their children.',
    ],
  },
  {
    title: 'Code of Conduct',
    content: [
      'Upllyft is a safe space for neurodivergent families and professionals. You agree to treat all members with respect, empathy, and understanding.',
      'You may not post content that is harassing, abusive, threatening, defamatory, obscene, or otherwise objectionable. You may not discriminate against any individual or group based on disability, neurodivergence, race, gender, religion, or any other protected characteristic.',
      'You may not share another person\'s personal information, including children\'s information, without their explicit consent. You may not impersonate another person or misrepresent your professional qualifications.',
      'You may not use the Services for any illegal purpose, to distribute spam or malware, or to interfere with the operation of the platform. Violation of these guidelines may result in content removal, account suspension, or permanent ban.',
    ],
  },
  {
    title: 'Professional Services',
    content: [
      'Upllyft connects users with licensed therapists, educators, and other professionals ("Providers"). Providers on our platform are independent professionals and are not employees, agents, or representatives of Upllyft.',
      'Upllyft does not endorse, guarantee, or assume responsibility for the quality, accuracy, or outcomes of any professional services provided through the platform. Users should independently verify Provider credentials and qualifications.',
      'Payments for professional services are processed through our payment partner (Stripe). Session fees, cancellation policies, and refund terms are set by individual Providers and displayed before booking.',
      'By booking a session, you agree to the Provider\'s terms and acknowledge that the Provider-client relationship is between you and the Provider, not Upllyft.',
    ],
  },
  {
    title: 'Intellectual Property',
    content: [
      'The Upllyft platform, including its design, logos, trademarks, text, graphics, software, and other content, is owned by or licensed to Upllyft and is protected by intellectual property laws.',
      'You retain ownership of content you create and post on the platform (such as community posts and comments). By posting content, you grant Upllyft a non-exclusive, worldwide, royalty-free license to use, display, reproduce, and distribute your content in connection with operating the Services.',
      'You may not copy, modify, distribute, sell, or lease any part of our Services or included content, nor may you reverse engineer or attempt to extract the source code of our software.',
      'If you believe your intellectual property rights have been infringed, please contact us with details of the alleged infringement.',
    ],
  },
  {
    title: 'Limitation of Liability',
    content: [
      'To the fullest extent permitted by law, Upllyft and its officers, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the Services.',
      'Upllyft is not liable for any actions or advice provided by Providers on the platform. We do not guarantee the accuracy or completeness of any screening results, assessments, or recommendations generated through our tools.',
      'Our total liability to you for any claims arising from or related to the Services shall not exceed the amount you paid to Upllyft in the twelve (12) months preceding the claim.',
      'Some jurisdictions do not allow the exclusion or limitation of certain damages. In those jurisdictions, our liability is limited to the greatest extent permitted by law.',
    ],
  },
  {
    title: 'Termination',
    content: [
      'You may terminate your account at any time by using the account deletion feature in Settings or by contacting our support team.',
      'We may suspend or terminate your access to the Services at any time, with or without cause, and with or without notice. Reasons for termination include, but are not limited to, violations of these terms, fraudulent activity, or extended periods of inactivity.',
      'Upon termination, your right to use the Services will immediately cease. Provisions of these terms that by their nature should survive termination will remain in effect, including intellectual property provisions, limitation of liability, and dispute resolution.',
      'You may request a copy of your data before account deletion. After deletion, your data will be removed in accordance with our Privacy Policy and applicable data retention laws.',
    ],
  },
  {
    title: 'Changes to Terms',
    content: [
      'We reserve the right to modify these Terms of Service at any time. When we make material changes, we will notify you by email or through a prominent notice on our platform at least 30 days before the changes take effect.',
      'Your continued use of the Services after the effective date of any changes constitutes your acceptance of the revised terms. If you do not agree with the changes, you must stop using the Services and may terminate your account.',
      'We encourage you to review these terms periodically to stay informed about your rights and obligations.',
    ],
  },
  {
    title: 'Contact Us',
    content: [
      'If you have any questions, concerns, or feedback about these Terms of Service, please contact us at:',
      'Email: legal@upllyft.com',
      'For general support inquiries, you can reach us at support@upllyft.com.',
    ],
  },
];

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader currentApp="main" />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-sm text-gray-500">Last updated: February 15, 2026</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 mb-6">
          <p className="text-sm text-gray-600 leading-relaxed">
            Welcome to Upllyft. These Terms of Service govern your access to and use of our platform
            and services. Please read these terms carefully before using our Services. By creating an
            account or using any part of the Upllyft platform, you agree to be bound by these terms.
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
