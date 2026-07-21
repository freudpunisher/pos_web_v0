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
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { useSuppliers } from "@/hooks/use-suppliers"
import { useProducts } from "@/hooks/use-products"
import { formatCurrency } from "@/lib/mock-data"
import { Plus, Minus, Trash2, Package, Loader2 } from "lucide-react"

interface POItem {
  productId: string
  productName: string
  quantity: number
  cost: number
}

interface PurchaseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => Promise<void>
}

export function PurchaseFormDialog({ open, onOpenChange, onSubmit }: PurchaseFormDialogProps) {
  const [supplierId, setSupplierId] = useState("")
  const [items, setItems] = useState<POItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState("")
  const [loading, setLoading] = useState(false)

  const { suppliers, loading: suppliersLoading } = useSuppliers()
  const { products, loading: productsLoading } = useProducts()

  const purchasableProducts = products.filter(
    (p) => p.productType === "ingredient" || (p.productType === "drink" && p.trackStock)
  )

  useEffect(() => {
    if (!open) {
      setSupplierId("")
      setItems([])
      setSelectedProductId("")
    }
  }, [open])

  const addProduct = () => {
    if (!selectedProductId) return
    const product = products.find((p) => p.id === selectedProductId)
    if (!product) return

    const existing = items.find((i) => i.productId === selectedProductId)
    if (existing) {
      setItems((prev) =>
        prev.map((i) =>
          i.productId === selectedProductId ? { ...i, quantity: i.quantity + 1 } : i,
        ),
      )
    } else {
      setItems((prev) => [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          cost: 0,
        },
      ])
    }
    setSelectedProductId("")
  }

  const updateQuantity = (productId: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) => (i.productId === productId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i))
        .filter((i) => i.quantity > 0),
    )
  }

  const updateCost = (productId: string, cost: string) => {
    const numericCost = parseFloat(cost) || 0
    setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, cost: numericCost } : i)))
  }

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId))
  }

  const total = items.reduce((sum, i) => sum + i.quantity * i.cost, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit({
        supplierId,
        items,
        total,
        status: "received",
      })
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to create purchase order:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
            <DialogDescription>Add a new purchase order from a supplier</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select value={supplierId} onValueChange={setSupplierId} required>
                <SelectTrigger>
                  <SelectValue placeholder={suppliersLoading ? "Loading suppliers..." : "Select supplier"} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers
                    .filter((s) => s.isActive)
                    .map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Add Products</Label>
              <div className="flex gap-2">
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={productsLoading ? "Loading products..." : "Select product"} />
                  </SelectTrigger>
                  <SelectContent>
                    {purchasableProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={addProduct}
                  disabled={!selectedProductId || productsLoading}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {items.length > 0 && (
              <div className="rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border">
                      <TableHead className="text-muted-foreground">Product</TableHead>
                      <TableHead className="text-muted-foreground text-right">Cost</TableHead>
                      <TableHead className="text-muted-foreground text-center">Qty</TableHead>
                      <TableHead className="text-muted-foreground text-right">Subtotal</TableHead>
                      <TableHead className="text-muted-foreground w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.productId} className="border-border">
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.cost}
                            onChange={(e) => updateCost(item.productId, e.target.value)}
                            className="h-8 w-24 ml-auto text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 bg-transparent"
                              onClick={() => updateQuantity(item.productId, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 bg-transparent"
                              onClick={() => updateQuantity(item.productId, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.quantity * item.cost)}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => removeItem(item.productId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {items.length === 0 && (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border">
                <div className="text-center text-muted-foreground">
                  <Package className="mx-auto mb-2 h-8 w-8" />
                  <p>No items added yet</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-4">
              <span className="font-medium">Total Order Value</span>
              <span className="text-xl font-bold text-primary">{formatCurrency(total)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!supplierId || items.length === 0 || loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Order
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
