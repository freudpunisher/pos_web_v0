"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Package, AlertCircle, TrendingDown } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useUnits } from "@/hooks/use-units"
import { useCategories } from "@/hooks/use-products"
import { useSettings } from "@/hooks/use-settings"

export default function RawMaterialsPage() {
    const router = useRouter()
    const { settings } = useSettings()
    const [materials, setMaterials] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const { categories, loading: categoriesLoading } = useCategories()
    const { units, loading: unitsLoading } = useUnits()

    const currencySymbol = settings?.currencySymbol || "Fbu"

    const unitLabel = (code: string) => {
        const unit = units.find((u) => u.code === code)
        if (!unit) return code
        return `${unit.name} (${unit.symbol || unit.code})`
    }

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        cost: "",
        minStock: "10",
        unit: "unit",
        categoryId: "",
    })

    useEffect(() => {
        fetchMaterials()
    }, [search])

    const fetchMaterials = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (search) params.append("search", search)

            const res = await fetch(`/api/raw-materials?${params.toString()}`)
            const data = await res.json()
            if (res.ok) {
                setMaterials(data)
            } else {
                toast.error("Failed to load materials")
            }
        } catch (error) {
            toast.error("Network error")
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async () => {
        if (!formData.name.trim() || !formData.cost || !formData.categoryId) {
            toast.error("Nom, coût et catégorie sont requis.")
            return
        }
        try {
            const res = await fetch("/api/raw-materials", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            })

            if (res.ok) {
                toast.success("Raw material created")
                setIsCreateOpen(false)
                fetchMaterials()
                setFormData({ name: "", cost: "", minStock: "10", unit: "unit", categoryId: "" })
            } else {
                const err = await res.json()
                toast.error(err.error || "Failed to create")
            }
        } catch (error) {
            toast.error("Failed to create")
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Approvisionnement</h1>
                    <p className="text-muted-foreground">
                        Gérez vos matières premières et stocks pour la boulangerie.
                    </p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Nouvelle Matière
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Ajouter une Matière Première</DialogTitle>
                            <DialogDescription>
                                Créez une nouvelle référence de matière première (ex: Farine, Sucre).
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nom</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="ex: Farine de Blé T55"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="cost">Coût Unitaire</Label>
                                    <Input
                                        id="cost"
                                        type="number"
                                        value={formData.cost}
                                        onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="unit">Unité</Label>
                                    <Select
                                        value={formData.unit}
                                        onValueChange={(val) => setFormData({ ...formData, unit: val })}
                                    >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                            {units.length === 0 ? (
                                                <>
                                                    <SelectItem value="kg">Kilogramme (kg)</SelectItem>
                                                    <SelectItem value="g">Gramme (g)</SelectItem>
                                                    <SelectItem value="l">Litre (L)</SelectItem>
                                                    <SelectItem value="ml">Millilitre (ml)</SelectItem>
                                                    <SelectItem value="unit">Unité</SelectItem>
                                                </>
                                            ) : (
                                                units.map((unit) => (
                                                    <SelectItem key={unit.id} value={unit.code}>
                                                        {unit.name} ({unit.symbol || unit.code})
                                                    </SelectItem>
                                                ))
                                            )}
                                    </SelectContent>
                                </Select>
                                {unitsLoading && <span className="text-xs text-muted-foreground">Chargement des unités...</span>}
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="category">Catégorie</Label>
                                <Select
                                    value={formData.categoryId}
                                    onValueChange={(val) => setFormData({ ...formData, categoryId: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={categoriesLoading ? "Chargement..." : "Choisir une catégorie"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((cat: any) => (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="minStock">Stock Minimum (Alerte)</Label>
                                <Input
                                    id="minStock"
                                    type="number"
                                    value={formData.minStock}
                                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                                />
                            </div>
        </div>
        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
                            <Button
                                type="button"
                                onClick={handleCreate}
                                disabled={!formData.name.trim() || !formData.cost || !formData.categoryId}
                            >
                                Créer
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Référence Totales</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{materials.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Valeur Stock</CardTitle>
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {materials.reduce((acc, m) => acc + (Number(m.cost) * Number(m.stock)), 0).toLocaleString()} {currencySymbol}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Alertes Stock</CardTitle>
                        <AlertCircle className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">
                            {materials.filter(m => m.stock <= m.minStock).length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher une matière..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>SKU</TableHead>
                            <TableHead>Nom</TableHead>
                            <TableHead>Unité</TableHead>
                            <TableHead className="text-right">Coût</TableHead>
                            <TableHead className="text-right">Stock</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement...</TableCell>
                            </TableRow>
                        ) : materials.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucune matière première trouvée</TableCell>
                            </TableRow>
                        ) : (
                            materials.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell><Badge variant="outline">{unitLabel(item.unit)}</Badge></TableCell>
                                    <TableCell className="text-right">{Number(item.cost).toLocaleString()} {currencySymbol}</TableCell>
                                    <TableCell className="text-right">
                                        <span className={Number(item.stock) <= item.minStock ? "text-destructive font-bold" : ""}>
                                            {Number(item.stock)}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm">Gérer</Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
