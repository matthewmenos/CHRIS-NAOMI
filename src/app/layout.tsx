import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Christian & Naomi | Wedding Countdown",
  description: "Celebrate the wedding of Christian and Naomi.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
