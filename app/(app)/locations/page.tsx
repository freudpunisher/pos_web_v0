"use client"

import { useState } from "react"
import { useLocations } from "@/hooks/use-locations"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Warehouse, BarChart3, Loader2 } from "lucide-react"

export default function LocationsPage() {
    const { locations, loading, createLocation } = useLocations()
    const [showAdd, setShowAdd] = useState(false)
    const [form, setForm] = useState({ name: "", type: "bar" })

    const handleAdd = async () => {
        await createLocation(form)
        setShowAdd(false)
        setForm({ name: "", type: "bar" })
    }

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Emplacements</h2>
                    <p className="text-muted-foreground">Gérer les emplacements d'entrepôt et de bar</p>
                </div>
                <Button onClick={() => setShowAdd(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Ajouter un emplacement
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {locations.map((loc: any) => (
                    <Card key={loc.id} className="border-border/50">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${loc.type === "principal" ? "bg-primary/20" : "bg-accent/20"}`}>
                                        {loc.type === "principal" ? <Warehouse className="h-5 w-5 text-primary" /> : <BarChart3 className="h-5 w-5 text-accent" />}
                                    </div>
                                    <div>
                                        <p className="font-semibold">{loc.name}</p>
                                        <Badge variant="outline" className="text-xs mt-1">
                                            {loc.type === "principal" ? "Stock principal" : "Secondaire"}
                                        </Badge>
                                    </div>
                                </div>
                                <Badge className={loc.isActive ? "bg-green-500/20 text-green-700" : "bg-red-500/20 text-red-700"}>
                                    {loc.isActive ? "Actif" : "Inactif"}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={showAdd} onOpenChange={setShowAdd}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Ajouter un emplacement</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="p. ex. Bar principal" />
                        </div>
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="principal">Stock principal (Entrepôt)</SelectItem>
                                    <SelectItem value="transitional">Stock transitoire</SelectItem>
                                    <SelectItem value="bar">Bar (Point de service)</SelectItem>
                                    <SelectItem value="kitchen">Cuisine</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAdd(false)}>Annuler</Button>
                        <Button onClick={handleAdd} disabled={!form.name}>Ajouter</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
