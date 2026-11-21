import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import "./globals.css";

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-inter-tight",
});

export const metadata: Metadata = {
  title: "adore",
  description: "adore",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={interTight.variable}>
      <body className="bg-paper text-ink antialiased">{children}</body>
    </html>
  );
}
