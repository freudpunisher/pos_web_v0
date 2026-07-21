"use client"

import type React from "react"
import { Suspense, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { useAuth } from "@/lib/auth-context"
import { RouteGuard } from "@/components/route-guard"

function LayoutSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="w-64 border-r border-border bg-card animate-pulse" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="h-16 border-b border-border bg-card animate-pulse" />
        <main className="flex-1 overflow-hidden">
          <div className="h-8 w-48 bg-muted rounded animate-pulse mb-4" />
          <div className="h-96 bg-muted rounded animate-pulse" />
        </main>
      </div>
    </div>
  )
}

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isSalesPage = pathname === "/sales"

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/")
    }
  }, [isAuthenticated, loading, router])

  if (loading) {
    return <LayoutSkeleton />
  }

  if (!isAuthenticated) {
    return null
  }

  if (isSalesPage) {
    return (
      <div className="flex h-screen overflow-hidden bg-background relative">
        <div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center opacity-[0.04] dark:opacity-[0.03]">
          <img src="/ahava.png" alt="" className="max-w-[60%] max-h-[60%] object-contain" />
        </div>
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden relative z-10">
          <Header />
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background relative">
      <div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center opacity-[0.04] dark:opacity-[0.03]">
        <img src="/ahava.png" alt="" className="max-w-[60%] max-h-[60%] object-contain" />
      </div>
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden relative z-10">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-4">
            <Breadcrumbs />
          </div>
          <RouteGuard>
            {children}
          </RouteGuard>
        </main>
        <Footer />
      </div>
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LayoutSkeleton />}>
      <AppLayoutContent>{children}</AppLayoutContent>
    </Suspense>
  )
}
