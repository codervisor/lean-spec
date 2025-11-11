import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LeanSpec Web - Interactive Spec Showcase",
  description: "Browse and explore LeanSpec specifications in a rich, interactive format",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
