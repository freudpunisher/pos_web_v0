"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSuppliers } from "@/hooks/use-suppliers"
import { SupplierFormDialog } from "@/components/inventory/supplier-form-dialog"
import { Building2, Phone, Mail, MapPin, Loader2, AlertCircle, Plus, PowerOff, Power, Edit } from "lucide-react"

export default function SuppliersPage() {
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null)

  const {
    suppliers,
    loading: suppliersLoading,
    error: suppliersError,
    createSupplier,
    updateSupplier,
    toggleSupplierStatus,
  } = useSuppliers()

  const handleAddSupplier = () => {
    setEditingSupplier(null)
    setIsSupplierDialogOpen(true)
  }

  const handleEditSupplier = (supplier: any) => {
    setEditingSupplier(supplier)
    setIsSupplierDialogOpen(true)
  }

  const handleSupplierSubmit = async (data: any) => {
    if (editingSupplier) {
      await updateSupplier(editingSupplier.id, data)
    } else {
      await createSupplier(data)
    }
  }

  const handleToggleStatus = async (supplier: any) => {
    await toggleSupplierStatus(supplier.id, !supplier.isActive)
  }

  if (suppliersLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Chargement des fournisseurs...</p>
        </div>
      </div>
    )
  }

  if (suppliersError) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Card className="max-w-md border-destructive/50 bg-destructive/5">
          <CardContent className="p-6 text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-destructive">Erreur de chargement</h3>
              <p className="text-sm text-muted-foreground">Impossible de charger les fournisseurs. Vérifiez la connexion ou contactez le support.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Fournisseurs</h2>
          <p className="text-muted-foreground">Gérer vos fournisseurs</p>
        </div>
        <Button onClick={handleAddSupplier} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Ajouter un fournisseur
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {suppliers.map((supplier) => (
          <Card
            key={supplier.id}
            className={`transition-all ${!supplier.isActive ? "opacity-60 grayscale" : "hover:shadow-md"}`}
          >
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        supplier.isActive ? "bg-primary/10" : "bg-muted"
                      }`}
                    >
                      <Building2 className={`h-6 w-6 ${supplier.isActive ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{supplier.name}</h3>
                      <p className="text-xs text-muted-foreground font-mono">ID: {supplier.id.slice(0, 8)}…</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" /> {supplier.email || "—"}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" /> {supplier.phone || "—"}
                    </div>
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 mt-0.5" /> {supplier.address || "—"}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <Badge
                    variant="outline"
                    className={`font-medium ${
                      supplier.isActive
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : "bg-gray-100 text-gray-600 border-gray-300"
                    }`}
                  >
                    {supplier.isActive ? "Actif" : "Inactif"}
                  </Badge>

                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEditSupplier(supplier)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleStatus(supplier)}
                      className={supplier.isActive ? "text-red-600" : "text-emerald-600"}
                    >
                      {supplier.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <SupplierFormDialog
        supplier={editingSupplier}
        open={isSupplierDialogOpen}
        onOpenChange={setIsSupplierDialogOpen}
        onSubmit={handleSupplierSubmit}
      />
    </div>
  )
}
