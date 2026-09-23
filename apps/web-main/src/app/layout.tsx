import type { Metadata } from "next";
import { cookies } from "next/headers";
import { fetchServerUser } from "@/lib/server-user";
import { Providers } from "./providers";
import { ToastProvider } from "./toast-provider";
import { AppFrame } from "@/components/app-frame";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Server-rendered auth (PERFORMANCE_AUDIT.md #35): read the access cookie
  // and start /auth/me here. The promise is streamed to AuthProvider, so the
  // shell renders immediately and the user arrives in the same response
  // instead of a separate client round trip. Reading cookies makes every
  // route dynamic; this is an authenticated app, so nothing was CDN-cached.
  const token = (await cookies()).get("upllyft_access_token")?.value ?? null;
  const serverUser = token ? fetchServerUser(token) : null;

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
        <Providers serverUser={serverUser}>
          <AppFrame>{children}</AppFrame>
          <ToastProvider />
        </Providers>
      </body>
    </html>
  );
}
