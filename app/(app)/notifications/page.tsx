"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Bell, CheckCheck, Eye, EyeOff, Trash2, Search, AlertTriangle, AlertCircle, Info, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import Swal from "sweetalert2"

const typeLabels: Record<string, string> = {
  low_stock: "Stock faible",
  out_of_stock: "Rupture de stock",
  info: "Information",
}

const typeIcons: Record<string, any> = {
  low_stock: AlertTriangle,
  out_of_stock: AlertCircle,
  info: Info,
}

const typeColors: Record<string, string> = {
  low_stock: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  out_of_stock: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [selectedNotification, setSelectedNotification] = useState<any>(null)
  const [showDetail, setShowDetail] = useState(false)

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/notifications")
      if (res.ok) setNotifications(await res.json())
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  const handleScan = async () => {
    await fetch("/api/notifications", { method: "POST" })
    fetchNotifications()
  }

  const handleMarkRead = async (id: string, read: boolean) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, read }),
    })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read } : n))
    if (selectedNotification?.id === id) {
      setSelectedNotification((prev: any) => prev ? { ...prev, read } : prev)
    }
  }

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: "Supprimer la notification ?",
      text: "Cette action est irréversible.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Supprimer",
      cancelButtonText: "Annuler",
    })
    if (!result.isConfirmed) return
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "delete" }),
    })
    setNotifications(prev => prev.filter(n => n.id !== id))
    if (selectedNotification?.id === id) {
      setShowDetail(false)
      setSelectedNotification(null)
    }
  }

  const handleMarkAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const filtered = notifications.filter(n => {
    if (filterType !== "all" && n.type !== filterType) return false
    if (filterStatus === "read" && !n.read) return false
    if (filterStatus === "unread" && n.read) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!n.message?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Notifications</h2>
          <p className="text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}`
              : "Toutes les notifications sont lues"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleScan}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Analyser le stock
          </Button>
          {unreadCount > 0 && (
            <Button variant="default" onClick={handleMarkAllRead}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Tout marquer comme lu
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher dans les notifications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="low_stock">Stock faible</SelectItem>
                <SelectItem value="out_of_stock">Rupture de stock</SelectItem>
                <SelectItem value="info">Information</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="unread">Non lues</SelectItem>
                <SelectItem value="read">Lues</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune notification trouvée</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const TypeIcon = typeIcons[n.type] || Bell
            return (
              <Card
                key={n.id}
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${!n.read ? "border-l-4 border-l-primary bg-primary/5" : ""}`}
                onClick={() => { setSelectedNotification(n); setShowDetail(true) }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-full ${typeColors[n.type] || "bg-muted"}`}>
                      <TypeIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-muted-foreground">
                          {typeLabels[n.type] || n.type}
                        </span>
                        {!n.read && (
                          <Badge variant="default" className="h-5 text-[10px] px-1.5">Nouveau</Badge>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {format(new Date(n.createdAt), "dd/MM/yyyy HH:mm", { locale: fr })}
                        </span>
                      </div>
                      <p className={`text-sm ${!n.read ? "font-semibold" : "text-muted-foreground"}`}>
                        {n.message}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title={n.read ? "Marquer comme non lu" : "Marquer comme lu"}
                        onClick={() => handleMarkRead(n.id, !n.read)}
                      >
                        {n.read ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        title="Supprimer"
                        onClick={() => handleDelete(n.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Détail de la notification</DialogTitle>
            <DialogDescription>
              {selectedNotification && format(new Date(selectedNotification.createdAt), "dd MMMM yyyy à HH:mm", { locale: fr })}
            </DialogDescription>
          </DialogHeader>
          {selectedNotification && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${typeColors[selectedNotification.type] || "bg-muted"}`}>
                  {(() => {
                    const Icon = typeIcons[selectedNotification.type] || Bell
                    return <Icon className="h-5 w-5" />
                  })()}
                </div>
                <div>
                  <Badge variant="outline">{typeLabels[selectedNotification.type] || selectedNotification.type}</Badge>
                  <Badge variant={selectedNotification.read ? "secondary" : "default"} className="ml-2">
                    {selectedNotification.read ? "Lu" : "Non lu"}
                  </Badge>
                </div>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm">{selectedNotification.message}</p>
              </div>
              {selectedNotification.relatedId && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">ID lié:</span> {selectedNotification.relatedId}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMarkRead(selectedNotification.id, !selectedNotification.read)}
                >
                  {selectedNotification.read ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                  {selectedNotification.read ? "Marquer non lu" : "Marquer lu"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(selectedNotification.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
