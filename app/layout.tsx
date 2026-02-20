import type { Metadata } from "next";
import { Geist, Geist_Mono, Skranji } from "next/font/google";
import "./globals.css";
import Eruda from "../components/Eruda";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const skranji = Skranji({
  weight: ["400", "700"],
  variable: "--font-skranji",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BattleBuddy - Warhammer 40k Companion",
  description: "A companion app for playing Warhammer 40k",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    title: "BattleBuddy",
    capable: true,
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${skranji.variable} antialiased bg-gray-900 text-white`}
        suppressHydrationWarning
      >
        <Eruda />
        {children}
      </body>
    </html>
  );
}
