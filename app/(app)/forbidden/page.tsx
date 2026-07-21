"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldAlert, Home, ArrowLeft } from "lucide-react"

export default function ForbiddenPage() {
  const router = useRouter()

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md mx-auto border-destructive/30">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="h-10 w-10 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-destructive">Accès Refusé</CardTitle>
          <CardDescription className="text-base mt-2">
            Vous n&apos;avez pas les permissions nécessaires pour accéder à cette page.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground text-center">
            Si vous pensez qu&apos;il s&apos;agit d&apos;une erreur, veuillez contacter un administrateur.
          </p>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
            <Button onClick={() => router.push("/dashboard")}>
              <Home className="mr-2 h-4 w-4" />
              Tableau de bord
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
