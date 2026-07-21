"use client"

import { useState, useMemo } from "react"
import { useUsers } from "@/hooks/use-users"
import { useTables } from "@/hooks/use-tables"
import { useOrders } from "@/hooks/use-orders"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StaffFormDialog } from "@/components/staff-tables/staff-form-dialog"
import { TableFormDialog } from "@/components/staff-tables/table-form-dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { Search, Plus, Users, Table2, User, Mail, Shield, Pencil, Trash2, Loader2 } from "lucide-react"

const PAGE_SIZES = [5, 10, 20, 50]

export default function StaffTablesPage() {
  const { users, loading: usersLoading, createUser, updateUser, deleteUser } = useUsers()
  const { tables, loading: tablesLoading, createTable, updateTable, deleteTable } = useTables()
  const { orders } = useOrders()

  const [staffDialog, setStaffDialog] = useState<{ open: boolean; staff: any | null }>({ open: false, staff: null })
  const [tableDialog, setTableDialog] = useState<{ open: boolean; table: any | null }>({ open: false, table: null })

  const [staffSearch, setStaffSearch] = useState("")
  const [staffRoleFilter, setStaffRoleFilter] = useState("all")
  const [staffPage, setStaffPage] = useState(1)
  const [staffPageSize, setStaffPageSize] = useState(10)

  const [tableSearch, setTableSearch] = useState("")
  const [tableSectionFilter, setTableSectionFilter] = useState("all")
  const [tableStatusFilter, setTableStatusFilter] = useState("all")
  const [tablePage, setTablePage] = useState(1)
  const [tablePageSize, setTablePageSize] = useState(20)

  const waiters = useMemo(() => users.filter((u) => u.role === "waiter"), [users])

  const occupiedTableIds = useMemo(() => {
    return new Set(
      orders
        .filter((o) => !["paid", "cancelled"].includes(o.orderStatus) && o.tableId)
        .map((o) => o.tableId),
    )
  }, [orders])

  const filteredStaff = useMemo(() => {
    let list = users
    if (staffSearch) {
      const q = staffSearch.toLowerCase()
      list = list.filter((u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.phone?.toLowerCase().includes(q))
    }
    if (staffRoleFilter !== "all") list = list.filter((u) => u.role === staffRoleFilter)
    return list
  }, [users, staffSearch, staffRoleFilter])

  const staffTotalPages = Math.max(1, Math.ceil(filteredStaff.length / staffPageSize))
  const paginatedStaff = filteredStaff.slice((staffPage - 1) * staffPageSize, staffPage * staffPageSize)

  const sections = useMemo(() => {
    const s = new Set<string>()
    tables.forEach((t) => { if (t.section) s.add(t.section) })
    return Array.from(s).sort()
  }, [tables])

  const filteredTables = useMemo(() => {
    let list = tables
    if (tableSearch) {
      const q = tableSearch.toLowerCase()
      list = list.filter((t) => String(t.number).includes(q) || t.section?.toLowerCase().includes(q))
    }
    if (tableSectionFilter !== "all") list = list.filter((t) => t.section === tableSectionFilter)
    if (tableStatusFilter !== "all") {
      const isOccupied = (t: any) => occupiedTableIds.has(t.id)
      list = list.filter((t) => (tableStatusFilter === "occupied" ? isOccupied(t) : !isOccupied(t)))
    }
    return list
  }, [tables, tableSearch, tableSectionFilter, tableStatusFilter, occupiedTableIds])

  const tableTotalPages = Math.max(1, Math.ceil(filteredTables.length / tablePageSize))
  const paginatedTables = filteredTables.slice((tablePage - 1) * tablePageSize, tablePage * tablePageSize)

  const handleStaffSubmit = async (data: any) => {
    if (staffDialog.staff) {
      await updateUser(staffDialog.staff.id, data)
      toast.success("Personnel mis à jour")
    } else {
      await createUser(data)
      toast.success("Personnel ajouté")
    }
  }

  const handleTableSubmit = async (data: any) => {
    if (tableDialog.table) {
      await updateTable(tableDialog.table.id, data)
      toast.success("Table mise à jour")
    } else {
      await createTable(data)
      toast.success("Table ajoutée")
    }
  }

  const handleDeleteStaff = async (id: string, name: string) => {
    if (!window.confirm(`Supprimer "${name}" ?`)) return
    try {
      await deleteUser(id)
      toast.success("Personnel supprimé")
    } catch (err: any) {
      toast.error(err.message || "Échec de la suppression")
    }
  }

  const handleDeleteTable = async (id: string, number: number) => {
    if (!window.confirm(`Supprimer la table ${number} ?`)) return
    try {
      await deleteTable(id)
      toast.success("Table supprimée")
    } catch (err: any) {
      toast.error(err.message || "Échec de la suppression")
    }
  }

  const roleColors: Record<string, string> = {
    admin: "bg-red-500/20 text-red-700 dark:text-red-400",
    manager: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
    cashier: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
    waiter: "bg-green-500/20 text-green-700 dark:text-green-400",
  }

  const allRoles = useMemo(() => {
    const s = new Set<string>()
    users.forEach((u) => s.add(u.role))
    return Array.from(s)
  }, [users])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Personnel & Tables</h2>
        <p className="text-muted-foreground">Gérer les serveurs, le personnel et les tables</p>
      </div>

      <Tabs defaultValue="staff" className="space-y-6">
        <TabsList>
          <TabsTrigger value="staff" className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Personnel ({users.length})
          </TabsTrigger>
          <TabsTrigger value="tables" className="flex items-center gap-2">
            <Table2 className="h-4 w-4" /> Tables ({tables.length})
          </TabsTrigger>
        </TabsList>

        {/* ──────── STAFF TAB ──────── */}
        <TabsContent value="staff" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom ou email..."
                  value={staffSearch}
                  onChange={(e) => { setStaffSearch(e.target.value); setStaffPage(1) }}
                  className="pl-10"
                />
              </div>
              <Select value={staffRoleFilter} onValueChange={(v) => { setStaffRoleFilter(v); setStaffPage(1) }}>
                <SelectTrigger className="w-32"><SelectValue placeholder="Rôle" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les rôles</SelectItem>
                  {allRoles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {usersLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <Users className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">Aucun personnel trouvé</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border">
                      <TableHead>Nom</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Téléphone</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead className="w-24 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedStaff.map((u) => (
                      <TableRow key={u.id} className="border-border">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-medium">{u.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" /> {u.email}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {u.phone || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge className={roleColors[u.role] || ""}>
                            <Shield className="h-3 w-3 mr-1" /> {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setStaffDialog({ open: true, staff: u })}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteStaff(u.id, u.name)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{(staffPage - 1) * staffPageSize + 1}&ndash;{Math.min(staffPage * staffPageSize, filteredStaff.length)} sur {filteredStaff.length}</span>
                  <Select value={String(staffPageSize)} onValueChange={(v) => { setStaffPageSize(Number(v)); setStaffPage(1) }}>
                    <SelectTrigger className="w-20 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZES.map((s) => <SelectItem key={s} value={String(s)}>{s} / page</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={staffPage <= 1} onClick={() => setStaffPage((p) => Math.max(1, p - 1))}>Précédent</Button>
                  <span className="text-sm text-muted-foreground">Page {staffPage} sur {staffTotalPages}</span>
                  <Button variant="outline" size="sm" disabled={staffPage >= staffTotalPages} onClick={() => setStaffPage((p) => Math.min(staffTotalPages, p + 1))}>Suivant</Button>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* ──────── TABLES TAB ──────── */}
        <TabsContent value="tables" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-48">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher table ou section..."
                  value={tableSearch}
                  onChange={(e) => { setTableSearch(e.target.value); setTablePage(1) }}
                  className="pl-10"
                />
              </div>
              <Select value={tableSectionFilter} onValueChange={(v) => { setTableSectionFilter(v); setTablePage(1) }}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Section" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les sections</SelectItem>
                  {sections.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={tableStatusFilter} onValueChange={(v) => { setTableStatusFilter(v); setTablePage(1) }}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Statut" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="free">Libre</SelectItem>
                  <SelectItem value="occupied">Occupé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setTableDialog({ open: true, table: null })}>
              <Plus className="h-4 w-4 mr-2" /> Ajouter une table
            </Button>
          </div>

          {tablesLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredTables.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <Table2 className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">Aucune table trouvée</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {paginatedTables.map((t) => {
                  const isOccupied = occupiedTableIds.has(t.id)
                  return (
                    <Card key={t.id} className={`border-border/50 transition-all group ${
                      isOccupied ? "border-destructive/50 bg-destructive/5" : "border-green-500/30 bg-green-500/5"
                    }`}>
                      <CardContent className="p-4 text-center">
                        <div className="flex justify-center mb-2">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isOccupied ? "bg-destructive/20" : "bg-green-500/20"}`}>
                            <Table2 className={`h-6 w-6 ${isOccupied ? "text-destructive" : "text-green-600"}`} />
                          </div>
                        </div>
                        <p className="text-lg font-bold">T{t.number}</p>
                        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" /> {t.capacity}p
                        </div>
                        <Badge variant="outline" className={`mt-2 ${isOccupied ? "text-destructive border-destructive/30" : "text-green-600 border-green-500/30"}`}>
                          {isOccupied ? "Occupé" : "Libre"}
                        </Badge>
                        {t.section && <p className="text-xs text-muted-foreground mt-1">{t.section}</p>}
                        <div className="flex justify-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="sm" variant="ghost" onClick={() => setTableDialog({ open: true, table: t })}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {!isOccupied && (
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteTable(t.id, t.number)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{(tablePage - 1) * tablePageSize + 1}&ndash;{Math.min(tablePage * tablePageSize, filteredTables.length)} sur {filteredTables.length}</span>
                  <Select value={String(tablePageSize)} onValueChange={(v) => { setTablePageSize(Number(v)); setTablePage(1) }}>
                    <SelectTrigger className="w-20 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZES.map((s) => <SelectItem key={s} value={String(s)}>{s} / page</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={tablePage <= 1} onClick={() => setTablePage((p) => Math.max(1, p - 1))}>Précédent</Button>
                  <span className="text-sm text-muted-foreground">Page {tablePage} sur {tableTotalPages}</span>
                  <Button variant="outline" size="sm" disabled={tablePage >= tableTotalPages} onClick={() => setTablePage((p) => Math.min(tableTotalPages, p + 1))}>Suivant</Button>
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      <StaffFormDialog
        staff={staffDialog.staff}
        open={staffDialog.open}
        onOpenChange={(open) => setStaffDialog({ open, staff: open ? staffDialog.staff : null })}
        onSubmit={handleStaffSubmit}
      />

      <TableFormDialog
        table={tableDialog.table}
        open={tableDialog.open}
        onOpenChange={(open) => setTableDialog({ open, table: open ? tableDialog.table : null })}
        onSubmit={handleTableSubmit}
      />
    </div>
  )
}
