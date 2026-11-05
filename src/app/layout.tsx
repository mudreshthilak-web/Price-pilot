import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Price Pilot - Smart Price Comparison for India",
  description:
    "Compare prices across Amazon, Flipkart, Croma and Reliance Digital. Find the best deals with AI-powered recommendations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="relative flex min-h-screen flex-col">
            <Suspense fallback={<div className="h-16 border-b" />}>
              <Header />
            </Suspense>
            <main className="flex-1">
              <Suspense fallback={<div className="container mx-auto px-4 py-8">Loading...</div>}>
                {children}
              </Suspense>
            </main>
            <footer className="border-t py-6 text-center text-sm text-muted-foreground">
              <p>
                Price Pilot — AI-assisted price comparison.{" "}
                <span className="text-xs">
                  All prices are illustrative sample data. Not affiliated with
                  any retailer.
                </span>
              </p>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
