import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chris & Naomi | Wedding RSVP",
  description: "RSVP and wedding day details for Chris and Naomi.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
