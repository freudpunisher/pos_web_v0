"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, Edit2, Trash2, Loader2, Package, GlassWater, ShoppingBag, Wheat } from "lucide-react"
import { useProducts } from "@/hooks/use-products"
import { useAuth } from "@/lib/auth-context"
import { ProductFormDialog } from "@/components/inventory/product-form-dialog"
import { formatCurrency } from "@/lib/mock-data"
import { useProductTypes } from "@/hooks/use-product-types"
import Swal from "sweetalert2"

const typeIcons: Record<string, any> = {
    drink: GlassWater,
    food: ShoppingBag,
    ingredient: Wheat,
    others: Package,
}

const fallbackColor = "bg-gray-500/20 text-gray-700 dark:text-gray-400"

export default function ProductManagementPage() {
    const [search, setSearch] = useState("")
    const [typeFilter, setTypeFilter] = useState<string>("all")
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState<any>(null)
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(20)

    const { products, loading, deleteProduct, createProduct, updateProduct } = useProducts()
    const { activeTypes } = useProductTypes()
    const { user } = useAuth()
    const canEdit = user?.role === "admin"

    const filteredProducts = useMemo(() => products.filter((product) => {
        const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase()) ||
            product.sku.toLowerCase().includes(search.toLowerCase())
        const matchesType = typeFilter === "all" || product.productTypeId === typeFilter
        return matchesSearch && matchesType
    }), [products, search, typeFilter])

    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize))
    const currentPage = Math.min(page, totalPages)
    const paginatedProducts = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize)

    const handleSearchChange = (value: string) => {
        setSearch(value)
        setPage(1)
    }

    const handleEdit = (product: any) => {
        setSelectedProduct(product)
        setIsFormOpen(true)
    }

    const handleAddNew = () => {
        setSelectedProduct(null)
        setIsFormOpen(true)
    }

    const handleDelete = async (id: string) => {
        const result = await Swal.fire({
            title: "Supprimer ce produit ?",
            text: "Cette action est irréversible et supprimera le produit de l'inventaire.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Supprimer",
            cancelButtonText: "Annuler",
            confirmButtonColor: "#ef4444",
            cancelButtonColor: "#6b7280",
        })
        if (result.isConfirmed) {
            try {
                await deleteProduct(id)
                await Swal.fire({
                    icon: "success",
                    title: "Produit supprimé",
                    timer: 1500,
                    showConfirmButton: false,
                })
            } catch (error) {
                await Swal.fire({
                    icon: "error",
                    title: "Erreur",
                    text: "Impossible de supprimer le produit.",
                })
            }
        }
    }

    const handleFormSubmit = async (data: any) => {
        try {
            if (selectedProduct) {
                await updateProduct(selectedProduct.id, data)
                await Swal.fire({
                    icon: "success",
                    title: "Produit modifié",
                    timer: 1500,
                    showConfirmButton: false,
                })
            } else {
                await createProduct(data)
                await Swal.fire({
                    icon: "success",
                    title: "Produit créé",
                    timer: 1500,
                    showConfirmButton: false,
                })
            }
            setIsFormOpen(false)
        } catch (error: any) {
            await Swal.fire({
                icon: "error",
                title: "Erreur",
                text: error.message || "Une erreur est survenue.",
            })
        }
    }

    const typeFilters = [
        { key: "all", label: "Tout", icon: Package },
        ...activeTypes.map((t) => ({ key: t.id, label: t.name, icon: typeIcons[t.slug] || Package })),
    ]

    const counts: Record<string, number> = {
        all: products.length,
        ...Object.fromEntries(activeTypes.map((t) => [t.id, products.filter((p) => p.productTypeId === t.id).length])),
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Produits</h2>
                    <p className="text-muted-foreground">Gérer le catalogue de produits de la boutique</p>
                </div>
                <Button onClick={handleAddNew}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouveau produit
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex gap-2 flex-wrap">
                            {typeFilters.map(({ key, label, icon: Icon }) => (
                                <Button
                                    key={key}
                                    variant={typeFilter === key ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => { setTypeFilter(key); setPage(1) }}
                                >
                                    <Icon className="h-4 w-4 mr-1" />
                                    {label} ({counts[key as keyof typeof counts]})
                                </Button>
                            ))}
                        </div>
                        <div className="flex-1" />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-3 border-b">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-medium flex items-center gap-2">
                            <Package className="h-5 w-5 text-primary" />
                            Catalogue des produits
                        </CardTitle>
                        <div className="relative w-72">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Rechercher par nom ou code..."
                                value={search}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-secondary/10">
                                <TableHead>Code</TableHead>
                                <TableHead>Nom</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Prix</TableHead>
                                <TableHead className="text-center">Unités de vente</TableHead>
                                <TableHead className="text-right">Stock</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredProducts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground italic">
                                        Aucun produit trouvé
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedProducts.map((product) => {
                                    const productType = activeTypes.find((t) => t.id === product.productTypeId)
                                    const TypeIcon = productType ? (typeIcons[productType.slug] || Package) : Package

                                    return (
                                        <TableRow key={product.id}>
                                            <TableCell className="font-mono text-xs text-muted-foreground">{product.sku}</TableCell>
                                            <TableCell className="font-medium">{product.name}</TableCell>
                                            <TableCell>
                                                <Badge className={productType?.color || fallbackColor}>
                                                    <TypeIcon className="h-3 w-3 mr-1" />
                                                    {productType?.name || "—"}
                                                </Badge>
                                                {product.subcategoryName && (
                                                    <span className="ml-1 text-xs text-muted-foreground">/ {product.subcategoryName}</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">
                                                {formatCurrency(Number(product.price))}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {product.sellingUnits && product.sellingUnits.length > 0 ? (
                                                    <span className="text-xs font-medium text-muted-foreground">
                                                        {product.sellingUnits.length} unit{product.sellingUnits.length > 1 ? "s" : ""}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                                                    Number(product.stock) <= Number(product.minStock)
                                                        ? "bg-destructive/10 text-destructive"
                                                        : "bg-primary/10 text-primary"
                                                }`}>
                                                    {Number(product.stock)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(product)} className="h-8 w-8">
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>

                    <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-sm text-muted-foreground">
                            Affichage de {(currentPage - 1) * pageSize + 1} à {Math.min(currentPage * pageSize, filteredProducts.length)} sur {filteredProducts.length} produits
                        </div>
                        <div className="flex items-center gap-2">
                            <Select value={String(pageSize)} onValueChange={(value) => { setPageSize(Number(value)); setPage(1) }}>
                                <SelectTrigger className="w-[100px] h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10 / page</SelectItem>
                                    <SelectItem value="20">20 / page</SelectItem>
                                    <SelectItem value="50">50 / page</SelectItem>
                                    <SelectItem value="100">100 / page</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                Précédent
                            </Button>
                            <div className="text-sm text-muted-foreground">
                                Page {currentPage} sur {totalPages}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Suivant
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <ProductFormDialog
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                product={selectedProduct}
                onSubmit={handleFormSubmit}
            />
        </div>
    )
}
