import type { Metadata } from "next";
import { Providers } from "./providers";
import { ToastProvider } from "./toast-provider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://app.safehaven-upllyft.com"),
  title: "Upllyft - Neurodivergent Support Platform",
  description:
    "Upllyft connects families with verified therapists, developmental screenings, AI-powered learning resources, and a supportive community for neurodivergent children.",
  applicationName: "Upllyft",
  authors: [{ name: "Upllyft", url: "https://app.safehaven-upllyft.com" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://app.safehaven-upllyft.com",
    siteName: "Upllyft",
    title: "Upllyft - Support for Neurodivergent Families",
    description:
      "Connect with verified therapists, access developmental screenings, and track your child's milestones.",
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
              description:
                "A platform empowering neurodivergent families with therapist connections, developmental screenings, and personalized resources.",
              contactPoint: {
                "@type": "ContactPoint",
                email: "privacy@upllyft.com",
                contactType: "Customer Support",
              },
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
