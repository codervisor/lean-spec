import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navigation } from "@/components/navigation";
import { MainSidebar } from "@/components/main-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { Toast } from "@/components/ui/toast";
import { ProjectProvider } from "@/contexts/project-context";
import { getSpecs } from "@/lib/db/service-queries";
import { Analytics } from "@vercel/analytics/react";

export const metadata: Metadata = {
  title: "LeanSpec Web - Interactive Spec Showcase",
  description: "Browse and explore LeanSpec specifications in a rich, interactive format",
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/logo.svg', type: 'image/svg+xml' },
    ],
    apple: '/logo.svg',
  },
  openGraph: {
    title: "LeanSpec Web",
    description: "Browse and explore LeanSpec specifications in a rich, interactive format",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
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
      <body className="antialiased bg-background overflow-x-hidden">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ProjectProvider>
            <Navigation specs={specsForSearch} />
            <div className="flex w-full min-w-0">
              <MainSidebar />
              <main className="flex-1 min-h-[calc(100vh-3.5rem)] min-w-0 w-full lg:w-[calc(100vw-var(--main-sidebar-width,240px))]">
                {children}
              </main>
            </div>
            <Toast />
          </ProjectProvider>
        </ThemeProvider>
        {/* Analytics enabled via ENABLE_ANALYTICS env var in Vercel */}
        {process.env.ENABLE_ANALYTICS === 'true' && <Analytics />}
      </body>
    </html>
  );
}
