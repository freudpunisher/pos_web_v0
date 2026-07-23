"use client"

import { useState, useMemo } from "react"
import { useUsers } from "@/hooks/use-users"
import { useLocations } from "@/hooks/use-locations"
import { useUserLocations } from "@/hooks/use-user-locations"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, Plus, Trash2, Warehouse, Store } from "lucide-react"

const LOCATION_ICONS: Record<string, any> = {
    primary: Warehouse,
    store: Store,
}

export function UserLocationManager() {
    const { users, loading: usersLoading } = useUsers()
    const { locations } = useLocations()
    const [selectedUserId, setSelectedUserId] = useState<string>("")
    const [selectedLocationId, setSelectedLocationId] = useState<string>("")
    const [assigning, setAssigning] = useState(false)

    const { userLocations, removeLocationFromUser, assignLocationToUser } = useUserLocations(selectedUserId)

    const cashiers = useMemo(() => users.filter((u) => u.role === "cashier"), [users])
    const availableLocations = useMemo(
        () => locations.filter((l) => l.isActive && !userLocations.some((ul) => ul.locationId === l.id)),
        [locations, userLocations]
    )

    const handleAssignLocation = async () => {
        if (!selectedLocationId) {
            toast.error("Veuillez sélectionner un emplacement")
            return
        }
        setAssigning(true)
        try {
            await assignLocationToUser(selectedLocationId)
            setSelectedLocationId("")
            toast.success("Emplacement assigné avec succès")
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setAssigning(false)
        }
    }

    const handleRemoveLocation = async (locationId: string) => {
        try {
            await removeLocationFromUser(locationId)
            toast.success("Emplacement retiré avec succès")
        } catch (err: any) {
            toast.error(err.message)
        }
    }

    const selectedUser = cashiers.find((u) => u.id === selectedUserId)

    return (
        <Card>
            <CardHeader>
                <CardTitle>Gestion des emplacements utilisateur</CardTitle>
                <CardDescription>
                    Assignez les emplacements de vente aux caissiers. Un caissier ne peut voir que les emplacements qui lui sont assignés.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* User Selection */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Sélectionnez un caissier</label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                        <SelectTrigger disabled={usersLoading}>
                            <SelectValue placeholder="Choisir un caissier..." />
                        </SelectTrigger>
                        <SelectContent>
                            {cashiers.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                    {u.name} ({u.email})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {selectedUser && (
                    <>
                        {/* Current Assignments */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-medium text-sm">Emplacement actuel de {selectedUser.name}</h3>
                                <Badge variant={userLocations.length > 0 ? "secondary" : "outline"}>
                                    {userLocations.length > 0 ? "Assigné" : "Non assigné"}
                                </Badge>
                            </div>
                            {userLocations.length === 0 ? (
                                <div className="p-3 rounded-lg border border-dashed text-center text-sm text-muted-foreground">
                                    Aucun emplacement assigné
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {userLocations.map((ul) => {
                                        const Icon = LOCATION_ICONS[ul.location?.type || "store"]
                                        return (
                                            <div
                                                key={ul.id}
                                                className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                                            >
                                                <div className="flex items-center gap-2">
                                                    {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                                                    <div>
                                                        <p className="font-medium text-sm">{ul.location?.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {ul.location?.type === "primary"
                                                                ? "Entrepôt"
                                                                : ul.location?.type === "store"
                                                                    ? "Magasin"
                                                                    : "Autre"}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveLocation(ul.locationId)}
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                            {userLocations.length > 0 && (
                                <p className="text-sm text-muted-foreground">
                                    Un caissier peut être affecté à un seul emplacement. La sélection d'un nouvel emplacement remplacera l'affectation actuelle.
                                </p>
                            )}
                        </div>

                        {/* Add / Reassign Location */}
                        {availableLocations.length > 0 ? (
                            <div className="pt-4 border-t border-border space-y-2">
                                <label className="text-sm font-medium">
                                    {userLocations.length > 0 ? "Réaffecter à un autre emplacement" : "Ajouter un emplacement"}
                                </label>
                                <div className="flex gap-2">
                                    <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="Choisir un emplacement..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableLocations.map((l) => {
                                                const Icon = LOCATION_ICONS[l.type]
                                                return (
                                                    <SelectItem key={l.id} value={l.id}>
                                                        <div className="flex items-center gap-2">
                                                            {Icon && <Icon className="h-4 w-4" />}
                                                            {l.name}
                                                        </div>
                                                    </SelectItem>
                                                )
                                            })}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        onClick={handleAssignLocation}
                                        disabled={assigning || !selectedLocationId}
                                        size="sm"
                                    >
                                        {assigning ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Plus className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            userLocations.length === 0 ? (
                                <div className="p-3 rounded-lg border border-dashed text-center text-sm text-muted-foreground">
                                    Aucun emplacement disponible à affecter.
                                </div>
                            ) : null
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    )
}
