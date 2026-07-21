"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Plus, Shield, Loader2, Edit2 } from "lucide-react"
import { useUsers } from "@/hooks/use-users"

export function UserManagement() {
  const { users, loading: usersLoading, createUser, updateUser } = useUsers()
  const [newUser, setNewUser] = useState({ name: "", email: "", phone: "", password: "", role: "cashier_food" })
  const [showAddUser, setShowAddUser] = useState(false)
  const [showEditUser, setShowEditUser] = useState(false)
  const [editingUser, setEditingUser] = useState<{ id: string; name: string; email: string; phone?: string; role: string; password?: string } | null>(null)

  const roleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Admin système",
      cashier_food: "Caissier - Alimentation",
      supervisor_food: "Superviseur - Alimentation",
      cashier_bakery: "Caissier - Boulangerie",
      supervisor_bakery: "Superviseur - Boulangerie",
      production_bakery: "Responsable production",
      manager: "Gérant",
      stock_manager: "Gestionnaire de stock",
      investor: "Investisseur",
      accountant: "Comptable",
    }
    return labels[role] || role || "Inconnu"
  }

  const roleBadgeClass = (role: string) => {
    if (role === "admin") return "bg-destructive/20 text-destructive"
    if (role === "manager" || role === "stock_manager" || role === "investor" || role === "accountant") {
      return "bg-primary/20 text-primary"
    }
    return "bg-secondary/50 text-foreground"
  }

  const handleAddUser = async () => {
    if (newUser.name.trim() && newUser.email.trim() && newUser.password.trim()) {
      await createUser(newUser)
      setNewUser({ name: "", email: "", phone: "", password: "", role: "cashier_food" })
      setShowAddUser(false)
    }
  }

  const handleOpenEdit = (user: any) => {
    setEditingUser({ id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, password: "" })
    setShowEditUser(true)
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return
    await updateUser(editingUser.id, {
      name: editingUser.name,
      email: editingUser.email,
      phone: editingUser.phone,
      role: editingUser.role,
      password: editingUser.password,
    })
    setShowEditUser(false)
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestion des utilisateurs
          </CardTitle>
          <CardDescription>Gérer les utilisateurs et leurs rôles</CardDescription>
        </div>
        <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un utilisateur
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un utilisateur</DialogTitle>
              <DialogDescription>Créer un nouveau compte utilisateur</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input
                  placeholder="Entrez le nom"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="Entrez l'email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input
                  type="tel"
                  placeholder="Entrez le téléphone"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Mot de passe</Label>
                <Input
                  type="password"
                  placeholder="Entrez le mot de passe"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Rôle</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin système</SelectItem>
                    <SelectItem value="cashier">Caissier</SelectItem>

                    <SelectItem value="manager">Gérant</SelectItem>
                    <SelectItem value="stock_manager">Gestionnaire de stock</SelectItem>
                    <SelectItem value="waiter">Serveur</SelectItem>
                    {/* <SelectItem value="investor">Investisseur</SelectItem> */}
                    {/* <SelectItem value="accountant">Comptable</SelectItem> */}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddUser(false)}>
                Annuler
              </Button>
              <Button onClick={handleAddUser}>Ajouter un utilisateur</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-muted-foreground">Utilisateur</TableHead>
                <TableHead className="text-muted-foreground">Email</TableHead>
                <TableHead className="text-muted-foreground">Rôle</TableHead>
                <TableHead className="text-muted-foreground">Téléphone</TableHead>
                <TableHead className="text-muted-foreground text-right w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Aucun utilisateur trouvé
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} className="border-border">
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge className={roleBadgeClass(user.role)}>
                        <Shield className="mr-1 h-3 w-3" />
                        {roleLabel(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.phone || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenEdit(user)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={showEditUser} onOpenChange={setShowEditUser}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'utilisateur</DialogTitle>
            <DialogDescription>Mettre à jour les informations de l'utilisateur ou modifier son mot de passe</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input value={editingUser.name} readOnly />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={editingUser.email} readOnly />
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input
                  value={editingUser.phone || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Rôle</Label>
                <Select
                  value={editingUser.role}
                  onValueChange={(value) => setEditingUser({ ...editingUser, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin système</SelectItem>
                    <SelectItem value="cashier_food">Caissier - Alimentation</SelectItem>
                    <SelectItem value="supervisor_food">Superviseur - Alimentation</SelectItem>
                    <SelectItem value="cashier_bakery">Caissier - Boulangerie</SelectItem>
                    <SelectItem value="supervisor_bakery">Superviseur - Boulangerie</SelectItem>
                    <SelectItem value="production_bakery">Responsable production</SelectItem>
                    <SelectItem value="manager">Gérant</SelectItem>
                    <SelectItem value="stock_manager">Gestionnaire de stock</SelectItem>
                    <SelectItem value="investor">Investisseur</SelectItem>
                    <SelectItem value="accountant">Comptable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nouveau mot de passe (laisser vide pour ne pas modifier)</Label>
                <Input
                  type="password"
                  placeholder="Entrez le nouveau mot de passe"
                  value={editingUser.password || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditUser(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdateUser}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
