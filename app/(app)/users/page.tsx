"use client"

import { UserManagement } from "@/components/user-management"
import { useAuth } from "@/lib/auth-context"
import { Loader2 } from "lucide-react"

export default function UsersPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Chargement...</span>
      </div>
    )
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-foreground">Accès refusé</h2>
        <p className="text-muted-foreground">Seuls les administrateurs peuvent gérer les utilisateurs.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Utilisateurs</h2>
        <p className="text-muted-foreground">Créer et gérer les comptes du personnel</p>
      </div>
      <UserManagement />
    </div>
  )
}
