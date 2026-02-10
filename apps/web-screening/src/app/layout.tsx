import type { Metadata } from "next";
import { Providers } from "./providers";
import { ToastProvider } from "./toast-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Upllyft - Milestone Map",
  description: "Developmental screening and milestone tracking for your children",
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
        <Providers>
          {children}
          <ToastProvider />
        </Providers>
      </body>
    </html>
  );
}
