"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCart } from "@/lib/cart-context"
import { formatCurrency } from "@/lib/mock-data"
import { Minus, Plus, Trash2, ShoppingCart, User, Receipt, Banknote, X, Loader2, ClipboardList } from "lucide-react"
import { useClients } from "@/hooks/use-clients"
import { useTransactions } from "@/hooks/use-transactions"
import { useAuth } from "@/lib/auth-context"
import { useSettings } from "@/hooks/use-settings"
import { toast } from "sonner"

interface CartPanelProps {
  orderMode: "dinein" | "takeaway" | "counter"
  onCreateOrder?: () => void
  creatingOrder?: boolean
}

export function CartPanel({ orderMode, onCreateOrder, creatingOrder = false }: CartPanelProps) {
  const {
    items,
    selectedClient,
    setSelectedClient,
    updateQuantity,
    updateDiscount,
    removeItem,
    clearCart,
    subtotal,
    discount,
    tax,
    total,
    taxRate,
    setTaxRate,
    productStockMap,
  } = useCart()

  const { user } = useAuth()
  const { settings } = useSettings()
  const { clients, loading: clientsLoading } = useClients()
  const { processTransaction, loading: processing } = useTransactions()

  const [showCheckout, setShowCheckout] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "credit">("cash")
  const [lastTransactionId, setLastTransactionId] = useState<string | null>(null)
  const [lastReference, setLastReference] = useState<string | null>(null)
  const receiptRef = useRef<HTMLDivElement>(null)

  const isCreditExceeded = !!(selectedClient && paymentMethod === "credit" &&
    (Number.parseFloat(String(selectedClient.creditBalance)) + total > Number.parseFloat(String(selectedClient.creditLimit))))

  const maxQtyForItem = (item: CartItem): number => {
    if (item.productType === "food" || !item.trackStock) return Infinity
    const totalStock = productStockMap[item.id] ?? 0
    if (totalStock <= 0) return 0
    const cf = item.sellingUnits?.find((s) => s.id === item.sellingUnitId)?.conversionFactor ?? 1
    const otherConsumption = items
      .filter((i) => i.id === item.id && i.sellingUnitId !== item.sellingUnitId)
      .reduce((sum, i) => {
        const icf = i.sellingUnits?.find((s) => s.id === i.sellingUnitId)?.conversionFactor ?? 1
        return sum + i.quantity * icf
      }, 0)
    const available = totalStock - otherConsumption
    return available <= 0 ? 0 : Math.floor(available / cf)
  }

  const handleCheckout = async () => {
    if (!user) {
      toast.error("Vous devez être connecté pour effectuer une vente")
      return
    }

    try {
      const transactionData = {
        type: "sale",
        total,
        paymentMethod,
        clientId: selectedClient?.id,
        userId: user.id || "2f83e92d-b719-4c15-919f-e2ff7640f1c4", // Use current user ID or real admin fallback
        items: items.map(item => ({
          productId: item.id,
          productName: item.sellingUnitName ? `${item.name} (${item.sellingUnitName})` : item.name,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount,
          sellingUnitId: item.sellingUnitId || null
        }))
      }

      const result = await processTransaction(transactionData)
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("pos:transaction-completed"))
      }
      setLastTransactionId(result.id)
      setLastReference(result.reference || null)
      setShowReceipt(true)
      setShowCheckout(false)

      const isCashLike = ["cash", "card"].includes(paymentMethod)
      if (isCashLike && result?.paymentCreated) {
        toast.success(`Transaction ${result.invoiceRef} validée et ligne de paiement créée (${paymentMethod})`)
      } else if (isCashLike && !result?.paymentCreated) {
        toast.error(
          `Transaction créée, mais ligne de paiement absente (${result?.debug?.normalizedType || "sale"}/${result?.debug?.normalizedPaymentMethod || paymentMethod})`
        )
      } else {
        toast.success(`Transaction ${result.invoiceRef || "completed"} avec succès`)
      }
    } catch (error: any) {
      toast.error(error.message || "Échec du traitement de la transaction")
    }
  }

  const handleComplete = () => {
    setShowReceipt(false)
    clearCart()
    setLastTransactionId(null)
    setLastReference(null)
  }

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print()
    }
  }

  return (
    <>
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-area, #printable-area * {
              visibility: visible;
            }
            #printable-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            /* Hide print button itself if it was inside, but it's not here */
          }
        `}
      </style>
      <Card className="flex h-full flex-col border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Panier
              {items.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {items.reduce((sum, item) => sum + item.quantity, 0)}
                </Badge>
              )}
            </CardTitle>
            {items.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          <Select
            value={selectedClient?.id || "default"}
            onValueChange={(value) => {
              const client = clients.find((c: any) => c.id === value)
              setSelectedClient(client || null)
            }}
            disabled={clientsLoading}
          >
            <SelectTrigger className="mt-2">
              <User className="mr-2 h-4 w-4" />
              <SelectValue placeholder={clientsLoading ? "Chargement des clients..." : "Client libre"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Client libre</SelectItem>
              {clients.map((client: any) => (
                <SelectItem key={client.id} value={client.id}>
                  <div className="flex items-center justify-between gap-4">
                    <span>{client.name}</span>
                    {Number.parseFloat(client.creditBalance) > 0 && (
                      <Badge variant="outline" className="text-warning">
                        {formatCurrency(Number.parseFloat(client.creditBalance))} crédit
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-0">
          <div className="h-full overflow-y-auto px-4 py-2">
            {items.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center text-muted-foreground">
                <ShoppingCart className="mb-2 h-12 w-12 opacity-50" />
                <p>Le panier est vide</p>
                <p className="text-sm">Ajoutez des produits pour commencer</p>
              </div>
            ) : (
              <div className="space-y-3 pb-4">
                {items.map((item) => (
                  <div key={`${item.id}-${item.sellingUnitId || 'default'}`} className="rounded-lg border border-border bg-secondary/30 p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.sellingUnitName ? `${item.sku} · ${item.sellingUnitName}` : item.sku}
                        </p>
                        <p className="mt-1 font-semibold text-primary">{formatCurrency(item.price)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(item.id, item.sellingUnitId)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 bg-transparent"
                          onClick={() => updateQuantity(item.id, item.quantity - 1, item.sellingUnitId)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          min="1"
                          max={maxQtyForItem(item)}
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0
                            if (val >= 0) updateQuantity(item.id, val, item.sellingUnitId)
                          }}
                          className="h-7 w-14 text-center text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 bg-transparent"
                          onClick={() => updateQuantity(item.id, item.quantity + 1, item.sellingUnitId)}
                          disabled={item.quantity >= maxQtyForItem(item)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Remise % :</span>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={item.discount}
                          onChange={(e) => updateDiscount(item.id, Number.parseFloat(e.target.value) || 0)}
                          className="h-7 w-14 text-right text-xs"
                        />
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total ligne :</span>
                      <span className="font-medium">
                        {formatCurrency(item.price * item.quantity * (1 - item.discount / 100))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex-col gap-3 border-t border-border pt-4">
          <div className="w-full space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sous-total</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-destructive">
              <span>Discount</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Taxe (%)</span>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number.parseFloat(e.target.value) || 0)}
                  className="h-6 w-16 text-right text-xs"
                />
              </div>
              <span>{formatCurrency(tax)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="grid w-full gap-2">
            <Button
              className="w-full"
              size="lg"
              disabled={items.length === 0 || creatingOrder}
              onClick={onCreateOrder}
            >
              {creatingOrder ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ClipboardList className="mr-2 h-4 w-4" />
              )}
              {creatingOrder ? "Création..." : "Créer la commande"}
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Paiement</DialogTitle>
            <DialogDescription>Finaliser la transaction</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg border border-border bg-secondary/30 p-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Montant total</span>
                <span className="text-primary">{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mode de paiement</label>
              <div className="grid grid-cols-2 gap-2">
                {(["cash", "credit"] as const).map((method) => (
                  <Button
                    key={method}
                    variant={paymentMethod === method ? "default" : "outline"}
                    onClick={() => setPaymentMethod(method)}
                    className="capitalize"
                    disabled={method === "credit" && !selectedClient}
                  >
                    {method === "cash" && <Banknote className="mr-2 h-4 w-4" />}
                    {method === "credit" && <User className="mr-2 h-4 w-4" />}
                    {method === "cash" ? "Espèces" : "Crédit"}
                  </Button>
                ))}
              </div>
              {paymentMethod === "credit" && !selectedClient && (
                <p className="text-xs text-destructive">Sélectionnez un client pour utiliser le crédit</p>
              )}
            </div>

            {selectedClient && paymentMethod === "credit" && (
              <div className={`rounded-lg border p-3 ${isCreditExceeded ? 'border-destructive bg-destructive/10' : 'border-warning/50 bg-warning/10'}`}>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-medium">Client : {selectedClient.name}</p>
                  {isCreditExceeded && <Badge variant="destructive">Limite dépassée</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  Solde actuel : {formatCurrency(Number.parseFloat(String(selectedClient.creditBalance)))}
                </p>
                <p className="text-sm text-muted-foreground">
                  Limite de crédit : {formatCurrency(Number.parseFloat(String(selectedClient.creditLimit)))}
                </p>
                {isCreditExceeded && (
                  <p className="text-xs font-bold text-destructive mt-2 flex items-center gap-1">
                    <Trash2 className="h-3 w-3" /> La vente dépasse le crédit disponible !
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckout(false)} disabled={processing}>
              Annuler
            </Button>
            <Button onClick={handleCheckout} disabled={processing || (paymentMethod === "credit" && isCreditExceeded)}>
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isCreditExceeded ? "Limite de crédit dépassée" : "Finaliser la vente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Reçu
            </DialogTitle>
            <DialogDescription>Détails du reçu de transaction et résumé imprimable.</DialogDescription>
          </DialogHeader>

          <div id="printable-area" ref={receiptRef} className="rounded-lg border border-border bg-card p-4 font-mono text-sm">
            <div className="text-center mb-4">
              <img src="/assets/icon.png" alt="Logo" className="mx-auto max-h-12 mb-1" />
              {settings?.address && <p className="text-xs text-muted-foreground">{settings.address}</p>}
              {settings?.phone && <p className="text-xs text-muted-foreground">Tel: {settings.phone}</p>}
            </div>

            <Separator className="my-3" />

            <div className="space-y-1 mb-4">
              <p className="text-xs">
                Date : {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
              </p>
              <p className="text-xs font-bold tracking-wider">{lastReference || "BL-" + (lastTransactionId || "N/A").slice(0, 8).toUpperCase()}</p>
              {selectedClient && <p className="text-xs">Client : {selectedClient.name}</p>}
              <p className="text-xs">Paiement : {paymentMethod.toUpperCase()}</p>
            </div>

            <Separator className="my-3" />

            <div className="space-y-2 mb-4">
              {items.map((item) => (
                <div key={`${item.id}-${item.sellingUnitId || 'default'}`} className="flex justify-between text-xs">
                  <span>
                    {item.quantity}x {item.name}
                    {item.sellingUnitName ? ` (${item.sellingUnitName})` : ''}
                  </span>
                  <span>{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <Separator className="my-3" />

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
<span>Sous-total</span>
                 <span>{formatCurrency(subtotal)}</span>
               </div>
               <div className="flex justify-between text-xs">
                 <span>Remise</span>
                 <span>-{formatCurrency(discount)}</span>
               </div>
               <div className="flex justify-between text-xs">
                 <span>Taxe ({taxRate}%)</span>
                 <span>{formatCurrency(tax)}</span>
               </div>
               <div className="flex justify-between font-bold">
                 <span>TOTAL</span>
                 <span>{formatCurrency(total)}</span>
               </div>
             </div>

             <Separator className="my-3" />

             <p className="text-center text-xs text-muted-foreground">Merci pour votre achat !</p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleComplete}>
              Nouvelle vente
            </Button>
            <Button onClick={handlePrint}>
              <Receipt className="mr-2 h-4 w-4" />
              Imprimer le reçu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
