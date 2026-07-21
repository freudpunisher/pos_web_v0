"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/lib/auth-context"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Bell, LogOut, User, Settings, Sun, Moon, X, CheckCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

export function Header() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifs, setShowNotifs] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await fetch("/api/notifications")
        if (res.ok) setNotifications(await res.json())
      } catch {}
    }
    fetchNotifs()
    const scan = async () => {
      await fetch("/api/notifications", { method: "POST" })
      fetchNotifs()
    }
    scan()
    const interval = setInterval(scan, 60_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false)
    }
    if (showNotifs) document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [showNotifs])

  const markRead = async (ids: string[]) => {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    })
    setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n))
  }

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const unreadCount = notifications.filter(n => !n.read).length

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  const roleLabels: Record<string, string> = {
    admin: "Admin système",
    manager: "Gérant",
    cashier: "Caissier",
    waiter: "Serveur",
    chef: "Chef",
    stock_manager: "Gestionnaire de stock",
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300"
      case "manager": return "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300"
      case "cashier": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300"
      case "waiter": return "bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300"
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-medium text-foreground">Système de Point de Vente</h1>
      </div>

      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {mounted && (
            <>
              {resolvedTheme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              <span className="sr-only">Changer le thème</span>
            </>
          )}
        </Button>

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <Button variant="ghost" size="icon" className="relative" onClick={() => setShowNotifs(!showNotifs)}>
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground font-bold">
                {unreadCount}
              </span>
            )}
          </Button>

          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-border bg-card shadow-2xl z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-bold text-foreground">Notifications</span>
                <div className="flex gap-1">
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={markAllRead} title="Tout marquer comme lu">
                      <CheckCheck className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowNotifs(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 && (
                  <div className="p-6 text-center text-sm text-muted-foreground italic">
                    Aucune notification pour le moment
                  </div>
                )}
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 border-b border-border/50 text-sm hover:bg-secondary/5 cursor-pointer transition-colors",
                      !n.read && "bg-primary/5"
                    )}
                    onClick={() => !n.read && markRead([n.id])}
                  >
                    <div className={cn(
                      "mt-0.5 h-2 w-2 rounded-full shrink-0",
                      n.type === "out_of_stock" ? "bg-destructive" :
                      n.type === "low_stock" ? "bg-warning" : "bg-primary"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs", !n.read && "font-semibold")}>{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-3 px-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatar || "/placeholder.svg"} alt={user?.name} />
                <AvatarFallback className="bg-primary/20 text-primary">{user?.name?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start md:flex">
                <span className="text-sm font-medium">{user?.name}</span>
                <Badge variant="outline" className={`font-medium ${getRoleBadgeColor(user?.role || "")}`}>
                  {roleLabels[user?.role || ""] || user?.role}
                </Badge>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Mon Compte</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <User className="mr-2 h-4 w-4" />
              Profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Paramètres
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
