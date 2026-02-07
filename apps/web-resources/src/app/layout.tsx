import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Upllyft - Learning Resources",
  description: "AI-powered worksheets and educational activities for neurodivergent children",
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
