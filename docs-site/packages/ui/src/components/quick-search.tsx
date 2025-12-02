"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { FileText, Search, Clock, Tag } from "lucide-react"
import Fuse from "fuse.js"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { StatusBadge } from "@/components/status-badge"
import { PriorityBadge } from "@/components/priority-badge"

interface Spec {
  id: string
  specNumber: string
  title: string
  status: string
  priority: string
  tags: string[]
  createdAt: string
}

interface QuickSearchProps {
  specs: Spec[]
}

export function QuickSearch({ specs }: QuickSearchProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [recentSearches, setRecentSearches] = React.useState<string[]>([])

  // Load recent searches from localStorage
  React.useEffect(() => {
    const saved = localStorage.getItem("leanspec-recent-searches")
    if (saved) {
      setRecentSearches(JSON.parse(saved))
    }
  }, [])

  // Setup keyboard shortcut
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  // Setup fuzzy search
  const fuse = React.useMemo(
    () =>
      new Fuse(specs, {
        keys: [
          { name: "title", weight: 2 },
          { name: "specNumber", weight: 1.5 },
          { name: "tags", weight: 0.5 },
        ],
        threshold: 0.4,
        includeScore: true,
        minMatchCharLength: 2,
      }),
    [specs]
  )

  const results = React.useMemo(() => {
    if (!search) return specs.slice(0, 8)
    return fuse.search(search).map((result) => result.item)
  }, [search, fuse, specs])

  const handleSelect = (specId: string, title: string) => {
    // Save to recent searches
    const updated = [title, ...recentSearches.filter((s) => s !== title)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem("leanspec-recent-searches", JSON.stringify(updated))

    // Navigate
    router.push(`/specs/${specId}`)
    setOpen(false)
    setSearch("")
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-2 sm:px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors border rounded-md hover:border-foreground/20"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Quick search...</span>
        <kbd className="hidden md:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search specs by title, number, or tags..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>No specs found.</CommandEmpty>

          {!search && recentSearches.length > 0 && (
            <CommandGroup heading="Recent Searches">
              {recentSearches.map((recent) => (
                <CommandItem
                  key={recent}
                  value={recent}
                  onSelect={() => {
                    setSearch(recent)
                  }}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  {recent}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandGroup heading="Specs">
            {results.map((spec) => (
              <CommandItem
                key={spec.id}
                value={`${spec.specNumber} ${spec.title}`}
                onSelect={() => handleSelect(spec.id, spec.title)}
              >
                <FileText className="mr-2 h-4 w-4" />
                <div className="flex-1 flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">#{spec.specNumber}</span>
                      <span className="truncate">{spec.title}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <StatusBadge status={spec.status} />
                    <PriorityBadge priority={spec.priority} />
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>

          {search && (
            <CommandGroup heading="Filter by Tag">
              {Array.from(new Set(specs.flatMap((s) => s.tags)))
                .filter((tag) => tag.toLowerCase().includes(search.toLowerCase()))
                .slice(0, 5)
                .map((tag) => (
                  <CommandItem
                    key={tag}
                    value={tag}
                    onSelect={() => {
                      router.push(`/?tag=${encodeURIComponent(tag)}`)
                      setOpen(false)
                    }}
                  >
                    <Tag className="mr-2 h-4 w-4" />
                    Filter by: <span className="ml-1 font-medium">{tag}</span>
                  </CommandItem>
                ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
