"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { Product } from "@/lib/types"
import { formatCurrency, getStockStatus } from "@/lib/mock-data"
import { Package, Tag, DollarSign, Warehouse, AlertTriangle } from "lucide-react"
import Image from "next/image"

interface ProductDetailsModalProps {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProductDetailsModal({ product, open, onOpenChange }: ProductDetailsModalProps) {
  if (!product) return null

  const stockStatus = getStockStatus(product)

  const getStockBadge = () => {
    switch (stockStatus) {
      case "in-stock":
        return <Badge className="bg-accent/20 text-accent">In Stock</Badge>
      case "low":
        return <Badge className="bg-warning/20 text-warning">Low Stock</Badge>
      case "out":
        return <Badge className="bg-destructive/20 text-destructive">Out of Stock</Badge>
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Details
          </DialogTitle>
          <DialogDescription>Complete information about this product</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="relative aspect-square overflow-hidden rounded-lg bg-secondary">
            {product.image ? (
              <Image src={product.image || "/placeholder.svg"} alt={product.name} fill className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Package className="h-20 w-20 text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold">{product.name}</h3>
              <p className="text-sm text-muted-foreground">{product.sku}</p>
            </div>

            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{product.category}</span>
            </div>

            <Separator />

            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs">Selling Price</span>
              </div>
              <p className="mt-1 text-xl font-bold text-primary">{formatCurrency(product.price)}</p>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Warehouse className="h-4 w-4" />
                  <span className="text-sm">Current Stock</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{product.stock}</span>
                  {getStockBadge()}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">Minimum Stock</span>
                </div>
                <span className="font-medium">{product.minStock}</span>
              </div>
            </div>


          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
