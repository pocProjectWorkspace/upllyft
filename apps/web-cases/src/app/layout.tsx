import type { Metadata } from 'next';
import { Providers } from './providers';
import { ToastProvider } from './toast-provider';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://cases.safehaven-upllyft.com'),
  title: 'Upllyft - Case Management',
  description: 'Manage patient cases, progress tracking, and clinical documentation for neurodivergent care.',
  applicationName: 'Upllyft Cases',
  authors: [{ name: 'Upllyft', url: 'https://app.safehaven-upllyft.com' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://cases.safehaven-upllyft.com',
    siteName: 'Upllyft',
    title: 'Upllyft - Case Management',
    description: 'Manage patient cases, progress tracking, and clinical documentation for neurodivergent care.',
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Upllyft",
              url: "https://app.safehaven-upllyft.com",
              logo: "https://app.safehaven-upllyft.com/logo.png",
              description: "A platform empowering neurodivergent families with therapist connections, developmental screenings, and personalized resources.",
            }),
          }}
        />
        <Providers>
          {children}
          <ToastProvider />
        </Providers>
      </body>
    </html>
  );
}
