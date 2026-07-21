// app/purchases/edit/[id]/page.tsx
// or app/purchases/[id]/edit/page.tsx  ← adjust path as needed

"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { useSuppliers } from "@/hooks/use-suppliers"
import { useProducts } from "@/hooks/use-products"
import { usePurchases } from "@/hooks/use-purchases"
import { formatCurrency } from "@/lib/mock-data"
import { printReport } from "@/lib/print-report"
import { ArrowLeft, Loader2, Plus, Trash2, Package, ShoppingCart, XCircle, CheckCircle2, Printer } from "lucide-react"
import Swal from "sweetalert2"
import { toast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth-context"

interface POItem {
  productId: string
  productName: string
  quantity: number
  cost: number
  boxes?: number
  quantityPerBox?: number
}

export default function EditPurchaseOrderPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string

  const [order, setOrder] = useState<any | null>(null)
  const [supplierId, setSupplierId] = useState("")
  const [items, setItems] = useState<POItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isActionLoading, setIsActionLoading] = useState(false)

  const { suppliers, loading: suppliersLoading } = useSuppliers()
  const { products, loading: productsLoading } = useProducts()

  const purchasableProducts = products.filter(
    (p) => p.productType === "ingredient" || (p.productType === "drink" && p.trackStock)
  )
  const { updateOrder, cancelOrder, markAsReceived } = usePurchases()
  const { user } = useAuth()

  // Load order data
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setIsLoading(true)
        const res = await fetch(`/api/purchase-orders/${orderId}`)
        if (!res.ok) throw new Error("Failed to load order")
        const data = await res.json()
        setOrder(data)
        setSupplierId(data.supplierId)
        setItems(data.items || [])
      } catch (err: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: err.message || "Could not load purchase order",
        })
        router.push("/purchases")
      } finally {
        setIsLoading(false)
      }
    }

    if (orderId) fetchOrder()
  }, [orderId, router])

  // Enrich items with boxes and quantityPerBox from products once loaded
  useEffect(() => {
    if (products.length > 0 && items.length > 0) {
      const needsUpdate = items.some((item) => item.boxes === undefined)
      if (needsUpdate) {
        setItems((prev) =>
          prev.map((item) => {
            if (item.boxes !== undefined) return item
            const product = products.find((p) => p.id === item.productId)
            const qpb = product?.quantityPerBox || 1
            const qty = Number(item.quantity) || 0
            const cost = Number(item.cost) || 0
            return {
              ...item,
              quantity: qty,
              cost: cost,
              quantityPerBox: qpb,
              boxes: qty / qpb,
            }
          })
        )
      }
    }
  }, [products, items])

  const isEditable = order?.status === "pending"

  const addProduct = () => {
    if (!selectedProductId) return
    const product = products.find((p) => p.id === selectedProductId)
    if (!product) return

    const existing = items.find((i) => i.productId === selectedProductId)
    if (existing) {
      setItems((prev) =>
        prev.map((i) => {
          if (i.productId === selectedProductId) {
            const nextBoxes = (i.boxes || 1) + 1
            const qpb = i.quantityPerBox || 1
            return {
              ...i,
              boxes: nextBoxes,
              quantity: nextBoxes * qpb,
            }
          }
          return i
        })
      )
    } else {
      const qpb = product.quantityPerBox || 1
      setItems((prev) => [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          boxes: 1,
          quantityPerBox: qpb,
          quantity: qpb,
          cost: 0,
        },
      ])
    }
    setSelectedProductId("")
  }

  const updateBoxes = (productId: string, newBoxes: number) => {
    const bxs = Math.max(0, newBoxes)
    if (bxs === 0) {
      setItems((prev) => prev.filter((i) => i.productId !== productId))
    } else {
      setItems((prev) =>
        prev.map((i) =>
          i.productId === productId
            ? { ...i, boxes: bxs, quantity: bxs * (i.quantityPerBox || 1) }
            : i
        )
      )
    }
  }

  const updateUnitCost = (productId: string, cost: string) => {
    const numericCost = parseFloat(cost) || 0
    setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, cost: numericCost } : i)))
  }

  const updateBoxCost = (productId: string, boxCost: string) => {
    const numericBoxCost = parseFloat(boxCost) || 0
    setItems((prev) =>
      prev.map((i) => {
        if (i.productId === productId) {
          const qpb = i.quantityPerBox || 1
          return { ...i, cost: numericBoxCost / qpb }
        }
        return i
      })
    )
  }

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId))
  }

  const total = items.reduce((sum, i) => sum + i.quantity * i.cost, 0)
  const totalUnits = items.reduce((sum, i) => sum + Number(i.quantity || 0), 0)
  const totalBoxes = items.reduce((sum, i) => sum + Number(i.boxes || 0), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEditable) return

    setIsSubmitting(true)
    try {
      await updateOrder(orderId, {
        supplierId,
        items,
        total,
      })
      toast({ title: "Commande mise à jour", description: "Modifications enregistrées." })
      router.push("/purchases")
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Échec de la mise à jour",
        description: err.message || "Impossible d'enregistrer les modifications",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelOrder = async () => {
    if (!confirm("Êtes-vous sûr de vouloir annuler cette commande ?")) return
    setIsActionLoading(true)
    try {
      await cancelOrder(orderId)
      toast({ title: "Commande annulée" })
      router.push("/purchases")
    } catch (err: any) {
      toast({ variant: "destructive", title: "Échec de l'annulation", description: err.message })
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleReceiveOrder = async () => {
    const result = await Swal.fire({
      title: "Marquer comme reçu ?",
      text: "Cela mettra à jour les niveaux de stock.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Oui, recevoir",
      cancelButtonText: "Annuler",
    })
    if (!result.isConfirmed) return
    setIsActionLoading(true)
    try {
      await markAsReceived(orderId, user?.id || "")
      toast({ title: "Commande reçue", description: "Stock mis à jour." })
      router.push("/purchases")
    } catch (err: any) {
      toast({ variant: "destructive", title: "Échec de la réception", description: err.message })
    } finally {
      setIsActionLoading(false)
    }
  }

  const handlePrint = () => {
    const origin = window.location.origin
    const supplierName = suppliers.find((s) => s.id === supplierId)?.name || "—"
    printReport({
      title: "BON D'APPROVISIONNEMENT",
      subtitle: order?.purchaseRef || `Commande #${orderId.slice(0, 8)}`,
      period: new Date(order?.date).toLocaleDateString(),
      logoUrl: `${origin}/ahava.png`,
      metrics: [
        { label: "Fournisseur", value: supplierName },
        { label: "Statut", value: order?.status === "pending" ? "En attente" : order?.status === "received" ? "Reçu" : "Annulé" },
        { label: "Produits", value: String(items.length), highlight: true },
        { label: "Total", value: formatCurrency(total), highlight: true },
      ],
      columns: [
        { header: "Produit", key: "product" },
        { header: "Caisses", key: "boxes", align: "center" },
        { header: "Bouteilles", key: "quantity", align: "center" },
        { header: "Prix unit.", key: "unitPrice", format: "currency", align: "right" },
        { header: "Total", key: "total", format: "currency", align: "right" },
      ],
      rows: items.map((i) => ({
        product: i.productName,
        boxes: `${i.boxes || 0}`,
        quantity: `${i.quantity}`,
        unitPrice: i.cost,
        total: i.quantity * i.cost,
      })),
    })
  }

  if (isLoading || suppliersLoading || productsLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        Commande non trouvée
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {isEditable ? "Modifier le bon de commande" : "Voir le bon de commande"}
          </h2>
          <p className="text-muted-foreground">
            Order #{order.id?.slice(0, 8)} • {order.status.toUpperCase()}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/purchases")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Retour à la liste
        </Button>
      </div>

      {/* Summary Card */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Valeur totale
              </p>
              <p className="text-4xl font-black text-primary">{formatCurrency(total)}</p>
            </div>
            <div className="space-y-2 text-right">
              <div>
                <span className="font-bold text-lg">{items.length}</span> produits
              </div>
              <div>
                <span className="font-bold text-lg">{totalUnits}</span> bouteilles
              </div>
              <Badge variant="outline" className="mt-2">
                {order.status === "pending"
                  ? "Modifiable"
                  : order.status === "received"
                  ? "Reçu – verrouillé"
                  : "Annulé – archivé"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Supplier */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Détails de la commande
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-base font-semibold">Fournisseur</Label>
              {isEditable ? (
                <Select value={supplierId} onValueChange={setSupplierId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un fournisseur" />
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
              ) : (
                <div className="h-10 flex items-center px-3 border rounded-md bg-muted/50">
                  {suppliers.find((s) => s.id === supplierId)?.name || "Inconnu"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Produits / Articles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {isEditable && (
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Label>Ajouter un produit</Label>
                  <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un produit..." />
                    </SelectTrigger>
                    <SelectContent>
                      {purchasableProducts.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  onClick={addProduct}
                  disabled={!selectedProductId}
                  className="self-end"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter
                </Button>
              </div>
            )}

            {items.length > 0 ? (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Produit</TableHead>
                      <TableHead className="text-right w-44">Coût</TableHead>
                      <TableHead className="text-center w-56">Quantité</TableHead>
                      <TableHead className="text-right w-32">Sous-total</TableHead>
                      {isEditable && <TableHead className="w-12"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.productId}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell className="text-right">
                          {isEditable ? (
                            <div className="flex flex-col gap-1 items-end">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-muted-foreground whitespace-nowrap">Unité :</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.cost}
                                  onChange={(e) => updateUnitCost(item.productId, e.target.value)}
                                  className="w-24 text-right h-8"
                                />
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-muted-foreground whitespace-nowrap">Caisse :</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={(item.cost * (item.quantityPerBox || 1)).toFixed(2)}
                                  onChange={(e) => updateBoxCost(item.productId, e.target.value)}
                                  className="w-24 text-right h-8"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-end">
                              <span className="font-semibold">{formatCurrency(item.cost)}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatCurrency(item.cost * (item.quantityPerBox || 1))} / box
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isEditable ? (
                            <div className="flex flex-col gap-1 items-center">
                              <div className="flex items-center justify-center gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  value={item.boxes || 0}
                                  onChange={(e) => updateBoxes(item.productId, Number(e.target.value))}
                                  className="w-20 text-center h-8"
                                />
                                <span className="text-sm font-medium">Caisses</span>
                              </div>
                              <div className="text-xs text-muted-foreground flex gap-1.5 items-center mt-0.5">
                                <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                                  {item.quantityPerBox || 1} bouteilles/caisse
                                </Badge>
                                <span>=</span>
                                <span className="font-semibold text-foreground">{item.quantity} total bouteilles</span>
                              </div>
                            </div>
                          ) : (
                            <span className="font-semibold">{item.quantity} bouteilles</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.quantity * item.cost)}
                        </TableCell>
                        {isEditable && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => removeItem(item.productId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center border border-dashed rounded-lg text-muted-foreground">
                <Package className="h-10 w-10 mb-3 opacity-60" />
                <p className="font-medium">Aucun article dans cette commande</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/purchases")}
            className="flex-1"
          >
            Retour à la liste
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handlePrint}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            Imprimer
          </Button>

          {isEditable ? (
            <>
              <Button
                type="submit"
                disabled={isSubmitting || !supplierId || items.length === 0}
                className="flex-1 gap-2 bg-primary hover:bg-primary/90"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Enregistrer les modifications
              </Button>

              <Button
                type="button"
                variant="destructive"
                onClick={handleCancelOrder}
                disabled={isActionLoading}
                className="gap-2"
              >
                {isActionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                <XCircle className="h-4 w-4" />
                Annuler la commande
              </Button>

              <Button
                type="button"
                className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700"
                onClick={handleReceiveOrder}
                disabled={isActionLoading}
              >
                {isActionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                <CheckCircle2 className="h-4 w-4" />
                Marquer comme reçu
              </Button>
            </>
          ) : (
            <Button variant="secondary" className="flex-1" disabled>
              {order.status === "received" ? "Commande déjà reçue" : "Commande annulée"}
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
