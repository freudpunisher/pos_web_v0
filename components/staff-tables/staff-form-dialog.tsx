"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"

interface StaffFormDialogProps {
  staff?: any | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => Promise<void>
}

export function StaffFormDialog({ staff, open, onOpenChange, onSubmit }: StaffFormDialogProps) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "cashier", password: "", avatar: "" })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (staff) {
      setForm({ name: staff.name || "", email: staff.email || "", phone: staff.phone || "", role: staff.role || "cashier", password: "", avatar: staff.avatar || "" })
    } else {
      setForm({ name: "", email: "", phone: "", role: "cashier", password: "", avatar: "" })
    }
  }, [staff, open])

  const handleSubmit = async () => {
    if (!form.name || !form.email) return
    setSaving(true)
    try {
      const data: any = { name: form.name, email: form.email, phone: form.phone || undefined, role: form.role, avatar: form.avatar || undefined }
      if (!staff && form.password) data.password = form.password
      await onSubmit(data)
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{staff ? "Modifier le personnel" : "Ajouter du personnel"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nom</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nom complet" />
          </div>
          <div className="space-y-2">
            <Label>Courriel</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
          </div>
          <div className="space-y-2">
            <Label>Téléphone</Label>
            <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+257 XX XX XX XX" />
          </div>
          <div className="space-y-2">
            <Label>Rôle</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cashier">Caissier</SelectItem>
                <SelectItem value="manager">Gérant</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{staff ? "Nouveau mot de passe (laisser vide pour conserver)" : "Mot de passe"}</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={staff ? "Laisser vide pour conserver" : "Minimum 6 caractères"} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!form.name || !form.email || (!staff && !form.password) || saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {staff ? "Enregistrer" : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
