import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/library';
import { MarkdownRenderer } from './markdown-renderer';
import { TableOfContents, TableOfContentsSidebar } from './table-of-contents';
import { BackToTop } from '../shared/back-to-top';
import { PageContainer } from '../shared/page-container';

interface SpecDetailContentProps {
  displayContent: string;
  specName: string | undefined;
  basePath: string;
  hasSubSpecs: boolean;
  onChecklistToggle: (itemText: string, checked: boolean) => Promise<void>;
}

export function SpecDetailContent({
  displayContent,
  specName,
  basePath,
  hasSubSpecs,
  onChecklistToggle,
}: SpecDetailContentProps) {
  const [showSidebar, setShowSidebar] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const observerRef = useRef<ResizeObserver | null>(null);

  const mainContentRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (node) {
      setShowSidebar(node.clientWidth >= 1024);

      observerRef.current = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setShowSidebar(entry.contentRect.width >= 1024);
        }
      });
      observerRef.current.observe(node);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return (
    <>
      <PageContainer
        padding="none"
        contentClassName={cn(
          "flex flex-col w-full",
          showSidebar ? "lg:flex-row items-start" : ""
        )}
      >
        <div ref={mainContentRef} className="flex w-full">
          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-3 sm:py-6 min-w-0">
            <MarkdownRenderer
              content={displayContent}
              specName={specName}
              basePath={basePath}
              onChecklistToggle={onChecklistToggle}
            />
          </main>

          {/* Right Sidebar for TOC (Desktop only) */}
          <aside
            className={cn(
              "w-72 shrink-0 px-6 py-6 sticky overflow-y-auto scrollbar-auto-hide",
              showSidebar ? "block" : "hidden",
              hasSubSpecs
                ? "top-[calc(16.375rem-3.5rem)] h-[calc(100dvh-16.375rem)]"
                : "top-[calc(13.125rem-3.5rem)] h-[calc(100dvh-13.125rem)]"
            )}
          >
            <TableOfContentsSidebar content={displayContent} />
          </aside>
        </div>
      </PageContainer>

      {/* Floating action buttons (Mobile/Tablet only) */}
      <div className={showSidebar ? "hidden" : "block"}>
        <TableOfContents content={displayContent} />
      </div>
      <BackToTop targetId="spec-detail-main" />
    </>
  );
}
