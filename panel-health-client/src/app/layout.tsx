import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import RootShell from "@/components/root-shell";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ClientProviders } from "@/components/ClientProviders";

const inter = Inter({ subsets: ["latin"] });
const manrope = Manrope({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Panel Health",
  description: "Panel Health Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body className={`${inter.className} ${manrope.className}`}>
        <ErrorBoundary>
          <ClientProviders>
            <RootShell>{children}</RootShell>
          </ClientProviders>
        </ErrorBoundary>
      </body>
    </html>
  );
}
