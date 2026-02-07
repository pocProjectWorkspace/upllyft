import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Upllyft - Booking",
  description: "Find and book therapy sessions with qualified professionals",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
