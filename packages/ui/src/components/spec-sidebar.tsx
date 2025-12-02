"use client"

import * as React from "react"
import Link from "next/link"
import { FileText, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/status-badge"
import { cn } from "@/lib/utils"

interface Spec {
  id: string
  specNumber: number | null
  title: string | null
  specName: string
  status: string | null
  priority: string | null
}

interface SpecSidebarProps {
  specs: Spec[]
  currentSpecId: string
}

export function SpecSidebar({ specs, currentSpecId }: SpecSidebarProps) {
  const [collapsed, setCollapsed] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  const filteredSpecs = React.useMemo(() => {
    if (!searchQuery) return specs
    const query = searchQuery.toLowerCase()
    return specs.filter(
      (spec) =>
        spec.title?.toLowerCase().includes(query) ||
        spec.specName.toLowerCase().includes(query) ||
        spec.specNumber?.toString().includes(query)
    )
  }, [specs, searchQuery])

  if (collapsed) {
    return (
      <div className="sticky top-14 h-[calc(100vh-3.5rem)] w-12 border-r bg-background flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(false)}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Expand sidebar</span>
        </Button>
      </div>
    )
  }

  return (
    <aside className="sticky top-14 h-[calc(100vh-3.5rem)] w-64 border-r bg-background flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold text-sm">All Specs</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(true)}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Collapse sidebar</span>
        </Button>
      </div>

      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search specs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {filteredSpecs.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No specs found
            </div>
          ) : (
            filteredSpecs.map((spec) => {
              const isActive = spec.id === currentSpecId
              const displayTitle = spec.title || spec.specName
              
              return (
                <Link
                  key={spec.id}
                  href={`/specs/${spec.id}`}
                  className={cn(
                    "block p-2 rounded-md text-sm transition-colors mb-1",
                    isActive
                      ? "bg-accent text-accent-foreground font-medium"
                      : "hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {spec.specNumber && `#${spec.specNumber} `}
                        {displayTitle}
                      </div>
                      {spec.status && (
                        <div className="mt-1">
                          <StatusBadge status={spec.status} />
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </div>
    </aside>
  )
}
