export const runtime = "edge";

import type { Metadata } from "next";
import { Instrument_Serif, IBM_Plex_Mono, Inter } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { OnboardingTour } from "@/components/onboarding-tour";
import { NavigationFeedback } from "@/components/navigation-feedback";
import { AppWalletProvider } from "@/components/wallet/dynamic-provider";
import "driver.js/dist/driver.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maecenas | Research Funding Protocol",
  description: "Fund rigorous research. Reward the evidence behind it.",
  icons: {
    icon: "/icon.png",
  },
  other: {
    "talentapp:project_verification": "15b33bdb1cbbefaa7060742fd498bd0083025f38ecd94ce54ff72ae1eb33d2058eed8de5027cd546f1cf868e0edfb3e7632e14c4ae4f9e5810c75073be1388b5",
  },
};

const serif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-serif",
});

const mono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-mono",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${serif.variable} ${mono.variable} ${sans.variable}`}>
      <body className="font-sans">
        <AppWalletProvider>
          <NavigationFeedback />
          <AppShell>{children}</AppShell>
          <OnboardingTour />
        </AppWalletProvider>
      </body>
    </html>
  );
}
