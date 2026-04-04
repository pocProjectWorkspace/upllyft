import type { Metadata } from "next";
import { Providers } from "./providers";
import { ToastProvider } from "./toast-provider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://screening.safehaven-upllyft.com"),
  title: "Upllyft - Milestone Map",
  description: "Evidence-based developmental screening and milestone tracking for your children.",
  applicationName: "Upllyft Screening",
  authors: [{ name: "Upllyft", url: "https://app.safehaven-upllyft.com" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://screening.safehaven-upllyft.com",
    siteName: "Upllyft",
    title: "Upllyft - Developmental Screening",
    description: "Evidence-based developmental screening and milestone tracking for your children.",
  },
  icons: {
    icon: "/favicon.ico",
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
