"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { formatCurrency } from "@/lib/mock-data"
import { useCart } from "@/lib/cart-context"
import { formatStockFromSellingUnits } from "@/lib/stock-utils"
import type { SellingUnit } from "@/lib/types"
import {
  Search,
  Plus,
  Package,
  Headphones,
  Shirt,
  Coffee,
  Home,
  Dumbbell,
  Cable,
  Smartphone,
  Footprints,
  Leaf,
  Lamp,
  FlowerIcon,
  Loader2,
  AlertTriangle,
  ShoppingBag,
  GlassWater,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useProducts } from "@/hooks/use-products"
import { useAuth } from "@/lib/auth-context"
import { useProductTypes } from "@/hooks/use-product-types"

function getCategoryIcon(category: string, productName: string) {
  // Specific product icons
  const nameLower = productName.toLowerCase()
  if (nameLower.includes("headphone")) return Headphones
  if (nameLower.includes("cable")) return Cable
  if (nameLower.includes("phone") || nameLower.includes("case")) return Smartphone
  if (nameLower.includes("shirt")) return Shirt
  if (nameLower.includes("jeans")) return Shirt
  if (nameLower.includes("sneaker") || nameLower.includes("shoe")) return Footprints
  if (nameLower.includes("coffee")) return Coffee
  if (nameLower.includes("tea")) return Leaf
  if (nameLower.includes("lamp")) return Lamp
  if (nameLower.includes("plant") || nameLower.includes("pot")) return FlowerIcon
  if (nameLower.includes("yoga") || nameLower.includes("mat")) return Dumbbell
  if (nameLower.includes("resistance") || nameLower.includes("band")) return Dumbbell

  // Fallback to category icons
  switch (category) {
    case "Electronics":
      return Headphones
    case "Clothing":
      return Shirt
    case "Food & Beverages":
      return Coffee
    case "Home & Garden":
      return Home
    case "Sports":
      return Dumbbell
    default:
      return Package
  }
}

