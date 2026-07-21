"use client"

import { useState, useEffect } from "react"
import { Factory, Play, CheckCircle2, AlertTriangle, Plus, Trash2, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { useProducts } from "@/hooks/use-products"

export default function ProductionPage() {
    const { user } = useAuth()
    const [recipes, setRecipes] = useState<any[]>([])
    const [selectedRecipeId, setSelectedRecipeId] = useState<string>("")
    const [quantity, setQuantity] = useState("1")
    const [loading, setLoading] = useState(false)
    const [runs, setRuns] = useState<any[]>([])
    const [loadingRuns, setLoadingRuns] = useState(false)
    const [actualQuantities, setActualQuantities] = useState<Record<string, string>>({})
    const { products, loading: productsLoading } = useProducts()

    const [newRecipe, setNewRecipe] = useState({
        productId: "",
    })
    const [isEditingRecipe, setIsEditingRecipe] = useState(false)
    const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null)
    const [recipeIngredientsDraft, setRecipeIngredientsDraft] = useState<
        { ingredientId: string; quantity: string }[]
    >([{ ingredientId: "", quantity: "1" }])

    useEffect(() => {
        fetchRecipes()
        fetchRuns()
    }, [])

    const fetchRecipes = async () => {
        const res = await fetch("/api/recipes")
        if (res.ok) {
            setRecipes(await res.json())
        }
    }

    const fetchRuns = async () => {
        setLoadingRuns(true)
        try {
            const res = await fetch("/api/production")
            if (res.ok) {
                setRuns(await res.json())
            }
        } finally {
            setLoadingRuns(false)
        }
    }

    const selectedRecipe = recipes.find(r => r.id === selectedRecipeId)
    const selectedProduct = products.find((p) => p.id === newRecipe.productId)

    const handleAddIngredientRow = () => {
        setRecipeIngredientsDraft((prev) => [...prev, { ingredientId: "", quantity: "1" }])
    }

    const handleRemoveIngredientRow = (index: number) => {
        setRecipeIngredientsDraft((prev) => prev.filter((_, i) => i !== index))
    }

    const handleCreateRecipe = async () => {
        if (!newRecipe.productId) {
            toast.error("Veuillez renseigner le produit fini.")
            return
        }
        const ingredients = recipeIngredientsDraft
            .filter((i) => i.ingredientId && Number(i.quantity) > 0)
            .map((i) => ({ ingredientId: i.ingredientId, quantity: Number(i.quantity) }))

        if (ingredients.length === 0) {
            toast.error("Ajoutez au moins un ingrédient.")
            return
        }

        const res = await fetch(editingRecipeId ? `/api/recipes/${editingRecipeId}` : "/api/recipes", {
            method: editingRecipeId ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                productId: newRecipe.productId,
                name: selectedProduct?.name || "Recette",
                description: null,
                grs: null,
                yieldQuantity: 1,
                ingredients,
                userId: user?.id,
            }),
        })

        if (res.ok) {
            toast.success(editingRecipeId ? "Recette mise à jour" : "Recette créée")
            setNewRecipe({ productId: "" })
            setRecipeIngredientsDraft([{ ingredientId: "", quantity: "1" }])
            setIsEditingRecipe(false)
            setEditingRecipeId(null)
            fetchRecipes()
        } else {
            const data = await res.json().catch(() => ({}))
            if (data?.details?.length) {
                const lines = data.details.map((d: any) =>
                    `${d.ingredientName}: requis ${Number(d.required).toFixed(3)} ${d.unit || ""} / dispo ${Number(d.available).toFixed(3)} ${d.unit || ""}`
                )
                toast.error("Stock insuffisant", { description: lines.join(" | ") })
            } else {
                toast.error(data?.error || "Erreur lors de la création de la recette")
            }
        }
    }

    const handleEditRecipe = (recipe: any) => {
        setIsEditingRecipe(true)
        setEditingRecipeId(recipe.id)
        setNewRecipe({
            productId: recipe.productId || "",
        })
        setRecipeIngredientsDraft(
            (recipe.ingredients || []).map((ing: any) => ({
                ingredientId: ing.ingredientId,
                quantity: ing.quantity ? String(ing.quantity) : "1",
            }))
        )
        if (!recipe.ingredients || recipe.ingredients.length === 0) {
            setRecipeIngredientsDraft([{ ingredientId: "", quantity: "1" }])
        }
    }

    const handleCancelEdit = () => {
        setIsEditingRecipe(false)
        setEditingRecipeId(null)
        setNewRecipe({ productId: "" })
        setRecipeIngredientsDraft([{ ingredientId: "", quantity: "1" }])
    }

    const handleDeleteRecipe = async (recipeId: string) => {
        if (!window.confirm("Supprimer cette recette ?")) return
        const res = await fetch(`/api/recipes/${recipeId}`, { method: "DELETE" })
        if (res.ok) {
            toast.success("Recette supprimée")
            fetchRecipes()
        } else {
            toast.error("Erreur lors de la suppression")
        }
    }

    const handleProduction = async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/production", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    recipeId: selectedRecipeId,
                    quantity: quantity,
                    userId: user?.id,
                })
            })

            if (res.ok) {
                toast.success("Production démarrée")
                setQuantity("1")
                setSelectedRecipeId("")
                fetchRuns()
            } else {
                const data = await res.json()
                if (data?.details?.length) {
                    const lines = data.details.map((d: any) =>
                        `${d.ingredientName}: requis ${Number(d.required).toFixed(3)} ${d.unit || ""} / dispo ${Number(d.available).toFixed(3)} ${d.unit || ""}`
                    )
                    toast.error("Stock insuffisant", {
                        description: lines.join(" | "),
                    })
                } else {
                    toast.error(data?.error || "Erreur lors de la production")
                }
            }
        } catch (error) {
            toast.error("Erreur réseau")
        } finally {
            setLoading(false)
        }
    }

    const handleCompleteRun = async (runId: string) => {
        const qty = Number(actualQuantities[runId] || 0)
        if (!qty || qty <= 0) {
            toast.error("Veuillez saisir la quantité produite.")
            return
        }
        const res = await fetch(`/api/production/${runId}/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quantity: qty, userId: user?.id }),
        })
        if (res.ok) {
            toast.success("Production terminée")
            setActualQuantities((prev) => ({ ...prev, [runId]: "" }))
            fetchRuns()
        } else {
            const data = await res.json().catch(() => ({}))
            toast.error(data?.error || "Erreur lors de la finalisation")
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Production</h1>
                <p className="text-muted-foreground">
                    Lancez des ordres de fabrication pour convertir vos matières premières en produits finis.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Lancer une production</CardTitle>
                        <CardDescription>Sélectionnez une recette et la quantité à produire.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Recette</Label>
                            <Select value={selectedRecipeId} onValueChange={setSelectedRecipeId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choisir une recette..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {recipes.map(recipe => (
                                        <SelectItem key={recipe.id} value={recipe.id}>
                                            {recipe.name} (Produit: {recipe.product?.name})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedRecipe && (
                            <div className="space-y-2">
                                <Label>Quantité à produire ({selectedRecipe.product?.unit})</Label>
                                <Input
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    min="1"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Recette de base pour {selectedRecipe.yieldQuantity} {selectedRecipe.product?.unit}
                                </p>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button
                            className="w-full"
                            disabled={!selectedRecipe || loading}
                            onClick={handleProduction}
                        >
                            {loading ? "En cours..." : (
                                <>
                                    <Play className="mr-2 h-4 w-4" />
                                    Lancer la Production
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </Card>

                {selectedRecipe ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Résumé de la fabrication</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
                                <div>
                                    <p className="text-sm font-medium">Produit Fini</p>
                                    <p className="text-2xl font-bold text-primary">{selectedRecipe.product?.name}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium">Quantité Totale</p>
                                    <p className="text-2xl font-bold">{quantity} {selectedRecipe.product?.unit}</p>
                                </div>
                            </div>

                            <Separator />

                            <div>
                                <h4 className="mb-2 text-sm font-semibold">Consommation Matières Premières estimée</h4>
                                <div className="space-y-2">
                                    {selectedRecipe.ingredients.map((ing: any) => {
                                        const ratio = Number(quantity) / Number(selectedRecipe.yieldQuantity)
                                        const totalRequired = Number(ing.quantity) * ratio
                                        return (
                                            <div key={ing.id} className="flex justify-between text-sm">
                                                <span>{ing.ingredient?.name}</span>
                                                <Badge variant="secondary">
                                                    - {totalRequired.toFixed(3)} {ing.ingredient?.unit}
                                                </Badge>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="flex items-center justify-center p-8 border rounded-lg border-dashed text-muted-foreground">
                        <div className="text-center">
                            <Factory className="mx-auto h-12 w-12 opacity-50 mb-2" />
                            <p>Sélectionnez une recette pour voir les détails</p>
                        </div>
                    </div>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{isEditingRecipe ? "Modifier la recette" : "Créer une recette"}</CardTitle>
                    <CardDescription>Définissez le produit fini et les ingrédients nécessaires.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Produit fini</Label>
                            <Select
                                value={newRecipe.productId}
                                onValueChange={(value) => setNewRecipe((prev) => ({ ...prev, productId: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={productsLoading ? "Chargement..." : "Choisir un produit"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {products
                                        .filter((p) => p.type === "finished_good" && p.sector === "Boulangerie")
                                        .map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.name} ({p.unit || "unit"})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Nom de la recette</Label>
                            <Input
                                value={selectedProduct?.name || ""}
                                disabled
                                placeholder="Sélectionnez un produit fini"
                            />
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                        <Label>Ingrédients</Label>
                        <div className="space-y-3">
                            {recipeIngredientsDraft.map((ing, index) => (
                                <div key={index} className="grid gap-3 md:grid-cols-[1fr_140px_auto] items-center">
                                    <Select
                                        value={ing.ingredientId}
                                        onValueChange={(value) =>
                                            setRecipeIngredientsDraft((prev) =>
                                                prev.map((row, i) =>
                                                    i === index ? { ...row, ingredientId: value } : row
                                                )
                                            )
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choisir un ingrédient" />
                                        </SelectTrigger>
                                <SelectContent>
                                            {products
                                                .filter((p) => p.type === "raw_material")
                                                .map((p) => (
                                                    <SelectItem key={p.id} value={p.id}>
                                                        {p.name} ({p.unit || "unit"})
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.001"
                                        value={ing.quantity}
                                        onChange={(e) =>
                                            setRecipeIngredientsDraft((prev) =>
                                                prev.map((row, i) =>
                                                    i === index ? { ...row, quantity: e.target.value } : row
                                                )
                                            )
                                        }
                                        placeholder="Quantité"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive"
                                        onClick={() => handleRemoveIngredientRow(index)}
                                        disabled={recipeIngredientsDraft.length === 1}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <Button type="button" variant="outline" onClick={handleAddIngredientRow} className="mt-2">
                            <Plus className="mr-2 h-4 w-4" />
                            Ajouter un ingrédient
                        </Button>
                    </div>
                </CardContent>
                <CardFooter>
                    <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-between">
                        <Button onClick={handleCreateRecipe}>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            {isEditingRecipe ? "Mettre à jour" : "Enregistrer la recette"}
                        </Button>
                        {isEditingRecipe && (
                            <Button variant="outline" onClick={handleCancelEdit}>
                                Annuler
                            </Button>
                        )}
                    </div>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Recettes existantes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {recipes.length === 0 ? (
                        <div className="text-sm text-muted-foreground">Aucune recette enregistrée.</div>
                    ) : (
                        recipes.map((recipe) => (
                            <div
                                key={recipe.id}
                                className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div>
                                    <p className="font-medium">{recipe.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Produit: {recipe.product?.name} • GRS: {recipe.grs || "—"} • Rendement:{" "}
                                        {recipe.yieldQuantity} {recipe.product?.unit || ""}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => handleEditRecipe(recipe)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Modifier
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-destructive"
                                        onClick={() => handleDeleteRecipe(recipe.id)}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Supprimer
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Productions en cours</CardTitle>
                    <CardDescription>Finalisez la production et ajoutez le produit fini au stock.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {loadingRuns ? (
                        <div className="text-sm text-muted-foreground">Chargement...</div>
                    ) : runs.filter((r) => r.status === "in_progress").length === 0 ? (
                        <div className="text-sm text-muted-foreground">Aucune production en cours.</div>
                    ) : (
                        runs
                            .filter((r) => r.status === "in_progress")
                            .map((run) => (
                                <div
                                    key={run.id}
                                    className="flex flex-col gap-3 rounded-lg border border-border p-3 md:flex-row md:items-center md:justify-between"
                                >
                                    <div>
                                        <p className="font-medium">{run.recipe?.product?.name || "Produit fini"}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Batch: {run.batchNumber || run.id.slice(0, 8)} • Prévu: {run.plannedQuantity}{" "}
                                            {run.recipe?.product?.unit || ""}
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.001"
                                            placeholder="Quantité produite"
                                            value={actualQuantities[run.id] ?? ""}
                                            onChange={(e) =>
                                                setActualQuantities((prev) => ({ ...prev, [run.id]: e.target.value }))
                                            }
                                            className="w-48"
                                        />
                                        <Button onClick={() => handleCompleteRun(run.id)}>
                                            <CheckCircle2 className="mr-2 h-4 w-4" />
                                            Finaliser
                                        </Button>
                                    </div>
                                </div>
                            ))
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
