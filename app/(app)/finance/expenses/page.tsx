"use client"

import { useState, useEffect } from "react"
import { DollarSign, Plus, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { format } from "date-fns"
import { useSettings } from "@/hooks/use-settings"

export default function ExpensesPage() {
    const { user } = useAuth()
    const { settings } = useSettings()
    const [expenses, setExpenses] = useState<any[]>([])
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [formData, setFormData] = useState({
        description: "",
        amount: "",
        category: "other",
        recipient: "",
        reference: ""
    })

    const currencySymbol = settings?.currencySymbol || "Fbu"

    useEffect(() => {
        fetchExpenses()
    }, [])

    const fetchExpenses = async () => {
        const res = await fetch("/api/expenses")
        if (res.ok) setExpenses(await res.json())
    }

    const handleCreate = async () => {
        try {
            const res = await fetch("/api/expenses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...formData, userId: user?.id })
            })

            if (res.ok) {
                toast.success("Dépense enregistrée")
                setIsCreateOpen(false)
                fetchExpenses()
                setFormData({ description: "", amount: "", category: "other", recipient: "", reference: "" })
            } else {
                toast.error("Erreur")
            }
        } catch (error) {
            toast.error("Erreur réseau")
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dépenses</h1>
                    <p className="text-muted-foreground">Suivi des frais opérationnels et sorties de caisse.</p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button variant="destructive">
                            <Plus className="mr-2 h-4 w-4" />
                            Enregistrer Dépense
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Nouvelle Dépense</DialogTitle>
                            <DialogDescription>Enregistrez une sortie de caisse opérationnelle.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Description</Label>
                                <Input
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="ex: Facture Électricité"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Montant</Label>
                                    <Input
                                        type="number"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Catégorie</Label>
                                    <Select
                                        value={formData.category}
                                        onValueChange={(val) => setFormData({ ...formData, category: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="rent">Loyer</SelectItem>
                                            <SelectItem value="utilities">Factures (Eau/Élec)</SelectItem>
                                            <SelectItem value="salaries">Salaires</SelectItem>
                                            <SelectItem value="raw_materials">Matières Premières</SelectItem>
                                            <SelectItem value="maintenance">Maintenance</SelectItem>
                                            <SelectItem value="other">Autre</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
                            <Button onClick={handleCreate} variant="destructive">Enregistrer</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Historique des Dépenses</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Catégorie</TableHead>
                                <TableHead>Enregistré par</TableHead>
                                <TableHead className="text-right">Montant</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {expenses.map((expense) => (
                                <TableRow key={expense.id}>
                                    <TableCell>{format(new Date(expense.date), "dd/MM/yyyy")}</TableCell>
                                    <TableCell>{expense.description}</TableCell>
                                    <TableCell className="capitalize">{expense.category}</TableCell>
                                    <TableCell>{expense.paidBy}</TableCell>
                                    <TableCell className="text-right font-medium text-destructive">
                                        - {Number(expense.amount).toLocaleString()} {currencySymbol}
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
