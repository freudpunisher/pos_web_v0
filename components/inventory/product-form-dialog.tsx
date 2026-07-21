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
import { useCategories } from "@/hooks/use-products"
import { useUnits } from "@/hooks/use-units"
import { Loader2, Beer, Utensils, Package, Plus, Trash2, GripVertical, Save } from "lucide-react"
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
    const { categories, loading: categoriesLoading } = useCategories()
    const { units, loading: unitsLoading } = useUnits()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        categoryId: "",
        productType: "drink",
        price: "",
        unit: "kg",
        minStock: "10",
        trackStock: false,
        quantityPerBox: "1",
        image: "",
        sector: "",
    })
    const [sellingUnits, setSellingUnits] = useState<SellingUnitForm[]>([])

    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name || "",
                categoryId: product.categoryId || "",
                productType: product.productType || "drink",
                price: product.price?.toString() || "",
                unit: product.unit || "kg",
                minStock: product.minStock?.toString() || "10",
                trackStock: product.trackStock ?? (product.productType === "ingredient" || Number(product.stock) > 0),
                quantityPerBox: product.quantityPerBox?.toString() || "1",
                image: product.image || "",
                sector: product.sector || "",
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
                categoryId: "",
                productType: "drink",
                price: "",
                unit: "kg",
                minStock: "10",
                trackStock: false,
                quantityPerBox: "1",
                image: "",
                sector: "",
            })
            setSellingUnits([])
        }
    }, [product, open])

    useEffect(() => {
        if (units.length > 0 && formData.unit) {
            const unitExists = units.some((u) => u.code === formData.unit)
            if (!unitExists) {
                setFormData((prev) => ({ ...prev, unit: units[0].code }))
            }
        }
    }, [units])

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
        if (!formData.unit.trim()) {
            await Swal.fire({
                icon: "error",
                title: "Invalid unit",
                text: "Unit is required.",
            })
            return
        }
        setLoading(true)
        try {
            const data: any = {
                name: formData.name,
                categoryId: formData.categoryId,
                productType: formData.productType,
                unit: formData.unit,
                image: formData.image || null,
                sector: formData.sector || null,
            }

            if (formData.productType === "ingredient") {
                data.minStock = parseInt(formData.minStock) || 10
                data.trackStock = true
                data.price = 0
            } else {
                data.price = parseFloat(formData.price) || 0
                data.trackStock = formData.trackStock
                data.minStock = formData.trackStock ? (parseInt(formData.minStock) || 10) : 0
                data.quantityPerBox = parseInt(formData.quantityPerBox) || 1
            }

            // Include selling units if any
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

    const isIngredient = formData.productType === "ingredient"
    const isFood = formData.productType === "food"
    const isDrink = formData.productType === "drink"

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{product ? "Edit Product" : "Add New Product"}</DialogTitle>
                        <DialogDescription>
                            {product ? "Update product information." : "Enter the details for the new product."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {/* Product Type */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Type</Label>
                            <div className="col-span-3 flex gap-2">
                                {(['drink', 'food', 'ingredient', 'others'] as const).map((type) => (
                                    <Button
                                        key={type}
                                        type="button"
                                        variant={formData.productType === type ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setFormData({ ...formData, productType: type })}
                                        className="flex-1"
                                    >
                                        {type === "drink" && <Beer className="h-4 w-4 mr-1" />}
                                        {type === "food" && <Utensils className="h-4 w-4 mr-1" />}
                                        {type === "ingredient" && <Package className="h-4 w-4 mr-1" />}
                                        {type === "others" && <Package className="h-4 w-4 mr-1" />}
                                        {type === "drink" ? "Drink" : type === "food" ? "Food" : type === "ingredient" ? "Cuisine" : "Autres"}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Name */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Name</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="col-span-3"
                                required
                                placeholder={isIngredient ? "e.g. Chicken Breast" : isDrink ? "e.g. Bottled Beer" : "e.g. Grilled Chicken Plate"}
                            />
                        </div>

                        {/* Sector */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="category" className="text-right">
                                Category
                            </Label>
                            <Select
                                value={formData.categoryId}
                                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                            >
                                <SelectTrigger id="category" className="col-span-3">
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.length === 0 ? (
                                        <SelectItem value="none" disabled>No categories found</SelectItem>
                                    ) : (
                                        categories.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                            {categoriesLoading && <span className="col-span-3 text-xs text-muted-foreground">Loading categories...</span>}
                        </div>

                        {/* Sector */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="sector" className="text-right">
                                Sector
                            </Label>
                            <Select
                                value={formData.sector}
                                onValueChange={(value) => setFormData({ ...formData, sector: value })}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select sector" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Alimentation">Alimentation</SelectItem>
                                    <SelectItem value="Bar">Bar</SelectItem>
                                    <SelectItem value="Cuisine">Cuisine</SelectItem>
                                    <SelectItem value="Boulangerie">Boulangerie</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Selling Price (hidden for ingredients) */}
                        {!isIngredient && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="price" className="text-right">
                                    {isFood ? "Plate Price" : "Default Price"}
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
                        )}

                        {/* Image Upload */}
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="image" className="text-right pt-2">Image</Label>
                            <div className="col-span-3 space-y-2">
                                <input
                                    id="image"
                                    type="file"
                                    accept="image/*"
                                    key={product?.id || "new"}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) {
                                            const reader = new FileReader()
                                            reader.onload = (ev) => {
                                                setFormData({ ...formData, image: ev.target?.result as string })
                                            }
                                            reader.readAsDataURL(file)
                                        }
                                    }}
                                    className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                />
                                {formData.image && (
                                    <div className="flex items-center gap-3">
                                        <div className="relative h-20 w-20 rounded-lg overflow-hidden border">
                                            <img
                                                src={formData.image}
                                                alt="Preview"
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setFormData({ ...formData, image: "" })}
                                            className="text-destructive"
                                        >
                                            Supprimer
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Track Stock Toggle (drinks only) */}
                        {isDrink && (
                            <>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">Track Stock</Label>
                                    <div className="col-span-3">
                                        <Button
                                            type="button"
                                            variant={formData.trackStock ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setFormData({ ...formData, trackStock: !formData.trackStock })}
                                        >
                                            {formData.trackStock ? "Yes — Countable" : "No — Made to Order"}
                                        </Button>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {formData.trackStock
                                                ? "Stock decreases when sold (e.g. bottled beer, soda can)"
                                                : "No stock tracking (e.g. cafe, fresh juice)"}
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="quantityPerBox" className="text-right">Qty per Box</Label>
                                    <Input
                                        id="quantityPerBox"
                                        type="number"
                                        min="1"
                                        value={formData.quantityPerBox}
                                        onChange={(e) => setFormData({ ...formData, quantityPerBox: e.target.value })}
                                        className="col-span-3"
                                        placeholder="Quantity in a case (e.g. 24)"
                                    />
                                </div>
                            </>
                        )}

                        {/* Unit Selection */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="unit" className="text-right">Base Unit</Label>
                            <Select
                                value={formData.unit}
                                onValueChange={(value) => setFormData({ ...formData, unit: value })}
                                required
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select unit" />
                                </SelectTrigger>
                                <SelectContent>
                                    {units.length === 0 ? (
                                        <SelectItem value="unit">Unité (unit)</SelectItem>
                                    ) : (
                                        units.map((unit) => (
                                            <SelectItem key={unit.id} value={unit.code}>
                                                {unit.name} ({unit.symbol || unit.code})
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                            {unitsLoading && <span className="col-span-3 text-xs text-muted-foreground">Loading units...</span>}
                        </div>

                        {/* Min Stock (for tracked drinks and ingredients) */}
                        {(isIngredient || (isDrink && formData.trackStock)) && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="minStock" className="text-right">Min Stock Alert</Label>
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
                        )}

                        {/* Selling Units Section */}
                        {!isIngredient && (
                            <>
                                <Separator className="my-2" />
                                <div className="grid grid-cols-4 items-start gap-4">
                                    <Label className="text-right pt-1">Selling Units</Label>
                                    <div className="col-span-3 space-y-3">
                                        {sellingUnits.length === 0 && (
                                            <p className="text-xs text-muted-foreground">
                                                Add different packaging options with their own prices (e.g. Short, Bottle).
                                            </p>
                                        )}
                                        {sellingUnits.map((su, index) => (
                                            <div key={index} className="flex items-start gap-2 p-3 rounded-lg border bg-muted/20">
                                                <div className="flex-1 space-y-2">
                                                    <div className="grid grid-cols-4 gap-2">
                                                        <div>
                                                            <Label className="text-xs">Name</Label>
                                                            <Input
                                                                value={su.name}
                                                                onChange={(e) => updateSellingUnit(index, "name", e.target.value)}
                                                                placeholder="e.g. Short, Bottle"
                                                                className="h-8 text-sm"
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label className="text-xs">Unit</Label>
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
                                                            <Label className="text-xs">Price</Label>
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                value={su.price}
                                                                onChange={(e) => updateSellingUnit(index, "price", e.target.value)}
                                                                placeholder="Price"
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
                                                                placeholder="e.g. 1, 0.05"
                                                                className="h-8 text-sm"
                                                                title="How many stock units this selling unit represents. E.g. 1 bottle = 1, 1 short = 0.05"
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
                                            Add Selling Unit
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            {product ? "Save Changes" : "Add Product"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
