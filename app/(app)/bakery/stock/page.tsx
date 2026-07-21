"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { Loader2, Package, Plus } from "lucide-react"

export default function BakeryStockPage() {
  const { user } = useAuth()
  const [stockItems, setStockItems] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedProductId, setSelectedProductId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fetchStock = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/bakery/stock")
      if (res.ok) {
        setStockItems(await res.json())
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    const res = await fetch("/api/products")
    if (res.ok) {
      const data = await res.json()
      setProducts(data.filter((p: any) => p.type === "finished_good" && p.sector === "Boulangerie"))
    }
  }

  useEffect(() => {
    fetchStock()
    fetchProducts()
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return stockItems.filter((i) => i.name?.toLowerCase().includes(q) || i.sku?.toLowerCase().includes(q))
  }, [stockItems, search])

  const totalUnits = filtered.reduce((sum, i) => sum + Number(i.quantityOnHand || 0), 0)

  const handleAdd = async () => {
    const qty = Number(quantity || 0)
    if (!selectedProductId || qty <= 0) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/bakery/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProductId,
          quantity: qty,
          userId: user?.id,
          note,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to add stock")
      }
      setSelectedProductId("")
      setQuantity("")
      setNote("")
      fetchStock()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Stock Boulangerie</h2>
        <p className="text-muted-foreground">Produits finis disponibles pour la vente.</p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Ajouter une production
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Produit fini</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un produit" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.unit || "unit"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantité produite</Label>
              <Input
                type="number"
                min="0"
                step="0.001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Note (optionnel)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: Production du jour" />
            </div>
          </div>
          <Button onClick={handleAdd} disabled={!selectedProductId || !quantity || submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Plus className="mr-2 h-4 w-4" />
            Ajouter au stock
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Liste des produits finis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="text-sm text-muted-foreground">
            Total unités: <span className="font-semibold">{totalUnits}</span>
          </div>
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead>SKU</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Unité</TableHead>
                  <TableHead className="text-right">Quantité</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      Aucun produit fini trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item) => (
                    <TableRow key={item.stockId} className="border-border">
                      <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.unit || "unit"}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{Number(item.quantityOnHand || 0)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
