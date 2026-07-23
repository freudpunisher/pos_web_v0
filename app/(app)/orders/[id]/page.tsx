"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { formatCurrency } from "@/lib/mock-data"
import { ArrowLeft, XCircle, Loader2, ArrowRight, CheckCircle } from "lucide-react"

const statusColors: Record<string, string> = {
    pending: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
    confirmed: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
    completed: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
    cancelled: "bg-red-500/20 text-red-700 dark:text-red-400",
}

export default function OrderDetailPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const [order, setOrder] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)

    useEffect(() => {
        fetch(`/api/orders/${id}`)
            .then((r) => r.json())
            .then(setOrder)
            .finally(() => setLoading(false))
    }, [id])

    const updateStatus = async (orderStatus: string, paymentMethod?: string) => {
        setUpdating(true)
        try {
            const res = await fetch(`/api/orders/${id}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderStatus, paymentMethod }),
            })
            if (res.ok) {
                const updated = await res.json()
                setOrder((prev: any) => ({ ...prev, ...updated }))
            }
        } finally {
            setUpdating(false)
        }
    }

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
    if (!order) return <div className="text-center py-12 text-muted-foreground">Commande non trouvée</div>

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <Button variant="ghost" onClick={() => router.push("/orders")} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Retour aux commandes
            </Button>

            <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                        <CardTitle className="font-mono text-lg">Commande #{order.id.slice(0, 8)}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            {new Date(order.date).toLocaleString()}
                        </p>
                        <div className="flex gap-3 mt-2 text-sm text-muted-foreground">
                        </div>
                    </div>
                    <Badge className={statusColors[order.orderStatus]}>
                        {order.orderStatus === "pending" ? "En attente" : order.orderStatus === "confirmed" ? "Confirmé" : order.orderStatus === "completed" ? "Terminé" : "Annulé"}
                    </Badge>
                </CardHeader>
                <CardContent>
                    <Separator className="mb-4" />
                    <div className="space-y-2">
                        {order.items?.map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between py-1">
                                <span className="flex-1">{item.quantity}x {item.productName}</span>
                                <span className="text-xs text-muted-foreground mr-3">
                                    @{formatCurrency(Number(item.price))}
                                </span>
                                <span className="font-medium">
                                    {formatCurrency(Number(item.price) * item.quantity)}
                                    {Number(item.discount) > 0 && (
                                        <span className="text-xs text-destructive ml-1">(-{item.discount}%)</span>
                                    )}
                                </span>
                            </div>
                        ))}
                    </div>
                    <Separator className="my-4" />
                    <div className="flex justify-between text-lg font-bold">
                        <span>Total</span>
                        <span>{formatCurrency(Number(order.total))}</span>
                    </div>

                    {!["completed", "cancelled"].includes(order.orderStatus) && (
                        <>
                            <Separator className="my-4" />
                            <div className="flex flex-wrap gap-2">
                                {order.orderStatus === "pending" && (
                                    <Button onClick={() => updateStatus("confirmed")} disabled={updating} className="flex-1">
                                        <ArrowRight className="h-4 w-4 mr-2" /> Confirmer la commande
                                    </Button>
                                )}
                                {order.orderStatus === "confirmed" && (
                                    <div className="w-full space-y-2">
                                        <p className="text-sm font-medium">Paiement</p>
                                        <div className="flex gap-2">
                                            <Button onClick={() => updateStatus("completed", "cash")} disabled={updating} className="flex-1">Espèces</Button>
                                            <Button onClick={() => updateStatus("completed", "card")} disabled={updating} className="flex-1">Carte</Button>
                                            <Button onClick={() => updateStatus("completed", "credit")} disabled={updating} className="flex-1">Crédit</Button>
                                        </div>
                                    </div>
                                )}
                                <Button variant="outline" className="text-destructive" onClick={() => updateStatus("cancelled")} disabled={updating}>
                                    <XCircle className="h-4 w-4 mr-2" /> Annuler la commande
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
