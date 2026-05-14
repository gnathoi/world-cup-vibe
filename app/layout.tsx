import type { Metadata } from "next";
import { Alfa_Slab_One, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const alfa = Alfa_Slab_One({
  weight: "400",
  variable: "--font-alfa-slab-one",
  subsets: ["latin"],
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  subsets: ["latin"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Goal! The 2026 Sweepstake",
  description: "A World Cup 2026 sweepstake for friends, played in the spirit of 1966.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${alfa.variable} ${plexSans.variable} ${plexMono.variable} antialiased`}
    >
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
