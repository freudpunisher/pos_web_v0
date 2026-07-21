"use client"

import { useState, useMemo } from "react"
import { useTables } from "@/hooks/use-tables"
import { useOrders } from "@/hooks/use-orders"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Table2, Users, Loader2, Utensils, Clock } from "lucide-react"
import { useRouter } from "next/navigation"

export default function TablesPage() {
    const router = useRouter()
    const { tables, loading, createTable, updateTable, deleteTable } = useTables()
    const { orders } = useOrders()
    const [showAdd, setShowAdd] = useState(false)
    const [form, setForm] = useState({ number: "", capacity: "4", section: "" })

    const occupiedTableIds = useMemo(() => {
        return new Set(
            orders
                .filter((o) => !["paid", "cancelled"].includes(o.orderStatus) && o.tableId)
                .map((o) => o.tableId),
        )
    }, [orders])

    const tableStatus = useMemo(() => {
        return tables.map((t) => ({
            ...t,
            isOccupied: occupiedTableIds.has(t.id),
        }))
    }, [tables, occupiedTableIds])

    const sections = useMemo(() => {
        const s = new Set<string>()
        tables.forEach((t) => { if (t.section) s.add(t.section) })
        return Array.from(s).sort()
    }, [tables])

    if (loading) {
        return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    const handleAdd = async () => {
        await createTable({ number: parseInt(form.number), capacity: parseInt(form.capacity), section: form.section || undefined })
        setShowAdd(false)
        setForm({ number: "", capacity: "4", section: "" })
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Tables</h2>
                    <p className="text-muted-foreground">Gestion des salles</p>
                </div>
                <Button onClick={() => setShowAdd(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Ajouter une table
                </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {sections.map((section) => null)}
            </div>

            {sections.length > 0 && (
                <div className="flex gap-2 mb-2">
                    {sections.map((section) => (
                        <Badge key={section} variant="outline" className="text-xs">
                            {section}
                        </Badge>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {tableStatus.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center py-12 text-muted-foreground">
                        <Table2 className="h-12 w-12 mb-3 opacity-50" />
                        <p>Aucune table configurée</p>
                        <p className="text-sm">Ajoutez votre première table pour commencer</p>
                    </div>
                ) : (
                    tableStatus.map((table) => (
                        <Card
                            key={table.id}
                            className={`cursor-pointer transition-all hover:shadow-md ${
                                table.isOccupied
                                    ? "border-destructive/50 bg-destructive/5"
                                    : "border-green-500/30 bg-green-500/5"
                            }`}
                            onClick={() => {
                                if (table.isOccupied) {
                                    const activeOrder = orders.find(
                                        (o) => o.tableId === table.id && !["paid", "cancelled"].includes(o.orderStatus),
                                    )
                                    if (activeOrder) router.push(`/orders/${activeOrder.id}`)
                                }
                            }}
                        >
                            <CardContent className="p-4 text-center">
                                <div className="flex justify-center mb-2">
                                    <div
                                        className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                                            table.isOccupied ? "bg-destructive/20" : "bg-green-500/20"
                                        }`}
                                    >
                                        <Table2 className={`h-6 w-6 ${table.isOccupied ? "text-destructive" : "text-green-600"}`} />
                                    </div>
                                </div>
                                <p className="text-lg font-bold">T{table.number}</p>
                                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                                    <Users className="h-3 w-3" /> {table.capacity}
                                </div>
                                <Badge
                                    variant="outline"
                                    className={`mt-2 ${table.isOccupied ? "text-destructive border-destructive/30" : "text-green-600 border-green-500/30"}`}
                                >
                                    {table.isOccupied ? "Occupée" : "Libre"}
                                </Badge>
                                {table.section && (
                                    <p className="text-xs text-muted-foreground mt-1">{table.section}</p>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <Dialog open={showAdd} onOpenChange={setShowAdd}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ajouter une table</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Numéro de table</Label>
                            <Input
                                type="number"
                                value={form.number}
                                onChange={(e) => setForm({ ...form, number: e.target.value })}
                                placeholder="ex: 1"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Capacité</Label>
                            <Input
                                type="number"
                                value={form.capacity}
                                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Section (optionnelle)</Label>
                            <Input
                                value={form.section}
                                onChange={(e) => setForm({ ...form, section: e.target.value })}
                                placeholder="ex: Terrasse, Intérieur, VIP"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAdd(false)}>Annuler</Button>
                        <Button onClick={handleAdd} disabled={!form.number}>Ajouter</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
