import type { Metadata } from 'next';
import { Providers } from './providers';
import { ToastProvider } from './toast-provider';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://booking.safehaven-upllyft.com'),
  title: 'Upllyft - Booking',
  description: 'Find and book therapy sessions with verified professionals specializing in neurodivergent care.',
  applicationName: 'Upllyft Booking',
  authors: [{ name: 'Upllyft', url: 'https://app.safehaven-upllyft.com' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://booking.safehaven-upllyft.com',
    siteName: 'Upllyft',
    title: 'Upllyft - Book Therapy Sessions',
    description: 'Find and book therapy sessions with verified professionals specializing in neurodivergent care.',
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
