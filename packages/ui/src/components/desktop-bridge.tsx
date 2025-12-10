"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useProject } from "@/contexts/project-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "next/navigation";

const MENU_EVENT = "leanspec:desktop-menu";

type DesktopMenuDetail = {
  action?: string;
};

type DesktopDialogs = {
  newSpec: boolean;
  shortcuts: boolean;
  logs: boolean;
  about: boolean;
};

function DesktopBridgeInner() {
  const searchParams = useSearchParams();
  const isDesktop = searchParams?.get("desktop") === "1";
  const [dialogs, setDialogs] = useState<DesktopDialogs>({ newSpec: false, shortcuts: false, logs: false, about: false });
  const [specSlug, setSpecSlug] = useState("");
  const [specTitle, setSpecTitle] = useState("");
  const [logPath, setLogPath] = useState("");
  const [desktopVersion, setDesktopVersion] = useState("");
  const [commandCopied, setCommandCopied] = useState(false);
  const slugInputRef = useRef<HTMLInputElement>(null);
  const { currentProject } = useProject();
  const { t } = useTranslation("common");

  const dispatchMenuEvent = useCallback((action: string) => {
    if (typeof window === "undefined") {
      return;
    }
    window.dispatchEvent(
      new CustomEvent<DesktopMenuDetail>(MENU_EVENT, {
        detail: { action },
      }),
    );
  }, []);

  const sendDesktopAction = useCallback(
    (action: string) => {
      if (!isDesktop || typeof window === "undefined") {
        return;
      }
      window.parent?.postMessage({ source: "leanspec-ui", type: "desktop-action", action }, "*");
    },
    [isDesktop],
  );

  const handleMenuAction = useCallback(
    (action: string) => {
      switch (action) {
        case "desktop://menu-find":
          dispatchMenuEvent(action);
          break;
        case "desktop://menu-toggle-sidebar":
          if (typeof window !== "undefined") {
            window.toggleMainSidebar?.();
          }
          break;
        case "desktop://menu-new-spec":
          setDialogs((prev) => ({ ...prev, newSpec: true }));
          setTimeout(() => slugInputRef.current?.focus(), 0);
          break;
        case "desktop://menu-shortcuts":
          setDialogs((prev) => ({ ...prev, shortcuts: true }));
          break;
        case "desktop://menu-logs":
          setDialogs((prev) => ({ ...prev, logs: true }));
          sendDesktopAction("request-logs-path");
          break;
        case "desktop://menu-about":
          setDialogs((prev) => ({ ...prev, about: true }));
          sendDesktopAction("get-version");
          break;
        default:
          break;
      }
    },
    [dispatchMenuEvent, sendDesktopAction],
  );

  useEffect(() => {
    if (!isDesktop || typeof window === "undefined") {
      return;
    }

    const listener = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") {
        return;
      }

      if (data.source === "leanspec-desktop" && data.type === "menu") {
        handleMenuAction(data.action);
      } else if (data.source === "leanspec-desktop" && data.type === "desktop-response") {
        if (data.action === "logs-path") {
          setLogPath(data.payload?.path ?? "");
        } else if (data.action === "desktop-version") {
          setDesktopVersion(data.payload?.version ?? "");
        }
      }
    };

    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [handleMenuAction, isDesktop]);

  const handleDialogChange = useCallback((key: keyof DesktopDialogs, open: boolean) => {
    setDialogs((prev) => ({ ...prev, [key]: open }));
    if (!open && key === "newSpec") {
      setCommandCopied(false);
    }
  }, []);

  const createCommand = useMemo(() => {
    if (!currentProject?.path || !specSlug.trim()) {
      return "";
    }

    const slug = specSlug.trim();
    const title = specTitle.trim();
    const pathSegment = currentProject.path.includes(" ") ? `cd "${currentProject.path}" && ` : `cd ${currentProject.path} && `;
    const titleFlag = title ? ` --title "${title}"` : "";
    return `${pathSegment}lean-spec create ${slug}${titleFlag}`;
  }, [currentProject, specSlug, specTitle]);

  const handleCopyCommand = useCallback(async () => {
    if (!createCommand) {
      return;
    }

    try {
      await navigator.clipboard.writeText(createCommand);
      setCommandCopied(true);
      setTimeout(() => setCommandCopied(false), 2000);
    } catch (error) {
      console.error(error);
    }
  }, [createCommand]);

  const shortcutSections = useMemo(
    () => [
      {
        title: t("desktopMenu.shortcuts.sections.global"),
        items: [
          { combo: "⌘ ⇧ L", label: t("desktopMenu.shortcuts.items.toggleWindow") },
          { combo: "⌘ ⇧ K", label: t("desktopMenu.shortcuts.items.quickSwitch") },
          { combo: "⌘ N", label: t("desktopMenu.shortcuts.items.newSpec") },
        ],
      },
      {
        title: t("desktopMenu.shortcuts.sections.view"),
        items: [
          { combo: "⌘ R", label: t("desktopMenu.shortcuts.items.refreshProjects") },
          { combo: "⌘ B", label: t("desktopMenu.shortcuts.items.toggleSidebar") },
          { combo: "⌘ F", label: t("desktopMenu.shortcuts.items.quickFind") },
        ],
      },
      {
        title: t("desktopMenu.shortcuts.sections.help"),
        items: [
          { combo: "⌘ ⌥ /", label: t("desktopMenu.shortcuts.items.shortcuts") },
          { combo: "⌘ ?", label: t("desktopMenu.shortcuts.items.docs") },
        ],
      },
    ],
    [t],
  );

  const handleOpenLogsFolder = useCallback(() => {
    sendDesktopAction("open-logs");
  }, [sendDesktopAction]);

  const handleCopyLogPath = useCallback(() => {
    if (!logPath) {
      return;
    }
    navigator.clipboard.writeText(logPath).catch((error) => console.error(error));
  }, [logPath]);

  if (!isDesktop) {
    return null;
  }

  return (
    <>
      <Dialog open={dialogs.newSpec} onOpenChange={(open) => handleDialogChange("newSpec", open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("desktopMenu.newSpec.title")}</DialogTitle>
            <DialogDescription>{t("desktopMenu.newSpec.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="desktop-new-spec-slug">
                {t("desktopMenu.newSpec.slugLabel")}
              </label>
              <Input
                id="desktop-new-spec-slug"
                ref={slugInputRef}
                value={specSlug}
                onChange={(event) => setSpecSlug(event.target.value)}
                placeholder={t("desktopMenu.newSpec.slugPlaceholder")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="desktop-new-spec-title">
                {t("desktopMenu.newSpec.titleLabel")}
              </label>
              <Input
                id="desktop-new-spec-title"
                value={specTitle}
                onChange={(event) => setSpecTitle(event.target.value)}
                placeholder={t("desktopMenu.newSpec.titlePlaceholder")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t("desktopMenu.newSpec.commandLabel")}</label>
              <div className="rounded-md border bg-muted/50 p-2 text-xs font-mono break-all min-h-[48px]">
                {createCommand || t("desktopMenu.newSpec.commandPlaceholder")}
              </div>
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground sm:flex-1">
              {t("desktopMenu.newSpec.hint", {
                project: currentProject?.name ?? t("desktopMenu.newSpec.projectFallback"),
              })}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleDialogChange("newSpec", false)}>
                {t("desktopMenu.close")}
              </Button>
              <Button onClick={handleCopyCommand} disabled={!createCommand}>
                {commandCopied ? t("desktopMenu.newSpec.copied") : t("desktopMenu.newSpec.copyButton")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogs.shortcuts} onOpenChange={(open) => handleDialogChange("shortcuts", open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("desktopMenu.shortcuts.title")}</DialogTitle>
            <DialogDescription>{t("desktopMenu.shortcuts.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {shortcutSections.map((section) => (
              <div key={section.title}>
                <p className="text-sm font-semibold mb-2">{section.title}</p>
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <div key={item.combo} className="flex items-center justify-between text-sm">
                      <span>{item.label}</span>
                      <span className="font-mono text-xs bg-muted px-2 py-1 rounded-md">{item.combo}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogChange("shortcuts", false)}>
              {t("desktopMenu.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogs.logs} onOpenChange={(open) => handleDialogChange("logs", open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("desktopMenu.logs.title")}</DialogTitle>
            <DialogDescription>{t("desktopMenu.logs.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">{t("desktopMenu.logs.pathLabel")}</label>
              <div className="rounded-md border bg-muted/50 p-2 text-xs break-all min-h-[48px]">
                {logPath || t("desktopMenu.logs.pathPlaceholder")}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t("desktopMenu.logs.hint")}</p>
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="ghost" onClick={() => handleDialogChange("logs", false)}>
              {t("desktopMenu.close")}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCopyLogPath} disabled={!logPath}>
                {t("desktopMenu.logs.copyPath")}
              </Button>
              <Button onClick={handleOpenLogsFolder}>{t("desktopMenu.logs.openButton")}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogs.about} onOpenChange={(open) => handleDialogChange("about", open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("desktopMenu.about.title")}</DialogTitle>
            <DialogDescription>{t("desktopMenu.about.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("desktopMenu.about.version")}</span>
              <span className="font-mono">{desktopVersion || "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("desktopMenu.about.website")}</span>
              <a className="text-primary hover:underline" href="https://lean-spec.dev" target="_blank" rel="noreferrer">
                lean-spec.dev
              </a>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("desktopMenu.about.support")}</span>
              <a className="text-primary hover:underline" href="https://github.com/codervisor/lean-spec/discussions" target="_blank" rel="noreferrer">
                GitHub Discussions
              </a>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogChange("about", false)}>
              {t("desktopMenu.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function DesktopBridge() {
  return (
    <Suspense fallback={null}>
      <DesktopBridgeInner />
    </Suspense>
  );
}
