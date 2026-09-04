"use client"
import { useState, useMemo, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useSuppliers } from "@/hooks/use-suppliers"
import { useProducts } from "@/hooks/use-products"
import { usePurchases } from "@/hooks/use-purchases"
import { formatCurrency } from "@/lib/mock-data"
import { Plus, Trash2, Package, Loader2, ArrowLeft, ShoppingCart, Search, DollarSign, Hash } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface POItem {
  productId: string
  productName: string
  quantity: number
  cost: number
}

export default function CreatePurchaseOrderPage() {
  const router = useRouter()
  const [supplierId, setSupplierId] = useState("")
  const [items, setItems] = useState<POItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState("")
  const [productSearch, setProductSearch] = useState("")
  const [showProductSearch, setShowProductSearch] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const { suppliers, loading: suppliersLoading } = useSuppliers()
  const { products, loading: productsLoading } = useProducts()
  const { createOrder } = usePurchases()

  const filteredProducts = useMemo(() => {
    const query = productSearch.toLowerCase()
    return products.filter((p) =>
      p.name.toLowerCase().includes(query) ||
      (p.sku && p.sku.toLowerCase().includes(query))
    )
  }, [products, productSearch])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowProductSearch(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const addProduct = (productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (!product) return

    const existing = items.find((i) => i.productId === productId)
    if (existing) {
      setItems((prev) =>
        prev.map((i) =>
          i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i
        )
      )
    } else {
      setItems((prev) => [
        ...prev,
        { productId: product.id, productName: product.name, quantity: 1, cost: 0 },
      ])
    }
    setProductSearch("")
    setSelectedProductId("")
    setShowProductSearch(false)
  }

  const updateQuantity = (productId: string, newQty: number) => {
    const qty = Math.max(0, newQty)
    if (qty === 0) {
      setItems((prev) => prev.filter((i) => i.productId !== productId))
    } else {
      setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)))
    }
  }

  const updateUnitCost = (productId: string, cost: string) => {
    const numeric = parseFloat(cost) || 0
    setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, cost: numeric } : i)))
  }

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId))
  }

  const total = items.reduce((sum, i) => sum + i.quantity * i.cost, 0)
  const totalUnits = items.reduce((sum, i) => sum + Number(i.quantity || 0), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await createOrder({ supplierId, items, total })
      toast({ title: "Commande créée", description: "Nouveau bon de commande sauvegardé comme en attente." })
      router.push("/purchases")
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erreur", description: err.message || "Impossible de créer la commande" })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/purchases")} className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Nouvelle commande</h2>
            <p className="text-sm text-muted-foreground">Créer un bon de commande fournisseur</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Summary Card */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total estimé</p>
                <p className="text-3xl font-bold text-primary">{formatCurrency(total)}</p>
              </div>
              <div className="flex gap-6">
                <div className="text-right">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Produits</p>
                  <p className="text-xl font-bold">{items.length}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Unités</p>
                  <p className="text-xl font-bold">{totalUnits}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Supplier */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              Informations de commande
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="supplier" className="text-sm">Fournisseur *</Label>
              <Select value={supplierId} onValueChange={setSupplierId} required>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={suppliersLoading ? "Chargement..." : "Sélectionner un fournisseur"} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers
                    .filter((s) => s.isActive)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <span>{s.name}</span>
                          {s.phone && <span className="text-xs text-muted-foreground">· {s.phone}</span>}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Products */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  Articles
                </CardTitle>
                <CardDescription>Ajoutez les produits à commander</CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs">
                <Hash className="h-3 w-3 mr-0.5" /> {items.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Product Search */}
            <div className="relative" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher un produit par nom ou SKU..."
                value={productSearch}
                onChange={(e) => { setProductSearch(e.target.value); setShowProductSearch(true) }}
                onFocus={() => setShowProductSearch(true)}
                className="pl-10 h-10"
              />
              {showProductSearch && productSearch && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg max-h-60 overflow-y-auto">
                  {filteredProducts.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Aucun produit trouvé
                    </div>
                  ) : (
                    filteredProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted/50 transition-colors flex items-center justify-between gap-3 border-b border-border/50 last:border-0"
                        onClick={() => addProduct(p.id)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{p.name}</p>
                            {p.sku && <p className="text-xs text-muted-foreground font-mono">{p.sku}</p>}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          <Plus className="h-3 w-3 mr-0.5" /> Ajouter
                        </Badge>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Items List */}
            {items.length > 0 ? (
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.productId} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Package className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">Sous-total : {formatCurrency(item.quantity * item.cost)}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Coût unitaire</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.cost}
                            onChange={(e) => updateUnitCost(item.productId, e.target.value)}
                            className="w-24 text-right h-8 pl-6"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Quantité</Label>
                        <Input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.productId, Number(e.target.value))}
                          className="w-20 text-center h-8"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive/90 shrink-0"
                        onClick={() => removeItem(item.productId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-xl text-muted-foreground">
                <Package className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">Aucun article ajouté</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Recherchez et sélectionnez un produit ci-dessus</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4 pt-2">
          <Button type="button" variant="outline" onClick={() => router.push("/purchases")} className="flex-1">
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !supplierId || items.length === 0}
            className="flex-1 gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Créer la commande
          </Button>
        </div>
      </form>
    </div>
  )
}
