"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { formatCurrency } from "@/lib/mock-data"
import { useClients } from "@/hooks/use-clients"
import { toast } from "sonner"
import { Banknote, CreditCard, Loader2, Plus, User, X } from "lucide-react"

interface PaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: any
  onPay: (data: { paymentMethod: "cash" | "credit"; clientId?: string }) => Promise<void>
}

export function PaymentDialog({ open, onOpenChange, order, onPay }: PaymentDialogProps) {
  const { clients, createClient } = useClients()
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "credit">("cash")
  const [clientId, setClientId] = useState("")
  const [paying, setPaying] = useState(false)
  const [showNewClient, setShowNewClient] = useState(false)
  const [newClient, setNewClient] = useState({ name: "", email: "", phone: "", address: "" })
  const [creating, setCreating] = useState(false)

  const activeClients = clients.filter((c: any) => c.isActive !== false)

  const reset = () => {
    setPaymentMethod("cash")
    setClientId("")
    setShowNewClient(false)
    setNewClient({ name: "", email: "", phone: "", address: "" })
  }

  const handleCreateClient = async () => {
    if (!newClient.name || !newClient.email || !newClient.phone || !newClient.address) {
      toast.error("Tous les champs sont requis")
      return
    }
    setCreating(true)
    try {
      const created = await createClient(newClient)
      setClientId(created.id)
      setShowNewClient(false)
      setNewClient({ name: "", email: "", phone: "", address: "" })
      toast.success("Client créé")
    } catch (err: any) {
      toast.error(err.message || "Échec de la création du client")
    } finally {
      setCreating(false)
    }
  }

  const handlePay = async () => {
    if (paymentMethod === "credit" && !clientId) {
      toast.error("Sélectionnez un client pour le paiement à crédit")
      return
    }
    setPaying(true)
    try {
      await onPay({ paymentMethod, clientId: paymentMethod === "credit" ? clientId : undefined })
      reset()
    } finally {
      setPaying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) reset(); onOpenChange(open) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Traiter le paiement</DialogTitle>
          <DialogDescription>
            Commande #{order?.id?.slice(0, 8)} &middot; {order?.table ? `Table ${order.table.number || order.table}` : "À emporter"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {order?.items?.map((item: any) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>{item.quantity}x {item.productName}</span>
              <span>{formatCurrency(Number(item.price) * item.quantity)}</span>
            </div>
          ))}

          <Separator />

          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatCurrency(Number(order?.total || 0))}</span>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Mode de paiement</label>
            <div className="flex gap-2">
              <Button
                variant={paymentMethod === "cash" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setPaymentMethod("cash")}
              >
                <Banknote className="h-4 w-4 mr-2" /> Espèces
              </Button>
              <Button
                variant={paymentMethod === "credit" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setPaymentMethod("credit")}
              >
                <CreditCard className="h-4 w-4 mr-2" /> Crédit
              </Button>
            </div>
          </div>

          {paymentMethod === "credit" && (
            <div className="space-y-3 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Client</label>
                <Button size="sm" variant="ghost" onClick={() => setShowNewClient(!showNewClient)}>
                  {showNewClient ? <X className="h-3.5 w-3.5 mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                  {showNewClient ? "Annuler" : "Nouveau client"}
                </Button>
              </div>

              {showNewClient ? (
                <div className="space-y-2">
                  <Input
                    placeholder="Nom"
                    value={newClient.name}
                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={newClient.email}
                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  />
                  <Input
                    placeholder="Téléphone"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  />
                  <Input
                    placeholder="Adresse"
                    value={newClient.address}
                    onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                  />
                  <Button size="sm" className="w-full" onClick={handleCreateClient} disabled={creating}>
                    {creating && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                    Créer le client
                  </Button>
                </div>
              ) : (
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeClients.length === 0 ? (
                      <SelectItem value="none" disabled>Aucun client trouvé</SelectItem>
                    ) : (
                      activeClients.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5" />
                            {c.name}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false) }}>
            Annuler
          </Button>
          <Button onClick={handlePay} disabled={paying}>
            {paying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {paying ? "Traitement..." : `Payer ${formatCurrency(Number(order?.total || 0))}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
