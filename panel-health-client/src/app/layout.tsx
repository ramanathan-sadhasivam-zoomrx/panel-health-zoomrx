import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import RootShell from "@/components/root-shell";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { LoadingProvider } from "@/contexts/LoadingContext";
import ConditionalRootShell from "@/components/ConditionalRootShell";

const inter = Inter({ subsets: ["latin"] });
const manrope = Manrope({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Panel Health",
  description: "Panel Health Dashboard",
};

// Stable provider wrapper to prevent re-renders
function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <LoadingProvider>
        <AuthProvider>
          <ConditionalRootShell>{children}</ConditionalRootShell>
        </AuthProvider>
      </LoadingProvider>
    </ErrorBoundary>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body className={`${inter.className} ${manrope.className}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
