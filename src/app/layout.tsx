import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Executive Command Center",
  description: "Sonance executive dashboard — unified view of communications, tasks, calendar, and strategic priorities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${dmSans.variable} ${playfairDisplay.variable} antialiased`}
      >
        <ToastProvider>
          {children}
        </ToastProvider>
        <div className="grain-overlay" aria-hidden="true" />
      </body>
    </html>
  );
}
