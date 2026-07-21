import type React from "react"
import type { Metadata, Viewport } from "next"
// import type { Metadata, Viewport } from "next"
import { Analytics } from "@vercel/analytics/next"
import { Providers } from "@/components/providers"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

export const metadata: Metadata = {
  title: "SmartPOS - Système de Point de Vente",
  description: "Application web professionnelle de point de vente pour la gestion commerciale",
  generator: "v0.app",
  icons: {
    icon: "/ahava.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#1a1a2e",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
