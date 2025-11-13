import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/navigation";
import { ThemeProvider } from "@/components/theme-provider";
import { Toast } from "@/components/ui/toast";
import { getSpecs } from "@/lib/db/queries";

export const metadata: Metadata = {
  title: "LeanSpec Web - Interactive Spec Showcase",
  description: "Browse and explore LeanSpec specifications in a rich, interactive format",
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: "LeanSpec Web",
    description: "Browse and explore LeanSpec specifications in a rich, interactive format",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const specs = await getSpecs();
  const specsForSearch = specs
    .filter(spec => spec.specNumber && spec.title && spec.status && spec.priority)
    .map(spec => ({
      id: spec.id,
      specNumber: spec.specNumber!.toString(),
      title: spec.title!,
      status: spec.status!,
      priority: spec.priority!,
      tags: spec.tags || [],
      createdAt: spec.createdAt ? spec.createdAt.toISOString() : '',
    }));

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Navigation specs={specsForSearch} />
          <main className="min-h-screen">
            {children}
          </main>
          <Toast />
        </ThemeProvider>
      </body>
    </html>
  );
}
