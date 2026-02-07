import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Upllyft - Community",
  description: "Connect with parents, therapists, and educators in the neurodivergent community",
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