export function ProductGrid() {
  const [search, setSearch] = useState("")
  const [posFilter, setPosFilter] = useState<string>("all")
  const { addItem, items, productStockMap, principalStockMap } = useCart()
  const [stockAlert, setStockAlert] = useState<{ product: any; secondary: number; principal: number } | null>(null)
  const [unitSelectorProduct, setUnitSelectorProduct] = useState<any | null>(null)

  const { products, loading: productsLoading, refresh } = useProducts(search)
  const { activeTypes } = useProductTypes()
  const { user } = useAuth()

  // Filter: only show drink and food (not ingredients), optionally filter by type
  const posProducts = useMemo(() => {
    let filtered = products
    if (posFilter !== "all") filtered = filtered.filter((p: any) => p.productTypeId === posFilter)
    return filtered
  }, [products, posFilter])

  const getStockStatus = (product: any, effectiveStock: number) => {
    if (effectiveStock === 0) return "out"
    if (effectiveStock <= product.minStock) return "low"
    return "in-stock"
  }

  const handleAddItem = (product: any, sellingUnit?: SellingUnit) => {
    const secondaryQty = productStockMap[product.id]
    const principalQty = principalStockMap[product.id]

    if (secondaryQty !== undefined && secondaryQty <= 0 && principalQty && principalQty > 0) {
      setStockAlert({ product, secondary: secondaryQty, principal: principalQty })
      return
    }

    addItem(
      {
        ...product,
        price: Number.parseFloat(sellingUnit?.price ?? product.price),
        category: product.categoryName || product.category,
      },
      sellingUnit,
    )
  }

  const handleProductClick = (product: any) => {
    const hasSellingUnits = product.sellingUnits && product.sellingUnits.length > 0
    const effectiveStock = productStockMap[product.id] ?? 0
    const isOutOfStock = effectiveStock === 0
    const cartQty = items.filter((i) => i.id === product.id).reduce((sum, i) => sum + i.quantity, 0)
    const isCartFull = cartQty >= effectiveStock

    if (isOutOfStock || isCartFull) return

    if (hasSellingUnits && product.sellingUnits.length > 1) {
      setUnitSelectorProduct(product)
    } else {
      handleAddItem(product, hasSellingUnits ? product.sellingUnits[0] : undefined)
    }
  }

  useEffect(() => {
    const onTransactionCompleted = () => {
      refresh()
    }
    window.addEventListener("pos:transaction-completed", onTransactionCompleted)
    return () => window.removeEventListener("pos:transaction-completed", onTransactionCompleted)
  }, [refresh])

  return (
    <div className="flex flex-col overflow-hidden h-full">
      {/* Search and filters - fixed header */}
      <div className="space-y-2 p-3 pb-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher des produits par nom ou code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-9"
          />
        </div>

        <div className="w-full overflow-x-auto">
          <div className="flex gap-1.5 pb-1 min-w-min">
            <Button
                  variant={posFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPosFilter("all")}
                  className="shrink-0 h-7 text-xs"
                >
                  Tous
                </Button>
                {activeTypes.map((t) => (
                  <Button
                    key={t.id}
                    variant={posFilter === t.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPosFilter(t.id)}
                    className="shrink-0 h-7 text-xs"
                  >
                    {t.name}
                  </Button>
                ))}
          </div>
        </div>
      </div>

      {/* Product grid - scrollable */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {productsLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
            {posProducts.map((product: any) => {
              const effectiveStock = productStockMap[product.id] ?? 0
              const stockStatus = getStockStatus(product, effectiveStock)
              const isOutOfStock = stockStatus === "out"
              const IconComponent = getCategoryIcon(product.categoryName || "", product.name)

              const cartQty = items.filter((i) => i.id === product.id).reduce((sum, i) => sum + i.quantity, 0)
              const isCartFull = cartQty >= effectiveStock

              return (
                <Card
                  key={product.id}
                  className={cn(
                    "group cursor-pointer border-border bg-card transition-all hover:border-primary/50",
                    (isOutOfStock || isCartFull) && "opacity-60",
                  )}
                  onClick={() => handleProductClick(product)}
                >
                    <CardContent className="p-3">
                        <div className="relative mb-2 aspect-square overflow-hidden rounded-lg bg-secondary">
                            <div className="flex h-full items-center justify-center">
                                <IconComponent className="h-14 w-14 text-muted-foreground" />
                            </div>
                      {isCartFull ? (
                        <Badge className="absolute right-1 top-1 bg-destructive text-xs">Max</Badge>
                      ) : stockStatus === "out" ? (
                        <Badge className="absolute right-1 top-1 bg-destructive text-xs">Épuisé</Badge>
                      ) : stockStatus === "low" ? (
                        <Badge className="absolute right-1 top-1 bg-warning text-xs">Faible</Badge>
                      ) : null}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                        {isCartFull || isOutOfStock ? (
                          <span className="text-xs font-bold text-white uppercase tracking-wider">Max</span>
                        ) : (
                          <Plus className="h-10 w-10 text-white" />
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="truncate text-sm font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.sku}</p>
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-primary">
                          {product.sellingUnits && product.sellingUnits.length > 0
                            ? (() => {
                                const prices = product.sellingUnits.map((s: any) => Number.parseFloat(s.price))
                                const minP = Math.min(...prices)
                                const maxP = Math.max(...prices)
                                return minP === maxP
                                  ? formatCurrency(minP)
                                  : `${formatCurrency(minP)} - ${formatCurrency(maxP)}`
                              })()
                            : formatCurrency(Number.parseFloat(product.price))
                          }
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {product.sellingUnits?.length > 0
                            ? `${formatStockFromSellingUnits(Number(effectiveStock), product.sellingUnits)} en stock`
                            : `${Number(effectiveStock)} en stock`}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
        {!productsLoading && posProducts.length === 0 && (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <p>Aucun produit trouvé</p>
          </div>
        ) as any}
      </div>

      {/* Selling Unit Selector */}
      <Dialog open={!!unitSelectorProduct} onOpenChange={(open) => !open && setUnitSelectorProduct(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{unitSelectorProduct?.name}</DialogTitle>
            <DialogDescription>Sélectionnez une unité de vente à ajouter au panier</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {unitSelectorProduct?.sellingUnits?.map((su: any) => (
              <Button
                key={su.id}
                variant="outline"
                className="w-full justify-between h-auto py-3 px-4"
                onClick={() => {
                  handleAddItem(unitSelectorProduct, su)
                  setUnitSelectorProduct(null)
                }}
              >
                <span className="font-medium">{su.name}</span>
                <span className="font-bold text-primary">{formatCurrency(Number.parseFloat(su.price))}</span>
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setUnitSelectorProduct(null)}>
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Alert Dialog */}
      <Dialog open={!!stockAlert} onOpenChange={(open) => !open && setStockAlert(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg text-warning">
              <AlertTriangle className="h-5 w-5" />
              Rupture de stock
            </DialogTitle>
            <DialogDescription className="text-sm">
              <strong>{stockAlert?.product.name}</strong> est actuellement en rupture de stock
              dans votre emplacement, mais il y a{" "}
              <span className="font-bold text-accent">{stockAlert?.principal ?? 0}</span> unités
              disponibles dans l'entrepôt principal.
            </DialogDescription>
          </DialogHeader>
          {user?.role === "cashier" ? (
            <div className="bg-secondary/10 rounded-lg p-4 text-sm space-y-1">
              <p className="font-medium">Informez votre manager :</p>
              <p className="text-muted-foreground">
                Veuillez signaler à votre manager que ce produit nécessite un
                transfert de stock depuis l&apos;entrepôt principal.
              </p>
            </div>
          ) : (
            <div className="bg-secondary/10 rounded-lg p-4 text-sm space-y-1">
              <p className="font-medium">Recommandé :</p>
              <p className="text-muted-foreground">
                Allez dans <strong>Transferts de stock</strong> pour déplacer le stock de l&apos;entrepôt
                vers l&apos;emplacement avant de vendre.
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setStockAlert(null)}>
              Fermer
            </Button>
            {user?.role !== "cashier" && (
              <Button asChild>
                <Link href="/stock/transfers">Aller aux transferts</Link>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
