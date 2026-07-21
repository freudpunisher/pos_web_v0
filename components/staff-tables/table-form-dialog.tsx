"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

interface TableFormDialogProps {
  table?: any | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => Promise<void>
}

export function TableFormDialog({ table, open, onOpenChange, onSubmit }: TableFormDialogProps) {
  const [form, setForm] = useState({ number: "", capacity: "4", section: "" })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (table) {
      setForm({ number: table.number?.toString() || "", capacity: table.capacity?.toString() || "4", section: table.section || "" })
    } else {
      setForm({ number: "", capacity: "4", section: "" })
    }
  }, [table, open])

  const handleSubmit = async () => {
    if (!form.number) return
    setSaving(true)
    try {
      await onSubmit({ number: parseInt(form.number), capacity: parseInt(form.capacity), section: form.section || undefined })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{table ? "Edit Table" : "Add Table"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Table Number</Label>
            <Input type="number" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="e.g. 1" />
          </div>
          <div className="space-y-2">
            <Label>Capacity</Label>
            <Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Section (optional)</Label>
            <Input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="e.g. Terrace, Indoor, VIP" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!form.number || saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {table ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
