"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, Settings, User, AlertTriangle } from "lucide-react"
import useSWR from "swr"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function DashboardHeader() {
  const fetcher = (url: string) => fetch(url).then((r) => r.json())
  const { data, mutate } = useSWR<{ id: string; title: string; body: string; time: string; unread: boolean }[]>(
    "/api/notifications",
    fetcher,
  )
  const unreadCount = (data || []).filter((n) => n.unread).length

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markAllRead" }),
      })
      mutate()
    } catch (e) {
      console.log("[v0] markAllRead error:", (e as Error).message)
    }
  }

  return (
    <header className="border-b border-border bg-card px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Divide and Conquer</h1>
            <p className="text-sm text-muted-foreground">Intelligent Railway Traffic Control</p>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            Jaipur Junction
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
            <span className="text-muted-foreground">Live</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-destructive">{unreadCount}</Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>
                <Button variant="ghost" size="sm" onClick={markAllRead} className="h-7 px-2">
                  Mark all read
                </Button>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(data || []).length === 0 ? (
                <DropdownMenuItem className="text-muted-foreground">No notifications</DropdownMenuItem>
              ) : (
                (data || []).slice(0, 5).map((n) => (
                  <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-1">
                    <div className="flex w-full items-center justify-between">
                      <span className="font-medium">{n.title}</span>
                      {!n.unread ? null : <span className="ml-2 h-2 w-2 rounded-full bg-destructive" aria-hidden />}
                    </div>
                    <span className="text-sm text-muted-foreground">{n.body}</span>
                    <span className="text-xs text-muted-foreground">{n.time}</span>
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href="/incidents">View all</a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="sm">
            <User className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-chart-3" />
          <span className="text-muted-foreground">2 trains delayed, 1 platform conflict detected</span>
        </div>
      </div>
    </header>
  )
}
