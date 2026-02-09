import type { Metadata } from "next";
import { Providers } from "./providers";
import { ToastProvider } from "./toast-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Upllyft - Dashboard",
  description: "Empowering the neurodivergent community",
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
