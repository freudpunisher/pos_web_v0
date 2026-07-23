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
import { Plus, Warehouse, Store, MapPin, Package, Loader2, Edit, Trash2 } from "lucide-react"
import { toast } from "sonner"

const LOCATION_TYPES = ["primary", "store", "branch", "delivery_point"] as const
const LOCATION_LABELS: Record<string, string> = {
    primary: "Principal",
    store: "Magasin",
    branch: "Succursale",
    delivery_point: "Point de livraison",
}

const LOCATION_ICONS: Record<string, any> = {
    primary: Warehouse,
    store: Store,
    branch: MapPin,
    delivery_point: Package,
}

export default function LocationsPage() {
    const { locations, loading, createLocation, updateLocation, deleteLocation } = useLocations()
    const [showAdd, setShowAdd] = useState(false)
    const [editLocation, setEditLocation] = useState<any>(null)
    const [form, setForm] = useState({ name: "", type: "store" as string })

    const handleAdd = async () => {
        try {
            await createLocation(form)
            setShowAdd(false)
            setForm({ name: "", type: "store" })
            toast.success("Emplacement créé")
        } catch {
            toast.error("Erreur lors de la création")
        }
    }

    const handleUpdate = async () => {
        if (!editLocation) return
        try {
            await updateLocation(editLocation.id, { name: editLocation.name, type: editLocation.type, isActive: editLocation.isActive })
            setEditLocation(null)
            toast.success("Emplacement mis à jour")
        } catch {
            toast.error("Erreur lors de la mise à jour")
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Supprimer cet emplacement ?")) return
        try {
            await deleteLocation(id)
            toast.success("Emplacement supprimé")
        } catch {
            toast.error("Erreur lors de la suppression")
        }
    }

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Emplacements</h2>
                    <p className="text-muted-foreground">Gérer les entrepôts, magasins, succursales et points de livraison</p>
                </div>
                <Button onClick={() => setShowAdd(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Ajouter
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {locations.map((loc: any) => {
                    const Icon = LOCATION_ICONS[loc.type] || Store
                    return (
                        <Card key={loc.id} className="border-border/50">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/20">
                                            <Icon className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-semibold">{loc.name}</p>
                                            <Badge variant="outline" className="text-xs mt-1">
                                                {LOCATION_LABELS[loc.type] || loc.type}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge className={loc.isActive ? "bg-green-500/20 text-green-700" : "bg-red-500/20 text-red-700"}>
                                            {loc.isActive ? "Actif" : "Inactif"}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditLocation({ ...loc })}>
                                        <Edit className="h-3 w-3 mr-1" /> Modifier
                                    </Button>
                                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDelete(loc.id)}>
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Add Dialog */}
            <Dialog open={showAdd} onOpenChange={setShowAdd}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Ajouter un emplacement</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nom</Label>
                            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="p. ex. Magasin Central" />
                        </div>
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="primary">Principal</SelectItem>
                                    <SelectItem value="store">Magasin</SelectItem>
                                    <SelectItem value="branch">Succursale</SelectItem>
                                    <SelectItem value="delivery_point">Point de livraison</SelectItem>
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

            {/* Edit Dialog */}
            <Dialog open={!!editLocation} onOpenChange={() => setEditLocation(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Modifier l&apos;emplacement</DialogTitle></DialogHeader>
                    {editLocation && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Nom</Label>
                                <Input value={editLocation.name} onChange={(e) => setEditLocation({ ...editLocation, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select value={editLocation.type} onValueChange={(v) => setEditLocation({ ...editLocation, type: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="primary">Principal</SelectItem>
                                        <SelectItem value="store">Magasin</SelectItem>
                                        <SelectItem value="branch">Succursale</SelectItem>
                                        <SelectItem value="delivery_point">Point de livraison</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-3">
                                <Label>Actif</Label>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={editLocation.isActive}
                                    onClick={() => setEditLocation({ ...editLocation, isActive: !editLocation.isActive })}
                                    className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editLocation.isActive ? "translate-x-6 bg-primary" : "translate-x-1 bg-muted"}`} />
                                </button>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditLocation(null)}>Annuler</Button>
                        <Button onClick={handleUpdate}>Sauvegarder</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
