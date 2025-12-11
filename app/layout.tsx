import type { Metadata } from "next";
import { Geist, Geist_Mono, Skranji } from "next/font/google";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
