"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { useSuppliers } from "@/hooks/use-suppliers"
import { usePurchases } from "@/hooks/use-purchases"
import { formatCurrency } from "@/lib/mock-data"
import { Plus, Trash2, Package, Loader2, ArrowLeft, ShoppingCart } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth-context"

interface POItem {
  productId: string
  productName: string
  quantity: number
  cost: number
}

export default function CreateBakeryPurchaseOrderPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [supplierId, setSupplierId] = useState("")
  const [items, setItems] = useState<POItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { suppliers, loading: suppliersLoading } = useSuppliers()
  const { createOrder } = usePurchases()
  const [rawMaterials, setRawMaterials] = useState<any[]>([])
  const [materialsLoading, setMaterialsLoading] = useState(true)

  const fetchRawMaterials = async () => {
    setMaterialsLoading(true)
    try {
      const res = await fetch("/api/raw-materials")
      if (res.ok) {
        setRawMaterials(await res.json())
      }
    } finally {
      setMaterialsLoading(false)
    }
  }

  useEffect(() => {
    fetchRawMaterials()
  }, [])

  const addProduct = () => {
    if (!selectedProductId) return
    const product = rawMaterials.find((p: any) => p.id === selectedProductId)
    if (!product) return

    const existing = items.find((i) => i.productId === selectedProductId)
    if (existing) {
      setItems((prev) =>
        prev.map((i) =>
          i.productId === selectedProductId ? { ...i, quantity: i.quantity + 1 } : i
        )
      )
    } else {
      setItems((prev) => [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          cost: parseFloat(product.cost) || 0,
        },
      ])
    }
    setSelectedProductId("")
  }

  const updateQuantity = (productId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, quantity: Math.max(0, quantity) } : i
      )
    )
  }

  const updateCost = (productId: string, cost: string) => {
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
      const order = await createOrder({ supplierId, items, total, sector: "Boulangerie" })
      const res = await fetch(`/api/purchase-orders/${order.id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to receive order")
      }
      toast({ title: "Approvisionnement enregistré", description: "Stock matières premières mis à jour." })
      router.push("/bakery/raw-materials")
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "Could not create order" })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Approvisionnement Boulangerie</h2>
          <p className="text-muted-foreground">Créer un bon d'approvisionnement matières premières</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/bakery/raw-materials")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Total</p>
                <p className="text-4xl font-black text-primary">{formatCurrency(total)}</p>
              </div>
              <div className="text-right space-y-1">
                <p><span className="font-bold text-lg">{items.length}</span> produits</p>
                <p><span className="font-bold text-lg">{totalUnits}</span> unités</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Informations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="supplier" className="text-base">Supplier *</Label>
              <Select value={supplierId} onValueChange={setSupplierId} required>
                <SelectTrigger>
                  <SelectValue placeholder={suppliersLoading ? "Loading..." : "Select supplier"} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers
                    .filter((s) => s.isActive)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Matières premières
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Label htmlFor="product">Ajouter un produit</Label>
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder={materialsLoading ? "Loading..." : "Choisir un produit"} />
                  </SelectTrigger>
                  <SelectContent>
                    {rawMaterials.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} – {formatCurrency(parseFloat(p.cost || "0"))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                onClick={addProduct}
                disabled={!selectedProductId || materialsLoading}
                className="mt-8 sm:mt-0 self-end"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>

            {items.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Produit</TableHead>
                      <TableHead className="text-right">Coût unitaire</TableHead>
                      <TableHead className="text-center">Quantité</TableHead>
                      <TableHead className="text-right">Sous-total</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.productId}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.cost}
                              onChange={(e) => updateCost(item.productId, e.target.value)}
                              className="w-28 text-right"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min="0"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.productId, Number(e.target.value))}
                            className="w-20 mx-auto text-center"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.quantity * item.cost)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive/90"
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
            ) : (
              <div className="flex flex-col items-center justify-center h-48 border border-dashed rounded-lg text-muted-foreground">
                <Package className="h-10 w-10 mb-3 opacity-50" />
                <p className="font-medium">No items added yet</p>
                <p className="text-sm">Select a product and click Add</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4 pt-4">
          <Button type="button" variant="outline" onClick={() => router.push("/bakery/raw-materials")} className="flex-1">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !supplierId || items.length === 0}
            className="flex-1 gap-2"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Pending Order
          </Button>
        </div>
      </form>
    </div>
  )
}
