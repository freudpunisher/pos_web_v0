"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Plus,
    Search,
    Loader2,
    User,
    RefreshCw,
    History,
    FileText,
    Calendar,
    ArrowUpDown,
    Clock,
    Warehouse,
    Store,
    ArrowDownCircle,
    ArrowUpCircle,
    AlertTriangle,
    Undo2,
    ArrowRightLeft,
    Pencil,
    Package
} from "lucide-react"
import { useStock } from "@/hooks/use-stock"
import { useProducts } from "@/hooks/use-products"
import { useUsers } from "@/hooks/use-users"
import { useLocations } from "@/hooks/use-locations"
import { useAuth } from "@/lib/auth-context"

const adjustmentTypes: Record<string, { code: string; label: string; impact: string; color: string; icon: any }> = {
    stock_count:    { code: "COM", label: "Comptage physique",  impact: "+ / -", color: "bg-primary/20 text-primary border-primary/30", icon: Clock },
    damage:         { code: "DOM", label: "Dommage",            impact: "−",     color: "bg-red-500/20 text-red-600 border-red-500/30", icon: AlertTriangle },
    loss:           { code: "PER", label: "Perte",              impact: "−",     color: "bg-red-500/20 text-red-600 border-red-500/30", icon: ArrowUpCircle },
    return:         { code: "RET", label: "Retour",             impact: "+",     color: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30", icon: Undo2 },
    transfer:       { code: "TRA", label: "Transfert",          impact: "+ / -", color: "bg-blue-500/20 text-blue-600 border-blue-500/30", icon: ArrowRightLeft },
    correction:     { code: "COR", label: "Correction",         impact: "+ / -", color: "bg-orange-500/20 text-orange-600 border-orange-500/30", icon: Pencil },
    opening_stock:  { code: "STO", label: "Stock d'ouverture",  impact: "+",     color: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30", icon: Package },
}

export default function StockAdjustmentsPage() {
    const [search, setSearch] = useState("")
    const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const { adjustments, loading, createAdjustment } = useStock()
    const { products } = useProducts()
    const { users } = useUsers()
    const { locations } = useLocations()
    const { user: currentUser } = useAuth()

    const [formData, setFormData] = useState({
        productId: "",
        locationId: "",
        adjustmentType: "stock_count",
        quantityChange: "",
        reason: "",
        referenceNumber: "",
        notes: ""
    })

    const [locationStock, setLocationStock] = useState<any[]>([])

    useEffect(() => {
        if (!formData.locationId) {
            setLocationStock([])
            return
        }
        fetch(`/api/stock?locationId=${formData.locationId}`)
            .then(res => res.json())
            .then(data => setLocationStock(data))
            .catch(err => console.error("Failed to fetch location stock:", err))
    }, [formData.locationId])

    const productsAtLocation = useMemo(() => {
        if (!formData.locationId || locationStock.length === 0) return []
        const productIds = new Set(locationStock.map((s: any) => s.productId))
        return products.filter(p => productIds.has(p.id))
    }, [formData.locationId, locationStock, products])

    const filteredAdjustments = useMemo(() => {
        return adjustments.filter(adj =>
            adj.product.name.toLowerCase().includes(search.toLowerCase()) ||
            adj.reason.toLowerCase().includes(search.toLowerCase())
        )
    }, [adjustments, search])

    const handleAdjustmentSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        try {
            await createAdjustment({
                ...formData,
                createdBy: currentUser?.id || (users.length > 0 ? users[0].id : ""),
                quantityChange: parseInt(formData.quantityChange)
            })
            setShowAdjustmentDialog(false)
            setFormData({
                productId: "",
                locationId: "",
                adjustmentType: "stock_count",
                quantityChange: "",
                reason: "",
                referenceNumber: "",
                notes: ""
            })
        } catch (error) {
            console.error("Adjustment failed:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const getAdjustmentBadge = (type: string) => {
        const cfg = adjustmentTypes[type]
        if (!cfg) return <Badge variant="outline" className="font-bold uppercase text-[10px]">{type.replace("_", " ")}</Badge>
        return (
            <Badge variant="outline" className={`font-bold uppercase text-[10px] ${cfg.color}`}>
                <cfg.icon className="h-3 w-3 mr-1" />
                {cfg.code} — {cfg.label}
            </Badge>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Ajustements de stock</h2>
                    <p className="text-muted-foreground">Enregistrer et auditer les modifications manuelles de stock</p>
                </div>
                <Dialog open={showAdjustmentDialog} onOpenChange={setShowAdjustmentDialog}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                            <Plus className="mr-2 h-4 w-4" />
                            Enregistrer un ajustement
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] border-border/50 shadow-2xl backdrop-blur-xl bg-card/90">
                        <form onSubmit={handleAdjustmentSubmit}>
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <RefreshCw className="h-6 w-6 text-primary" />
                                    </div>
                                    Ajustement manuel
                                </DialogTitle>
                                <DialogDescription className="text-base italic">Assurez la précision lors de l'enregistrement des changements d'inventaire.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-6 py-6">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold text-primary/80">Emplacement</Label>
                                        <Select
                                            value={formData.locationId}
                                            onValueChange={(val) => setFormData({ ...formData, locationId: val, productId: "" })}
                                            required
                                        >
                                            <SelectTrigger className="bg-background/50 border-border/50 hover:border-primary/50 transition-colors">
                                                <SelectValue placeholder="Sélectionner l'emplacement" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {locations.map(l => (
                                                    <SelectItem key={l.id} value={l.id}>
                                                        <span className="flex items-center gap-2">
                                                            {l.type === "principal" ? <Warehouse className="h-3 w-3" /> : <Store className="h-3 w-3" />}
                                                            {l.name}
                                                        </span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold text-primary/80">Sélectionner le produit</Label>
                                        <Select
                                            value={formData.productId}
                                            onValueChange={(val) => setFormData({ ...formData, productId: val })}
                                            required
                                            disabled={!formData.locationId}
                                        >
                                            <SelectTrigger className="bg-background/50 border-border/50 hover:border-primary/50 transition-colors">
                                                <SelectValue placeholder={formData.locationId ? "Quel produit ajustez-vous ?" : "Sélectionnez d'abord un emplacement"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {productsAtLocation.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name} — <span className="opacity-50 text-xs">{p.sku}</span></SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-primary/80">Type d'ajustement</Label>
                                    <Select
                                        value={formData.adjustmentType}
                                        onValueChange={(val) => setFormData({ ...formData, adjustmentType: val })}
                                    >
                                        <SelectTrigger className="bg-background/50 border-border/50 hover:border-primary/50 transition-colors">
                                            <SelectValue />
                                        </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(adjustmentTypes).map(([key, cfg]) => (
                                            <SelectItem key={key} value={key}>
                                                <span className="flex items-center gap-2">
                                                    <cfg.icon className="h-4 w-4" />
                                                    <span className="font-mono font-bold">{cfg.code}</span>
                                                    <span>{cfg.label}</span>
                                                    <span className="text-xs opacity-50">({cfg.impact})</span>
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-primary/80">Changement de quantité</Label>
                                    <Input
                                        type="number"
                                        placeholder={formData.adjustmentType ? `${adjustmentTypes[formData.adjustmentType]?.impact} quantité` : "Quantité"}
                                        value={formData.quantityChange}
                                        onChange={(e) => setFormData({ ...formData, quantityChange: e.target.value })}
                                        className="bg-background/50 border-border/50 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-bold"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-primary/80">Motif</Label>
                                    <Input
                                        placeholder="Raison détaillée pour la piste d'audit"
                                        value={formData.reason}
                                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                        className="bg-background/50 border-border/50 hover:border-primary/50 transition-colors"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-primary/80">Réf # (Optionnel)</Label>
                                    <Input
                                        placeholder="ex. INV-2024"
                                        value={formData.referenceNumber}
                                        onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                                        className="bg-background/50 border-border/50"
                                    />
                                </div>
                            </div>
                            <DialogFooter className="bg-secondary/5 -mx-6 -mb-6 p-6 rounded-b-lg border-t border-border/50">
                                <Button type="button" variant="outline" onClick={() => setShowAdjustmentDialog(false)} className="border-border/50">
                                    Annuler
                                </Button>
                                <Button type="submit" disabled={isSubmitting} className="min-w-[170px] bg-gradient-to-r from-primary to-primary/80 hover:shadow-primary/30 shadow-lg transition-all">
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                    Synchroniser le stock
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="border-border/50 shadow-2xl overflow-hidden backdrop-blur-md bg-card/70 border-t-4 border-t-primary/20">
                <CardHeader className="border-b border-border/50 bg-secondary/10 py-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <CardTitle className="text-xl font-black flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                                <History className="h-5 w-5 text-primary" />
                            </div>
                            Piste d'audit des ajustements
                        </CardTitle>
                        <div className="flex items-center gap-4">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <Input
                                    placeholder="Rechercher dans les audits..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10 w-full md:w-64 bg-background/50 border-border/50 focus:w-80 transition-all duration-300"
                                />
                            </div>
                            <Button variant="outline" size="sm" className="gap-2 border-border/50 bg-background/50">
                                <ArrowUpDown className="h-4 w-4 text-primary" /> Date
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-secondary/5 hover:bg-secondary/5 border-border/50">
                                    <TableHead className="font-bold py-5 px-6">Chronologie</TableHead>
                                    <TableHead className="font-bold py-5 px-6">Produit</TableHead>
                                    <TableHead className="font-bold py-5 px-6">Type de catégorie</TableHead>
                                    <TableHead className="text-right font-bold py-5 px-6">Changement de quantité</TableHead>
                                    <TableHead className="font-bold py-5 px-6">Auditeur</TableHead>
                                    <TableHead className="font-bold py-5 px-6">Motif d'audit</TableHead>
                                    <TableHead className="font-bold py-5 px-6">Référence</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-64 text-center bg-background/10">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="p-4 rounded-full bg-primary/10 border border-primary/20 animate-pulse">
                                                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                                </div>
                                                <p className="text-lg font-bold text-foreground/80">Synchronisation des éléments de la base de données...</p>
                                                <p className="text-sm text-muted-foreground max-w-xs">Récupération de l'historique complet des audits.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                                {!loading && filteredAdjustments.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-48 text-center text-muted-foreground bg-background/5 italic px-6">
                                            <div className="flex flex-col items-center gap-2">
                                                <History className="h-12 w-12 opacity-10" />
                                                <p className="text-lg font-medium">Aucune entrée d'audit trouvée</p>
                                                <p className="text-sm">Essayez de modifier vos filtres ou votre recherche.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                                {filteredAdjustments.map((adj) => (
                                    <TableRow key={adj.id} className="border-border/50 hover:bg-primary/5 transition-all duration-300 group cursor-default">
                                        <TableCell className="py-5 px-6">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black flex items-center gap-2 text-foreground group-hover:text-primary transition-colors">
                                                    <Calendar className="h-3.5 w-3.5 opacity-50" />
                                                    {new Date(adj.createdDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                                <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-2 mt-0.5">
                                                    <Clock className="h-3 w-3 opacity-50" />
                                                    {new Date(adj.createdDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-5 px-6">
                                            <div className="flex flex-col">
                                                <span className="font-black text-foreground group-hover:translate-x-1 transition-transform">{adj.product.name}</span>
                                                <span className="text-[10px] font-mono text-muted-foreground uppercase">{adj.product.sku}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-5 px-6">{getAdjustmentBadge(adj.adjustmentType)}</TableCell>
                                        <TableCell className="text-right py-5 px-6">
                                            <div className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-black ring-1 transition-all group-hover:scale-110 ${adj.quantityChange > 0 ? '  ring-accent/80' : 'bg-destructive/10 text-destructive ring-destructive/30'}`}>
                                                {adj.quantityChange > 0 ? '+' : ''}{adj.quantityChange}
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-5 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center border-2 border-background shadow-sm hover:scale-110 transition-transform">
                                                    <User className="h-4 w-4 text-primary" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-foreground">{adj.user.name}</span>
                                                    <span className="text-[10px] text-muted-foreground capitalize">{adj.user.role}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-[220px] py-5 px-6">
                                            <p className="text-xs font-semibold text-muted-foreground' group-hover:text-foreground/80 leading-relaxed italic" title={adj.reason}>
                                                "{adj.reason}"
                                            </p>
                                        </TableCell>
                                        <TableCell className="py-5 px-6">
                                            <div className="flex items-center gap-1.5 text-[10px] font-black font-mono bg-background/60 px-2.5 py-1.5 rounded-md border border-border/30 shadow-inner group-hover:border-primary/30 transition-colors">
                                                <FileText className="h-3.5 w-3.5 opacity-40 text-primary" />
                                                {adj.referenceNumber || 'SYSTEM-GEN'}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
