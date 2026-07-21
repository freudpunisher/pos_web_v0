"use client"

import type React from "react"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface Column<T> {
  key: keyof T | string
  header: string
  render?: (item: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  title?: string
  data: T[]
  columns: Column<T>[]
  emptyMessage?: string
  actions?: React.ReactNode
}

export function DataTable<T extends { id: string }>({
  title,
  data,
  columns,
  emptyMessage = "No data available",
  actions,
}: DataTableProps<T>) {
  return (
    <Card className="border-border bg-card">
      {(title || actions) && (
        <CardHeader className="flex flex-row items-center justify-between">
          {title && <CardTitle>{title}</CardTitle>}
          {actions}
        </CardHeader>
      )}
      <CardContent className={cn(!title && !actions && "pt-6")}>
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                {columns.map((column) => (
                  <TableHead key={String(column.key)} className={cn("text-muted-foreground", column.className)}>
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow key={item.id} className="border-border">
                    {columns.map((column) => (
                      <TableCell key={`${item.id}-${String(column.key)}`} className={column.className}>
                        {column.render ? column.render(item) : String(item[column.key as keyof T] ?? "")}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
