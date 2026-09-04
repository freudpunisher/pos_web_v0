"use client"

import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useUnits } from "@/hooks/use-units"
import { useProductTypes } from "@/hooks/use-product-types"
import { useSubcategories } from "@/hooks/use-subcategories"
import { Loader2, Plus, Trash2, Save } from "lucide-react"
import Swal from "sweetalert2"
import { toast } from "sonner"

interface ProductFormDialogProps {
    product?: any
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (data: any) => Promise<void>
}

interface SellingUnitForm {
    name: string
    unitId: string
    price: string
    conversionFactor: string
}

export function ProductFormDialog({ product, open, onOpenChange, onSubmit }: ProductFormDialogProps) {
    const { units, loading: unitsLoading } = useUnits()
    const { activeTypes, loading: typesLoading } = useProductTypes()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        productTypeId: "",
        subcategoryId: "",
        price: "",
        minStock: "10",
    })
    const { activeSubcategories, loading: subcatsLoading } = useSubcategories(formData.productTypeId || null)
    const [sellingUnits, setSellingUnits] = useState<SellingUnitForm[]>([])

    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name || "",
                productTypeId: product.productTypeId || "",
                subcategoryId: product.subcategoryId || "",
                price: product.price?.toString() || "",
                minStock: product.minStock?.toString() || "10",
            })
            if (product.sellingUnits && product.sellingUnits.length > 0) {
                setSellingUnits(
                    product.sellingUnits.map((su: any) => ({
                        name: su.name || "",
                        unitId: su.unitId || "",
                        price: su.price?.toString() || "",
                        conversionFactor: su.conversionFactor?.toString() || "1",
                    }))
                )
            } else {
                setSellingUnits([])
            }
        } else {
            setFormData({
                name: "",
                productTypeId: "",
                subcategoryId: "",
                price: "",
                minStock: "10",
            })
            setSellingUnits([])
        }
    }, [product, open])

    const addSellingUnit = () => {
        setSellingUnits([...sellingUnits, { name: "", unitId: "", price: "", conversionFactor: "1" }])
    }

    const removeSellingUnit = (index: number) => {
        setSellingUnits(sellingUnits.filter((_, i) => i !== index))
    }

    const updateSellingUnit = (index: number, field: keyof SellingUnitForm, value: string) => {
        const updated = [...sellingUnits]
        updated[index] = { ...updated[index], [field]: value }
        setSellingUnits(updated)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const data: any = {
                name: formData.name,
                productTypeId: formData.productTypeId || null,
                subcategoryId: formData.subcategoryId || null,
                price: parseFloat(formData.price) || 0,
                minStock: parseInt(formData.minStock) || 10,
            }

            const validSellingUnits = sellingUnits.filter(su => su.name.trim() && su.price)
            if (validSellingUnits.length > 0) {
                data.sellingUnits = validSellingUnits.map((su, i) => ({
                    name: su.name.trim(),
                    unitId: su.unitId || null,
                    price: parseFloat(su.price) || 0,
                    conversionFactor: parseFloat(su.conversionFactor) || 1,
                    isDefault: i === 0,
                }))
            } else {
                data.sellingUnits = []
            }

            await onSubmit(data)
            onOpenChange(false)
            toast.success(product ? "Produit mis à jour" : "Produit ajouté")
        } catch (error: any) {
            console.error("Failed to save product:", error)
            toast.error(error.message || "Erreur lors de l'enregistrement du produit")
        } finally {
            setLoading(false)
        }
    }

    const selectedType = activeTypes.find((t) => t.id === formData.productTypeId)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{product ? "Modifier le produit" : "Ajouter un produit"}</DialogTitle>
                        <DialogDescription>
                            {product ? "Modifier les informations du produit." : "Saisir les détails du nouveau produit."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Type</Label>
                            <div className="col-span-3 flex gap-2 flex-wrap">
                                {activeTypes.map((type) => (
                                    <Button
                                        key={type.id}
                                        type="button"
                                        variant={formData.productTypeId === type.id ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setFormData({ ...formData, productTypeId: type.id })}
                                        className="flex-1"
                                    >
                                        {type.name}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {formData.productTypeId && activeSubcategories.length > 0 && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Sous-catégorie</Label>
                                <Select value={formData.subcategoryId || "none"} onValueChange={(v) => setFormData({ ...formData, subcategoryId: v === "none" ? "" : v })}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Optionnel" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Aucune</SelectItem>
                                        {activeSubcategories.map((sub) => (
                                            <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Nom</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="col-span-3"
                                required
                                placeholder={selectedType?.name ? `Ex: ${selectedType.name}` : "Nom du produit"}
                            />
                        </div>

                        {/* Selling Price */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="price" className="text-right">
                                Prix de vente
                            </Label>
                                <Input
                                    id="price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    className="col-span-3"
                                    required
                                />
                            </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="minStock" className="text-right">Stock minimum</Label>
                            <Input
                                id="minStock"
                                type="number"
                                min="0"
                                value={formData.minStock}
                                onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                                className="col-span-3"
                                required
                            />
                        </div>

                        {/* Selling Units Section */}
                        <Separator className="my-2" />
                        <div className="grid grid-cols-4 items-start gap-4">
                                    <Label className="text-right pt-1">Unités de vente</Label>
                                    <div className="col-span-3 space-y-3">
                                        {sellingUnits.length === 0 && (
                                            <p className="text-xs text-muted-foreground">
                                                Ajoutez différentes options d'emballage avec leurs propres prix (ex: Unité, Palette).
                                            </p>
                                        )}
                                        {sellingUnits.map((su, index) => (
                                            <div key={index} className="flex items-start gap-2 p-3 rounded-lg border bg-muted/20">
                                                <div className="flex-1 space-y-2">
                                                    <div className="grid grid-cols-4 gap-2">
                                                        <div>
                                                            <Label className="text-xs">Nom</Label>
                                                            <Input
                                                                value={su.name}
                                                                onChange={(e) => updateSellingUnit(index, "name", e.target.value)}
                                                                placeholder="Ex: Unité, Carton, Palette"
                                                                className="h-8 text-sm"
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label className="text-xs">Unité</Label>
                                                            <Select
                                                                value={su.unitId}
                                                                onValueChange={(value) => updateSellingUnit(index, "unitId", value)}
                                                            >
                                                                <SelectTrigger className="h-8 text-sm">
                                                                    <SelectValue placeholder="Unit" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {units.map((unit) => (
                                                                        <SelectItem key={unit.id} value={unit.id}>
                                                                            {unit.name} ({unit.symbol || unit.code})
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div>
                                                            <Label className="text-xs">Prix</Label>
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                value={su.price}
                                                                onChange={(e) => updateSellingUnit(index, "price", e.target.value)}
                                                                placeholder="Prix"
                                                                className="h-8 text-sm"
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label className="text-xs">Conv.</Label>
                                                            <Input
                                                                type="number"
                                                                step="0.001"
                                                                min="0.001"
                                                                value={su.conversionFactor}
                                                                onChange={(e) => updateSellingUnit(index, "conversionFactor", e.target.value)}
                                                                placeholder="Ex: 1, 0.05"
                                                                className="h-8 text-sm"
                                                                title="Combien d'unités de stock cette unité de vente représente. Ex: 1 carton = 1, 1 unité = 0.05"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeSellingUnit(index)}
                                                    className="h-8 w-8 mt-5 shrink-0 text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={addSellingUnit}
                                            className="w-full"
                                        >
                                            <Plus className="h-4 w-4 mr-1" />
                                            Ajouter une unité de vente
                                        </Button>
                                    </div>
                                </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Annuler
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            {product ? "Enregistrer" : "Ajouter"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
