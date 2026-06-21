import type { Metadata, Viewport } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

export const viewport: Viewport = {
  themeColor: "#6B3FA0",
};

export const metadata: Metadata = {
  title: "Upllyft — AI-Powered Therapy Platform for Neurodivergent Children",
  description:
    "Upllyft connects parents, therapists, and schools around every child with a neurodevelopmental condition. Built for MENA. MOU Partner: Al Noor Training Centre, Dubai.",
  openGraph: {
    title: "Upllyft",
    description: "Therapy infrastructure for every child.",
    url: "https://upllyft.com",
    siteName: "Upllyft",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
