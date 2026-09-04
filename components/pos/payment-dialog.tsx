"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { formatCurrency } from "@/lib/mock-data"
import { useClients } from "@/hooks/use-clients"
import { Loader2, Banknote, User } from "lucide-react"

interface PaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: any
  onPay: (data: { paymentMethod: "cash"; clientId?: string }) => Promise<void>
}

export function PaymentDialog({ open, onOpenChange, order, onPay }: PaymentDialogProps) {
  const { clients } = useClients()
  const [clientId, setClientId] = useState("")
  const [paying, setPaying] = useState(false)

  const activeClients = clients.filter((c: any) => c.isActive !== false)

  const reset = () => {
    setClientId("")
  }

  const handlePay = async () => {
    setPaying(true)
    try {
      await onPay({ paymentMethod: "cash", clientId: clientId || undefined })
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
            Commande #{order?.id?.slice(0, 8)}
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
            <Button variant="outline" className="w-full justify-start" disabled>
              <Banknote className="h-4 w-4 mr-2" /> Espèces
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Client (optionnel)</label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Client libre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Client libre</SelectItem>
                {activeClients.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5" />
                      {c.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false) }}>
            Annuler
          </Button>
          <Button onClick={handlePay} disabled={paying}>
            {paying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {paying ? "Traitement..." : `Payer (Espèces) ${formatCurrency(Number(order?.total || 0))}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
