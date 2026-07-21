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
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "waiter", password: "", avatar: "" })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (staff) {
      setForm({ name: staff.name || "", email: staff.email || "", phone: staff.phone || "", role: staff.role || "waiter", password: "", avatar: staff.avatar || "" })
    } else {
      setForm({ name: "", email: "", phone: "", role: "waiter", password: "", avatar: "" })
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
          <DialogTitle>{staff ? "Edit Staff" : "Add Staff"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+257 XX XX XX XX" />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="waiter">Waiter</SelectItem>
                <SelectItem value="cashier">Cashier</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{staff ? "New Password (leave blank to keep)" : "Password"}</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={staff ? "Leave blank to keep" : "Min 6 characters"} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!form.name || !form.email || (!staff && !form.password) || saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {staff ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
