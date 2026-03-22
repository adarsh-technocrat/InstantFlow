import type { Metadata, Viewport } from "next";
import { DM_Sans, Geist_Mono, Space_Grotesk } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-logo",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  title: "Launchpad AI - Design to Flutter Code with AI",
  description: "Turn your app ideas into beautiful designs and production-ready Flutter code in seconds",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} font-sans antialiased`}
      >
        <ThemeProvider><AuthProvider>{children}</AuthProvider></ThemeProvider>
      </body>
    </html>
  );
}
