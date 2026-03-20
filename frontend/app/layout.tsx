import type { Metadata } from "next";
import { Poppins } from "next/font/google";

import { AuthProvider } from "@/components/auth-provider";
import { NavigationProgress } from "@/components/navigation-progress";
import { SiteFooter } from "@/components/site-footer";

import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Found Directory",
    template: "%s | Found Directory",
  },
  description: "Discover independent companies across retail, food, and wellness.",
  openGraph: {
    title: "Found Directory",
    description: "Discover independent companies across retail, food, and wellness.",
    siteName: "Found Directory",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Found Directory",
    description: "Discover independent companies across retail, food, and wellness.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.className} ${poppins.variable}`}>
        <AuthProvider>
          <NavigationProgress />
          {children}
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
