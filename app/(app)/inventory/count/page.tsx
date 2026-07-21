"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { ClipboardList, Plus, Calendar, User, Loader2, ArrowRight, CheckCircle2, Clock, History as HistoryIcon, Warehouse } from "lucide-react"
import { useInventorySessions } from "@/hooks/use-inventory-sessions"
import { useProducts } from "@/hooks/use-products"
import { useLocations } from "@/hooks/use-locations"
import { useAuth } from "@/lib/auth-context"

export default function InventoryCountPage() {
    const router = useRouter()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isStarting, setIsStarting] = useState(false)
    const [formData, setFormData] = useState({
        notes: "",
        locationId: "",
        initializePhysicalFromLogical: true,
        initialProductId: "",
        initialPhysicalQty: "",
    })

    const { sessions, loading, startSession } = useInventorySessions()
    const { user } = useAuth()
    const { products } = useProducts()
    const { locations } = useLocations()
    const isBakeryUser = user?.role === "cashier_bakery" || user?.role === "supervisor_bakery" || user?.role === "production_bakery"
    const selectableProducts = useMemo(() => {
        if (!isBakeryUser) return products
        return products.filter((p: any) => String(p.sector || "").toLowerCase() === "boulangerie")
    }, [products, isBakeryUser])

    const handleStartSession = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsStarting(true)
        try {
            if (!user?.id) {
                throw new Error("Utilisateur non connecté.")
            }
            const initialQty = Number.parseFloat(formData.initialPhysicalQty)
            if (formData.initialProductId && (!Number.isFinite(initialQty) || initialQty < 0)) {
                throw new Error("Veuillez saisir une quantité physique valide pour le produit sélectionné.")
            }

            const session = await startSession({
                ...formData,
                countedBy: user.id,
            })
            if (formData.initialProductId && Number.isFinite(initialQty) && initialQty >= 0) {
                const response = await fetch(`/api/inventory-sessions/${session.id}/adjust-item`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        productId: formData.initialProductId,
                        physicalQuantity: initialQty,
                    }),
                })
                if (!response.ok) {
                    const data = await response.json().catch(() => ({}))
                    throw new Error(data?.error || "Failed to apply initial product quantity")
                }
            }
            setFormData({
                notes: "",
                locationId: "",
                initializePhysicalFromLogical: true,
                initialProductId: "",
                initialPhysicalQty: "",
            })
            setIsDialogOpen(false)
            router.push(`/inventory/count/${session.id}`)
        } catch (error: any) {
            console.error("Failed to start session:", error)
            alert(error?.message || "Échec de création de la session d'inventaire.")
        } finally {
            setIsStarting(false)
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "reconciled":
                return <Badge className="bg-accent/20 text-accent font-bold ring-1 ring-accent/30 lowercase"><CheckCircle2 className="mr-1 h-3 w-3" /> Réconcilié</Badge>
            case "completed":
                return <Badge className="bg-primary/20 text-primary font-bold ring-1 ring-primary/30 lowercase">Terminé</Badge>
            case "in_progress":
                return <Badge className="bg-warning/20 text-warning font-bold ring-1 ring-warning/30 lowercase"><Clock className="mr-1 h-3 w-3" /> En cours</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Comptages d'inventaire physique</h2>
                    <p className="text-muted-foreground">Démarrer et gérer les sessions de vérification physique du stock</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                            <Plus className="mr-2 h-4 w-4" />
                            Nouvelle session de comptage
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <form onSubmit={handleStartSession}>
                            <DialogHeader>
                                <DialogTitle>Démarrer une session de comptage</DialogTitle>
                                <DialogDescription>
                                    Session créée avec l'utilisateur connecté.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="rounded-lg border border-border/50 bg-secondary/20 p-3 text-sm">
                                    <span className="text-muted-foreground">Agent:</span>{" "}
                                    <span className="font-semibold">{user?.name || "Utilisateur connecté"}</span>
                                </div>
                                <div className="space-y-2">
                                    <Label>Notes (Optionnel)</Label>
                                    <Textarea
                                        placeholder="Motif du comptage, instructions spécifiques, etc."
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        className="h-24 resize-none"
                                    />
                                </div>
                                <div className="rounded-lg border border-border/50 bg-secondary/20 p-3 space-y-3">
                                    <p className="text-sm font-semibold">Emplacement de l'inventaire</p>
                                    <Select
                                        value={formData.locationId}
                                        onValueChange={(val) => setFormData({ ...formData, locationId: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sélectionner un emplacement (optionnel)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {locations.map((loc: any) => (
                                                <SelectItem key={loc.id} value={loc.id}>
                                                    <div className="flex items-center gap-2">
                                                        <Warehouse className="h-4 w-4" />
                                                        {loc.name}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Limite l'inventaire aux produits de cet emplacement. Laissez vide pour inventorier tous les produits.
                                    </p>
                                </div>
                                <div className="rounded-lg border border-border/50 bg-secondary/20 p-3 space-y-3">
                                    <p className="text-sm font-semibold">Ajout rapide (optionnel)</p>
                                    <div className="space-y-2">
                                        <Label>Produit</Label>
                                        <Select
                                            value={formData.initialProductId}
                                            onValueChange={(val) => setFormData({ ...formData, initialProductId: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner un produit" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {selectableProducts.map((p: any) => (
                                                    <SelectItem key={p.id} value={p.id}>
                                                        {p.name} - {p.sku}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Quantité physique</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.001"
                                            placeholder="0"
                                            value={formData.initialPhysicalQty}
                                            onChange={(e) => setFormData({ ...formData, initialPhysicalQty: e.target.value })}
                                            disabled={!formData.initialProductId}
                                        />
                                    </div>
                                </div>
                                <div className="rounded-lg border border-border/50 bg-secondary/20 p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <Label className="text-sm font-semibold">Initialiser stock physique = stock logique</Label>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Recommandé pour pointer uniquement les écarts (pertes/surplus).
                                            </p>
                                        </div>
                                        <Switch
                                            checked={formData.initializePhysicalFromLogical}
                                            onCheckedChange={(checked) =>
                                                setFormData({ ...formData, initializePhysicalFromLogical: checked })
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Annuler
                                </Button>
                                <Button type="submit" disabled={isStarting || !user?.id}>
                                    {isStarting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Commencer le comptage
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="border-border/50 shadow-xl overflow-hidden">
                <CardHeader className="bg-secondary/10 border-b border-border/50">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <HistoryIcon className="h-5 w-5 text-primary" />
                        Historique des sessions
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-secondary/5 border-border/50">
                                <TableHead className="py-4 px-6 font-bold">ID Session</TableHead>
                                <TableHead className="py-4 px-6 font-bold">Date</TableHead>
                                <TableHead className="py-4 px-6 font-bold">Emplacement</TableHead>
                                <TableHead className="py-4 px-6 font-bold">Personnel</TableHead>
                                <TableHead className="py-4 px-6 font-bold">Articles</TableHead>
                                <TableHead className="py-4 px-6 font-bold">Statut</TableHead>
                                <TableHead className="py-4 px-6 font-bold text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-32 text-center">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                                        <p className="mt-2 text-sm text-muted-foreground">Récupération des sessions...</p>
                                    </TableCell>
                                </TableRow>
                            )}
                            {!loading && sessions.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground italic">
                                        Aucune session de comptage enregistrée.
                                    </TableCell>
                                </TableRow>
                            )}
                            {sessions.map((session) => (
                                <TableRow key={session.id} className="border-border/50 hover:bg-secondary/5 group transition-colors">
                                    <TableCell className="font-mono text-xs opacity-50 py-4 px-6">
                                        {session.id.substring(0, 8)}
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <Calendar className="h-3 w-3 text-primary" />
                                            {new Date(session.countDate).toLocaleDateString()}
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <Warehouse className="h-3 w-3 text-muted-foreground" />
                                            {session.location?.name || "Tous"}
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <User className="h-3 w-3 text-primary" />
                                            {session.user?.name}
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        <Badge variant="outline" className="font-mono font-bold">{session.items?.length || 0}</Badge>
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        {getStatusBadge(session.status)}
                                    </TableCell>
                                    <TableCell className="text-right py-4 px-6">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="group/btn hover:text-primary transition-all font-bold"
                                            onClick={() => router.push(`/inventory/count/${session.id}`)}
                                        >
                                            {session.status === "reconciled" ? "Voir les détails" : "Continuer le comptage"}
                                            <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
