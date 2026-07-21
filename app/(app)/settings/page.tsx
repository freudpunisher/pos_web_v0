"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Store, Tag, Shield, Plus, Trash2, Save, Loader2, Search, Pencil, Ruler, MapPin, Layers, Building2 } from "lucide-react"
import { useSettings } from "@/hooks/use-settings"
import { useCategories } from "@/hooks/use-products"
import { useUnits } from "@/hooks/use-units"
import { useLocations } from "@/hooks/use-locations"
import { useCategoryGroups } from "@/hooks/use-category-groups"
import { cn } from "@/lib/utils"
import { UserManagement } from "@/components/user-management"
import { useSuppliers } from "@/hooks/use-suppliers"
import { SupplierFormDialog } from "@/components/inventory/supplier-form-dialog"
import Swal from "sweetalert2"

type Category = {
  id: string
  name: string
  description?: string
  groupId?: string | null
}

type CategoryGroup = {
  id: string
  name: string
  description?: string
}

type Unit = {
  id: string
  code: string
  name: string
  symbol?: string
}

const LOCATION_TYPES = ["principal", "transitional", "bar", "kitchen"] as const
type LocationType = typeof LOCATION_TYPES[number]

export default function SettingsPage() {
  const { settings, loading: settingsLoading, error: settingsError, refresh: refreshSettings, updateSettings } = useSettings()
  const { categories, loading: categoriesLoading, createCategory, updateCategory, deleteCategory } = useCategories()
  const { units, loading: unitsLoading, createUnit, updateUnit, deleteUnit } = useUnits()
  const { locations, loading: locationsLoading, createLocation, updateLocation, deleteLocation } = useLocations()
  const { groups: categoryGroups, loading: catGroupsLoading, createGroup, updateGroup, deleteGroup } = useCategoryGroups()
  const { suppliers, loading: suppliersLoading, createSupplier, updateSupplier, toggleSupplierStatus } = useSuppliers()

  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null)

  const [storeInfo, setStoreInfo] = useState<any>(null)
  const [newCategory, setNewCategory] = useState({ name: "", description: "", groupId: null as string | null })
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newUnit, setNewUnit] = useState({ code: "", name: "", symbol: "" })
  const [showAddUnit, setShowAddUnit] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [menuLoading, setMenuLoading] = useState(false)
  const [menuSaving, setMenuSaving] = useState(false)
  const [categorySearch, setCategorySearch] = useState("")
  const [unitSearch, setUnitSearch] = useState("")
  const [categoryPageSize, setCategoryPageSize] = useState(10)
  const [categoryPage, setCategoryPage] = useState(1)
  const [unitPageSize, setUnitPageSize] = useState(10)

  // Locations state
  const [locationSearch, setLocationSearch] = useState("")
  const [newLocation, setNewLocation] = useState({ name: "", type: "bar" as LocationType })
  const [showAddLocation, setShowAddLocation] = useState(false)
  const [editLocation, setEditLocation] = useState<any>(null)
  const [showEditLocation, setShowEditLocation] = useState(false)
  const [unitPage, setUnitPage] = useState(1)

  const handleUnitSearchChange = (value: string) => { setUnitSearch(value); setUnitPage(1) }

  const [editCategory, setEditCategory] = useState<any>(null)
  const [showEditCategory, setShowEditCategory] = useState(false)


  const [editUnit, setEditUnit] = useState<any>(null)
  const [showEditUnit, setShowEditUnit] = useState(false)

  const [newGroup, setNewGroup] = useState({ name: "", description: "" })
  const [showAddGroup, setShowAddGroup] = useState(false)
  const [editGroup, setEditGroup] = useState<any>(null)
  const [showEditGroup, setShowEditGroup] = useState(false)
  const [categoryGroupFilter, setCategoryGroupFilter] = useState<string>("all")
  const handleStartEditUnit = (unit: any) => {
    setEditUnit(unit)
    setShowEditUnit(true)
  }
  const handleUpdateUnit = async () => {
    if (!editUnit?.code?.trim() || !editUnit?.name?.trim()) return
    try {
      await updateUnit(editUnit.id, {
        code: editUnit.code,
        name: editUnit.name,
        symbol: editUnit.symbol,
      })
      setShowEditUnit(false)
      setEditUnit(null)
      await Swal.fire({
        icon: "success",
        title: "Unité mise à jour",
        timer: 1500,
        showConfirmButton: false,
      })
    } catch {
      await Swal.fire({ icon: "error", title: "Échec de la mise à jour de l'unité" })
    }
  }

  

  useEffect(() => {
    if (settings) {
      setStoreInfo({ ...settings })
    }
  }, [settings])

  const handleSaveStore = async () => {
    setIsSaving(true)
    try {
      await updateSettings(storeInfo)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddCategory = async () => {
    if (newCategory.name.trim()) {
      try {
        await createCategory(newCategory)
        setNewCategory({ name: "", description: "", groupId: null })
        setShowAddCategory(false)
        await Swal.fire({
          icon: "success",
          title: "Catégorie ajoutée",
          timer: 1500,
          showConfirmButton: false,
        })
      } catch {
        await Swal.fire({
          icon: "error",
          title: "Échec de l'ajout de la catégorie",
        })
      }
    }
  }

  const filteredCategories = categories.filter((category) => {
    const searchValue = categorySearch.trim().toLowerCase()
    if (!searchValue && categoryGroupFilter === "all") return true
    if (searchValue) {
      const name = category.name?.toLowerCase() ?? ""
      const description = category.description?.toLowerCase() ?? ""
      if (!name.includes(searchValue) && !description.includes(searchValue)) return false
    }
    if (categoryGroupFilter !== "all" && category.groupId !== categoryGroupFilter) return false
    return true
  })
  const categoryTotalPages = Math.max(1, Math.ceil(filteredCategories.length / categoryPageSize))
  const categoryCurrentPage = Math.min(categoryPage, categoryTotalPages)
  const paginatedCategories = filteredCategories.slice(
    (categoryCurrentPage - 1) * categoryPageSize,
    categoryCurrentPage * categoryPageSize,
  )

  const handleCategorySearchChange = (value: string) => {
    setCategorySearch(value)
    setCategoryPage(1)
  }

  const handleCategoryPageSizeChange = (value: string) => {
    const nextSize = Number(value)
    setCategoryPageSize(nextSize)
    setCategoryPage(1)
  }

  const handleStartEditCategory = (category: any) => {
    setEditCategory({
      id: category.id,
      name: category.name ?? "",
      description: category.description ?? "",
      groupId: category.groupId ?? null,
    })
    setShowEditCategory(true)
  }

  const handleUpdateCategory = async () => {
    if (!editCategory) return
    if (editCategory.name.trim()) {
      try {
        await updateCategory(editCategory.id, {
          name: editCategory.name,
          description: editCategory.description,
          groupId: editCategory.groupId,
        })
        setShowEditCategory(false)
        setEditCategory(null)
        await Swal.fire({
          icon: "success",
          title: "Catégorie mise à jour",
          timer: 1500,
          showConfirmButton: false,
        })
      } catch {
        await Swal.fire({
          icon: "error",
          title: "Échec de la mise à jour de la catégorie",
        })
      }
    }
  }

  const handleAddGroup = async () => {
    if (newGroup.name.trim()) {
      try {
        await createGroup(newGroup)
        setNewGroup({ name: "", description: "" })
        setShowAddGroup(false)
        await Swal.fire({ icon: "success", title: "Groupe ajouté", timer: 1500, showConfirmButton: false })
      } catch {
        await Swal.fire({ icon: "error", title: "Échec de l'ajout du groupe" })
      }
    }
  }

  const handleStartEditGroup = (group: any) => {
    setEditGroup({ id: group.id, name: group.name ?? "", description: group.description ?? "" })
    setShowEditGroup(true)
  }

  const handleUpdateGroup = async () => {
    if (!editGroup) return
    if (editGroup.name.trim()) {
      try {
        await updateGroup(editGroup.id, { name: editGroup.name, description: editGroup.description })
        setShowEditGroup(false)
        setEditGroup(null)
        await Swal.fire({ icon: "success", title: "Groupe mis à jour", timer: 1500, showConfirmButton: false })
      } catch {
        await Swal.fire({ icon: "error", title: "Échec de la mise à jour du groupe" })
      }
    }
  }

  const filteredUnits = units.filter((unit) => {
    const searchValue = unitSearch.trim().toLowerCase()
    if (!searchValue) return true
    const name = unit.name?.toLowerCase() ?? ""
    const code = unit.code?.toLowerCase() ?? ""
    const symbol = unit.symbol?.toLowerCase() ?? ""
    return name.includes(searchValue) || code.includes(searchValue) || symbol.includes(searchValue)
  })
  const unitTotalPages = Math.max(1, Math.ceil(filteredUnits.length / unitPageSize))
  const unitCurrentPage = Math.min(unitPage, unitTotalPages)
  const paginatedUnits = filteredUnits.slice(
    (unitCurrentPage - 1) * unitPageSize,
    unitCurrentPage * unitPageSize,
  )

  const handleUnitPageSizeChange = (value: string) => {
    const nextSize = Number(value)
    setUnitPageSize(nextSize)
    setUnitPage(1)
  }

  // ----- Location handlers -----
  const handleAddLocation = async () => {
    if (!newLocation.name.trim()) return
    try {
      await createLocation(newLocation)
      setNewLocation({ name: "", type: "bar" })
      setShowAddLocation(false)
      await Swal.fire({ icon: "success", title: "Emplacement ajouté", timer: 1500, showConfirmButton: false })
    } catch {
      await Swal.fire({ icon: "error", title: "Échec de l'ajout de l'emplacement" })
    }
  }

  const handleUpdateLocation = async () => {
    if (!editLocation?.name?.trim()) return
    try {
      await updateLocation(editLocation.id, {
        name: editLocation.name,
        type: editLocation.type,
        isActive: editLocation.isActive,
      })
      setShowEditLocation(false)
      setEditLocation(null)
      await Swal.fire({ icon: "success", title: "Emplacement mis à jour", timer: 1500, showConfirmButton: false })
    } catch {
      await Swal.fire({ icon: "error", title: "Échec de la mise à jour de l'emplacement" })
    }
  }

  const filteredLocations = locations.filter((loc) => {
    const s = locationSearch.trim().toLowerCase()
    if (!s) return true
    return loc.name?.toLowerCase().includes(s) || loc.type?.toLowerCase().includes(s)
  })

  // ----- / Location handlers -----

  const handleAddUnit = async () => {
    if (newUnit.code.trim() && newUnit.name.trim()) {
      try {
        await createUnit(newUnit)
        setNewUnit({ code: "", name: "", symbol: "" })
        setShowAddUnit(false)
        await Swal.fire({
          icon: "success",
          title: "Unité ajoutée",
          timer: 1500,
          showConfirmButton: false,
        })
      } catch {
        await Swal.fire({
          icon: "error",
          title: "Échec de l'ajout de l'unité",
        })
      }
    }
  }

  const fetchMenuItems = async () => {
    setMenuLoading(true)
    try {
      const res = await fetch("/api/menus")
      if (res.ok) {
        const data = await res.json()
        setMenuItems(data)
      }
    } catch {} finally {
      setMenuLoading(false)
    }
  }

  const toggleMenuRole = (menuId: string, role: string) => {
    setMenuItems(prev => prev.map(m => {
      if (m.id !== menuId) return m
      const roles = m.roles || []
      const idx = roles.indexOf(role)
      if (idx >= 0) {
        return { ...m, roles: roles.filter((r: string) => r !== role) }
      }
      return { ...m, roles: [...roles, role] }
    }))
  }

  const saveMenuPermissions = async () => {
    setMenuSaving(true)
    try {
      await fetch("/api/menus", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: menuItems.map(m => ({ id: m.id, roles: m.roles }))
        }),
      })
    } finally {
      setMenuSaving(false)
    }
  }

  useEffect(() => { fetchMenuItems() }, [])

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Chargement des paramètres...</span>
      </div>
    )
  }

  if (settingsError) {
    return (
      <div className="mx-auto max-w-2xl p-12">
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center">
          <p className="text-lg font-semibold text-destructive">Impossible de charger les paramètres</p>
          <p className="mt-3 text-sm text-muted-foreground">{settingsError}</p>
          <Button className="mt-6" onClick={refreshSettings}>
            Réessayer
          </Button>
        </div>
      </div>
    )
  }

  if (!storeInfo) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Chargement des paramètres...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 rounded-lg bg-gradient-to-r from-primary/5 via-primary/10 to-transparent p-6 border border-primary/10">
        <h2 className="text-2xl font-bold text-foreground">Paramètres</h2>
        <p className="text-muted-foreground">Gérez la configuration de votre magasin</p>
      </div>

      <Tabs defaultValue="store">
        <TabsList className="grid w-full grid-cols-8 lg:w-auto lg:inline-grid">
          <TabsTrigger value="store">Infos boutique</TabsTrigger>
          <TabsTrigger value="categories">Catégories</TabsTrigger>
          <TabsTrigger value="category-groups">Groupes</TabsTrigger>
          <TabsTrigger value="units">Unités</TabsTrigger>
          <TabsTrigger value="suppliers">Fournisseurs</TabsTrigger>
          <TabsTrigger value="locations">Emplacements</TabsTrigger>
          <TabsTrigger value="menus">Permissions des menus</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs & Rôles</TabsTrigger>
        </TabsList>

        {/* Store Information */}
        <TabsContent value="store" className="mt-4">
          <Card className="border-border/60 bg-card shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="border-b border-border/40">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Store className="h-5 w-5 text-primary" />
                Informations de la boutique
              </CardTitle>
              <CardDescription>Mettez à jour les détails de votre boutique</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="storeName">Nom du magasin</Label>
                  <Input
                    id="storeName"
                    value={storeInfo.name}
                    onChange={(e) => setStoreInfo({ ...storeInfo, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={storeInfo.phone}
                    onChange={(e) => setStoreInfo({ ...storeInfo, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={storeInfo.email}
                    onChange={(e) => setStoreInfo({ ...storeInfo, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Devise</Label>
                  <Select
                    value={storeInfo.currency}
                    onValueChange={(value) => {
                      const symbolMap: Record<string, string> = {
                        USD: "$",
                        EUR: "€",
                        GBP: "£",
                        Fbu: "Fbu ",
                      }
                      setStoreInfo({ ...storeInfo, currency: value, currencySymbol: symbolMap[value] || value })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="Fbu">Fbu (Fbu)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  value={storeInfo.address}
                  onChange={(e) => setStoreInfo({ ...storeInfo, address: e.target.value })}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Taux de taxe par défaut (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    step="0.1"
                    value={storeInfo.taxRate}
                    onChange={(e) => setStoreInfo({ ...storeInfo, taxRate: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="rcNumber">Numéro RC (Registre de Commerce)</Label>
                  <Input
                    id="rcNumber"
                    value={storeInfo.rcNumber || ""}
                    onChange={(e) => setStoreInfo({ ...storeInfo, rcNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nifNumber">Numéro NIF (Identification Fiscale)</Label>
                  <Input
                    id="nifNumber"
                    value={storeInfo.nifNumber || ""}
                    onChange={(e) => setStoreInfo({ ...storeInfo, nifNumber: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end border-t border-border/40 pt-4">
                <Button onClick={handleSaveStore} disabled={isSaving} size="lg" className="min-w-[200px]">
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Enregistrer les modifications
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories */}
        <TabsContent value="categories" className="mt-4">
          <Card className="border-border/60 bg-card shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-col gap-4 border-b border-border/40 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Tag className="h-5 w-5 text-primary" />
                  Catégories de produits
                </CardTitle>
                <CardDescription>Gérer les catégories de produits</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-48">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    value={categorySearch}
                    onChange={(e) => handleCategorySearchChange(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={categoryGroupFilter} onValueChange={(v) => { setCategoryGroupFilter(v); setCategoryPage(1) }}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Tous les groupes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les groupes</SelectItem>
                    {categoryGroups.map((g: any) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={String(categoryPageSize)} onValueChange={handleCategoryPageSizeChange}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Lignes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 lignes</SelectItem>
                    <SelectItem value="20">20 rows</SelectItem>
                    <SelectItem value="50">50 rows</SelectItem>
                  </SelectContent>
                </Select>
                <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Ajouter une catégorie
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ajouter une catégorie</DialogTitle>
                      <DialogDescription>Créer une nouvelle catégorie de produit</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Nom de la catégorie</Label>
                        <Input
                          placeholder="Saisir le nom de la catégorie"
                          value={newCategory.name}
                          onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input
                          placeholder="Saisir la description"
                          value={newCategory.description}
                          onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Groupe</Label>
                        <Select
                          value={newCategory.groupId ?? "none"}
                          onValueChange={(v) => setNewCategory({ ...newCategory, groupId: v === "none" ? null : v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Aucun groupe" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Aucun groupe</SelectItem>
                            {categoryGroups.map((g: any) => (
                              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddCategory(false)}>
                        Annuler
                      </Button>
                      <Button onClick={handleAddCategory}>Ajouter une catégorie</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-md border border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border/60 bg-muted/30">
                      <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">ID</TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">Nom</TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">Groupe</TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">Description</TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider w-24 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoriesLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                        </TableCell>
                      </TableRow>
                    ) : paginatedCategories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          Aucune catégorie trouvée
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedCategories.map((category) => (
                        <TableRow key={category.id} className="border-border/60 hover:bg-muted/20 transition-colors">
                          <TableCell className="font-mono text-xs text-muted-foreground/60 overflow-hidden text-ellipsis block max-w-[100px]">{category.id}</TableCell>
                          <TableCell className="font-medium">{category.name}</TableCell>
                          <TableCell className="text-muted-foreground">{categoryGroups.find((g: any) => g.id === category.groupId)?.name || "-"}</TableCell>
                          <TableCell className="text-muted-foreground">{category.description || "-"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                title="Modifier la catégorie"
                                aria-label="Modifier la catégorie"
                                onClick={() => handleStartEditCategory(category)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex flex-col gap-3 border-t border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between bg-muted/10">
                <div className="text-sm text-muted-foreground">
                  Affichage de {(categoryCurrentPage - 1) * categoryPageSize + 1}-
                  {Math.min(categoryCurrentPage * categoryPageSize, filteredCategories.length)} sur {filteredCategories.length}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => setCategoryPage((p) => Math.max(1, p - 1))}
                    disabled={categoryCurrentPage === 1}
                  >
                    Précédent
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    Page {categoryCurrentPage} sur {categoryTotalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => setCategoryPage((p) => Math.min(categoryTotalPages, p + 1))}
                    disabled={categoryCurrentPage === categoryTotalPages}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <Dialog
            open={showEditCategory}
            onOpenChange={(open) => {
              setShowEditCategory(open)
              if (!open) setEditCategory(null)
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Modifier la catégorie</DialogTitle>
                <DialogDescription>Mettre à jour les détails de la catégorie</DialogDescription>
              </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nom</Label>
                    <Input
                      placeholder="ex. Boulangerie"
                      value={editCategory?.name ?? ""}
                      onChange={(e) =>
                        setEditCategory((prev: any) => (prev ? { ...prev, name: e.target.value } : prev))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description (optionnelle)</Label>
                    <Input
                      placeholder="Description de la catégorie"
                      value={editCategory?.description ?? ""}
                      onChange={(e) =>
                        setEditCategory((prev: any) => (prev ? { ...prev, description: e.target.value } : prev))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Groupe</Label>
                    <Select
                      value={editCategory?.groupId ?? "none"}
                      onValueChange={(v) =>
                        setEditCategory((prev: any) => (prev ? { ...prev, groupId: v === "none" ? null : v } : prev))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Aucun groupe" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun groupe</SelectItem>
                        {categoryGroups.map((g: any) => (
                          <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditCategory(false)}>
                  Annuler
                </Button>
                <Button onClick={handleUpdateCategory}>Enregistrer les modifications</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Category Groups */}
        <TabsContent value="category-groups" className="mt-4">
          <Card className="border-border/60 bg-card shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-col gap-4 border-b border-border/40 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Layers className="h-5 w-5 text-primary" />
                  Groupes de catégories
                </CardTitle>
                <CardDescription>Organiser les catégories en groupes</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Dialog open={showAddGroup} onOpenChange={setShowAddGroup}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Ajouter un groupe
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ajouter un groupe de catégories</DialogTitle>
                      <DialogDescription>Créer un nouveau groupe de catégories</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Nom du groupe</Label>
                        <Input
                          placeholder="Saisir le nom du groupe"
                          value={newGroup.name}
                          onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input
                          placeholder="Saisir la description"
                          value={newGroup.description}
                          onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddGroup(false)}>Annuler</Button>
                      <Button onClick={handleAddGroup}>Ajouter un groupe</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-md border border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border/60 bg-muted/30">
                      <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">ID</TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">Nom</TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">Description</TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider w-24 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {catGroupsLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                        </TableCell>
                      </TableRow>
                    ) : categoryGroups.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                          Aucun groupe trouvé
                        </TableCell>
                      </TableRow>
                    ) : (
                      categoryGroups.map((group: any) => (
                        <TableRow key={group.id} className="border-border/60 hover:bg-muted/20 transition-colors">
                          <TableCell className="font-mono text-xs text-muted-foreground/60 overflow-hidden text-ellipsis block max-w-[100px]">{group.id}</TableCell>
                          <TableCell className="font-medium">{group.name}</TableCell>
                          <TableCell className="text-muted-foreground">{group.description || "-"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                title="Modifier le groupe"
                                aria-label="Modifier le groupe"
                                onClick={() => handleStartEditGroup(group)}
                              >
                                <Pencil className="h-4 w-4" />
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
          </Card>
          <Dialog
            open={showEditGroup}
            onOpenChange={(open) => {
              setShowEditGroup(open)
              if (!open) setEditGroup(null)
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Modifier le groupe de catégories</DialogTitle>
                <DialogDescription>Mettre à jour les détails du groupe</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input
                    placeholder="Nom du groupe"
                    value={editGroup?.name ?? ""}
                    onChange={(e) => setEditGroup((prev: any) => (prev ? { ...prev, name: e.target.value } : prev))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="Description du groupe"
                    value={editGroup?.description ?? ""}
                    onChange={(e) => setEditGroup((prev: any) => (prev ? { ...prev, description: e.target.value } : prev))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditGroup(false)}>Annuler</Button>
                <Button onClick={handleUpdateGroup}>Enregistrer les modifications</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Units */}
        <TabsContent value="units" className="mt-4">
          <Card className="border-border/60 bg-card shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-col gap-4 border-b border-border/40 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Ruler className="h-5 w-5 text-primary" />
                  Unités de mesure
                </CardTitle>
                <CardDescription>Gérer les unités de mesure pour les produits</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher des unités..."
                    value={unitSearch}
                    onChange={(e) => handleUnitSearchChange(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={String(unitPageSize)} onValueChange={handleUnitPageSizeChange}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Lignes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 lignes</SelectItem>
                    <SelectItem value="20">20 lignes</SelectItem>
                    <SelectItem value="50">50 lignes</SelectItem>
                  </SelectContent>
                </Select>
                <Dialog open={showAddUnit} onOpenChange={setShowAddUnit}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Ajouter une unité
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ajouter une unité</DialogTitle>
                      <DialogDescription>Créer une nouvelle unité de mesure</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Code</Label>
                        <Input
                          placeholder="ex. kg"
                          value={newUnit.code}
                          onChange={(e) => setNewUnit({ ...newUnit, code: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Nom</Label>
                        <Input
                          placeholder="ex. Kilogramme"
                          value={newUnit.name}
                          onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Symbole (optionnel)</Label>
                        <Input
                          placeholder="ex. kg"
                          value={newUnit.symbol}
                          onChange={(e) => setNewUnit({ ...newUnit, symbol: e.target.value })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddUnit(false)}>
                        Annuler
                      </Button>
                      <Button onClick={handleAddUnit}>Ajouter une unité</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-md border border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border/60 bg-muted/30">
                      <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">Code</TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">Nom</TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">Symbole</TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider w-24 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unitsLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                        </TableCell>
                      </TableRow>
                    ) : paginatedUnits.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                          Aucune unité trouvée
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedUnits.map((unit) => (
                        <TableRow key={unit.id} className="border-border/60 hover:bg-muted/20 transition-colors">
                          <TableCell className="font-mono">{unit.code}</TableCell>
                          <TableCell className="font-medium">{unit.name}</TableCell>
                          <TableCell className="text-muted-foreground">{unit.symbol || "-"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                title="Modifier l'unité"
                                onClick={() => handleStartEditUnit(unit)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex flex-col gap-3 border-t border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between bg-muted/10">
                <div className="text-sm text-muted-foreground">
                  Affichage de {(unitCurrentPage - 1) * unitPageSize + 1}-
                  {Math.min(unitCurrentPage * unitPageSize, filteredUnits.length)} sur {filteredUnits.length}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => setUnitPage((p) => Math.max(1, p - 1))}
                    disabled={unitCurrentPage === 1}
                  >
                    Précédent
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    Page {unitCurrentPage} sur {unitTotalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => setUnitPage((p) => Math.min(unitTotalPages, p + 1))}
                    disabled={unitCurrentPage === unitTotalPages}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <Dialog
            open={showEditUnit}
            onOpenChange={(open) => {
              setShowEditUnit(open)
              if (!open) setEditUnit(null)
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Modifier l'unité</DialogTitle>
                <DialogDescription>Mettre à jour les détails de l'unité de mesure</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Code</Label>
                  <Input
                    placeholder="ex. kg"
                    value={editUnit?.code ?? ""}
                    onChange={(e) =>
                      setEditUnit((prev: any) => (prev ? { ...prev, code: e.target.value } : prev))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input
                    placeholder="ex. Kilogramme"
                    value={editUnit?.name ?? ""}
                    onChange={(e) =>
                      setEditUnit((prev: any) => (prev ? { ...prev, name: e.target.value } : prev))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Symbole (optionnel)</Label>
                  <Input
                    placeholder="ex. kg"
                    value={editUnit?.symbol ?? ""}
                    onChange={(e) =>
                      setEditUnit((prev: any) => (prev ? { ...prev, symbol: e.target.value } : prev))
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditUnit(false)}>
                  Annuler
                </Button>
                <Button onClick={handleUpdateUnit}>Enregistrer les modifications</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Menu Permissions */}
        <TabsContent value="menus" className="mt-4">
          <Card className="border-border/60 bg-card shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="border-b border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Shield className="h-5 w-5 text-primary" />
                    Permissions des menus
                  </CardTitle>
                  <CardDescription>Contrôlez quels rôles peuvent voir chaque élément de menu</CardDescription>
                </div>
                <Button
                  onClick={saveMenuPermissions}
                  disabled={menuSaving}
                  className="gap-2"
                >
                  {menuSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Enregistrer les modifications
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-md border border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border/60 bg-muted/30">
                      <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">Élément de menu</TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">Admin</TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">Manager</TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">Gestionnaire de stock</TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">Caissier</TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">Serveur</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {menuLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                        </TableCell>
                      </TableRow>
                    ) : menuItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          Aucun élément de menu trouvé
                        </TableCell>
                      </TableRow>
                    ) : (
                      menuItems.map((item) => {
                        const roles: string[] = item.roles || []
                        return (
                          <TableRow key={item.id} className="border-border/60 hover:bg-muted/20 transition-colors">
                            <TableCell className="font-medium">{item.label}</TableCell>
                            {["admin", "manager", "stock_manager", "cashier", "waiter"].map((role) => (
                              <TableCell key={role}>
                                <Button
                                  variant={roles.includes(role) ? "default" : "outline"}
                                  size="sm"
                                  className={cn(
                                    "h-7 w-7 p-0",
                                    roles.includes(role)
                                      ? "bg-primary text-primary-foreground shadow-sm"
                                      : "text-muted-foreground border-border/60"
                                  )}
                                  onClick={() => toggleMenuRole(item.id, role)}
                                >
                                  {roles.includes(role) ? "✓" : "—"}
                                </Button>
                              </TableCell>
                            ))}
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suppliers (Fournisseurs) */}
        <TabsContent value="suppliers" className="mt-4">
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Fournisseurs
                </CardTitle>
                <CardDescription>Gérer les fournisseurs</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => { setEditingSupplier(null); setIsSupplierDialogOpen(true) }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un fournisseur
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border">
                      <TableHead className="text-muted-foreground">Nom</TableHead>
                      <TableHead className="text-muted-foreground">Email</TableHead>
                      <TableHead className="text-muted-foreground">Téléphone</TableHead>
                      <TableHead className="text-muted-foreground">Adresse</TableHead>
                      <TableHead className="text-muted-foreground">Statut</TableHead>
                      <TableHead className="text-muted-foreground w-24 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliersLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                        </TableCell>
                      </TableRow>
                    ) : suppliers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          Aucun fournisseur trouvé
                        </TableCell>
                      </TableRow>
                    ) : (
                      suppliers.map((supplier) => (
                        <TableRow key={supplier.id} className="border-border">
                          <TableCell className="font-medium">{supplier.name}</TableCell>
                          <TableCell className="text-muted-foreground">{supplier.email}</TableCell>
                          <TableCell className="text-muted-foreground">{supplier.phone}</TableCell>
                          <TableCell className="text-muted-foreground">{supplier.address}</TableCell>
                          <TableCell>
                            <span className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                              supplier.isActive
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-muted text-muted-foreground"
                            )}>
                              {supplier.isActive ? "Actif" : "Inactif"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost" size="icon"
                                className="h-8 w-8 text-muted-foreground"
                                title="Modifier"
                                onClick={() => { setEditingSupplier(supplier); setIsSupplierDialogOpen(true) }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost" size="icon"
                                className="h-8 w-8"
                                title={supplier.isActive ? "Désactiver" : "Activer"}
                                onClick={() => toggleSupplierStatus(supplier.id, !supplier.isActive)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
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
          </Card>
          <SupplierFormDialog
            supplier={editingSupplier}
            open={isSupplierDialogOpen}
            onOpenChange={setIsSupplierDialogOpen}
            onSubmit={async (data) => {
              if (editingSupplier) {
                await updateSupplier(editingSupplier.id, data)
              } else {
                await createSupplier(data)
              }
            }}
          />
        </TabsContent>

        {/* Locations */}
        <TabsContent value="locations" className="mt-4">
          <Card className="border-border/60 bg-card shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-col gap-4 border-b border-border/40 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5 text-primary" />
                  Emplacements
                </CardTitle>
                <CardDescription>Gérer les entrepôts, bars, cuisines et points de transit</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-56">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher des emplacements..."
                    value={locationSearch}
                    onChange={(e) => { setLocationSearch(e.target.value) }}
                    className="pl-10"
                  />
                </div>
                <Dialog open={showAddLocation} onOpenChange={setShowAddLocation}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Ajouter un emplacement
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ajouter un emplacement</DialogTitle>
                      <DialogDescription>Créer un nouvel emplacement de stock</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Nom</Label>
                        <Input
                          placeholder="ex. Entrepôt principal"
                          value={newLocation.name}
                          onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select
                          value={newLocation.type}
                          onValueChange={(v) => setNewLocation({ ...newLocation, type: v as LocationType })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {LOCATION_TYPES.map((t) => (
                              <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddLocation(false)}>Annuler</Button>
                      <Button onClick={handleAddLocation} disabled={!newLocation.name.trim()}>Ajouter un emplacement</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-md border border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border/60 bg-muted/30">
                      <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">Nom</TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">Type</TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">Statut</TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wider w-24 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locationsLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                        </TableCell>
                      </TableRow>
                    ) : filteredLocations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                          Aucun emplacement trouvé
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLocations.map((loc) => (
                        <TableRow key={loc.id} className="border-border/60 hover:bg-muted/20 transition-colors">
                          <TableCell className="font-medium">{loc.name}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize bg-primary/10 text-primary">
                              {loc.type}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                              loc.isActive
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-muted text-muted-foreground"
                            )}>
                              {loc.isActive ? "Actif" : "Inactif"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost" size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                title="Modifier l'emplacement"
                                onClick={() => { setEditLocation({ ...loc }); setShowEditLocation(true) }}
                              >
                                <Pencil className="h-4 w-4" />
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
          </Card>

          {/* Edit Location Dialog */}
          <Dialog open={showEditLocation} onOpenChange={(open) => { setShowEditLocation(open); if (!open) setEditLocation(null) }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Modifier l'emplacement</DialogTitle>
                <DialogDescription>Mettre à jour les détails de l'emplacement</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input
                    placeholder="ex. Entrepôt principal"
                    value={editLocation?.name ?? ""}
                    onChange={(e) => setEditLocation((prev: any) => prev ? { ...prev, name: e.target.value } : prev)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={editLocation?.type ?? "bar"}
                    onValueChange={(v) => setEditLocation((prev: any) => prev ? { ...prev, type: v } : prev)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LOCATION_TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3">
                  <Label>Actif</Label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={editLocation?.isActive ?? true}
                    onClick={() => setEditLocation((prev: any) => prev ? { ...prev, isActive: !prev.isActive } : prev)}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                      editLocation?.isActive ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <span className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                      editLocation?.isActive ? "translate-x-6" : "translate-x-1"
                    )} />
                  </button>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditLocation(false)}>Annuler</Button>
                <Button onClick={handleUpdateLocation}>Enregistrer les modifications</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Users & Roles */}
        <TabsContent value="users" className="mt-4">
          <UserManagement />
        </TabsContent>

      </Tabs>
    </div>
  )
}
