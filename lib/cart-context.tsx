"use client"

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react"
import type { Product, CartItem, Client, SellingUnit } from "./types"

interface CartContextType {
  items: CartItem[]
  selectedClient: Client | null
  setSelectedClient: (client: Client | null) => void
  addItem: (product: Product, sellingUnit?: SellingUnit) => void
  removeItem: (productId: string, sellingUnitId?: string) => void
  updateQuantity: (productId: string, quantity: number, sellingUnitId?: string) => void
  updateDiscount: (productId: string, discount: number) => void
  clearCart: () => void
  subtotal: number
  discount: number
  tax: number
  total: number
  taxRate: number
  setTaxRate: (rate: number) => void
  setProductStocks: (stocks: Record<string, number>) => void
  productStockMap: Record<string, number>
  setPrincipalStocks: (stocks: Record<string, number>) => void
  principalStockMap: Record<string, number>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [taxRate, setTaxRate] = useState(0)
  const [productStockMap, setProductStockMap] = useState<Record<string, number>>({})
  const [principalStockMap, setPrincipalStockMap] = useState<Record<string, number>>({})
  const productStocksRef = useRef<Record<string, number>>({})

  const setProductStocks = useCallback((stocks: Record<string, number>) => {
    productStocksRef.current = stocks
    setProductStockMap(stocks)
  }, [])

  const setPrincipalStocks = useCallback((stocks: Record<string, number>) => {
    setPrincipalStockMap(stocks)
  }, [])

  const addItem = useCallback((product: Product, sellingUnit?: SellingUnit) => {
    setItems((prev) => {
      const existing = prev.find((item) => {
        if (sellingUnit) {
          return item.id === product.id && item.sellingUnitId === sellingUnit.id
        }
        return item.id === product.id && !item.sellingUnitId
      })

      const addLineItem = (qty: number) => ({
        ...product,
        price: sellingUnit ? sellingUnit.price : product.price,
        quantity: qty,
        discount: 0,
        sellingUnitName: sellingUnit?.name,
        sellingUnitId: sellingUnit?.id,
      })

      if (product.productType === "food") {
        if (existing) {
          return prev.map((item) => {
            if (sellingUnit) {
              if (item.id === product.id && item.sellingUnitId === sellingUnit.id) {
                return { ...item, quantity: item.quantity + 1 }
              }
            } else if (item.id === product.id && !item.sellingUnitId) {
              return { ...item, quantity: item.quantity + 1 }
            }
            return item
          })
        }
        return [...prev, addLineItem(1)]
      }

      if (!product.trackStock) {
        if (existing) {
          return prev.map((item) => {
            if (sellingUnit) {
              if (item.id === product.id && item.sellingUnitId === sellingUnit.id) {
                return { ...item, quantity: item.quantity + 1 }
              }
            } else if (item.id === product.id && !item.sellingUnitId) {
              return { ...item, quantity: item.quantity + 1 }
            }
            return item
          })
        }
        return [...prev, addLineItem(1)]
      }

      const totalStock = productStocksRef.current[product.id] ?? 0
      const consumedStock = prev
        .filter((i) => i.id === product.id)
        .reduce((sum, i) => {
          const icf = i.sellingUnits?.find((s) => s.id === i.sellingUnitId)?.conversionFactor ?? 1
          return sum + i.quantity * icf
        }, 0)
      const cf = sellingUnit?.conversionFactor ?? 1

      if (consumedStock + cf > totalStock) return prev

      if (existing) {
        return prev.map((item) => {
          if (sellingUnit) {
            if (item.id === product.id && item.sellingUnitId === sellingUnit.id) {
              return { ...item, quantity: item.quantity + 1 }
            }
          } else if (item.id === product.id && !item.sellingUnitId) {
            return { ...item, quantity: item.quantity + 1 }
          }
          return item
        })
      }
      return [...prev, addLineItem(1)]
    })
  }, [])

  const removeItem = useCallback((productId: string, sellingUnitId?: string) => {
    setItems((prev) => prev.filter((item) => {
      if (sellingUnitId) return !(item.id === productId && item.sellingUnitId === sellingUnitId)
      if (item.sellingUnitId) return item.id !== productId || item.sellingUnitId !== undefined
      return item.id !== productId
    }))
  }, [])

  const updateQuantity = useCallback((productId: string, quantity: number, sellingUnitId?: string) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => {
        if (sellingUnitId) return !(item.id === productId && item.sellingUnitId === sellingUnitId)
        if (item.sellingUnitId) return item.id !== productId || item.sellingUnitId !== undefined
        return item.id !== productId
      }))
    } else {
      setItems((prev) =>
        prev.map((item) => {
          const match = sellingUnitId
            ? item.id === productId && item.sellingUnitId === sellingUnitId
            : item.id === productId && !item.sellingUnitId
          if (match) {
            if (item.productType === "food") return { ...item, quantity }
            if (!item.trackStock) return { ...item, quantity }
            const totalStock = productStocksRef.current[productId] ?? 0
            const cf = sellingUnitId
              ? (item.sellingUnits?.find((s) => s.id === sellingUnitId)?.conversionFactor ?? 1)
              : 1
            const otherConsumption = prev
              .filter((i) => i.id === productId && !(sellingUnitId
                ? i.sellingUnitId === sellingUnitId
                : !i.sellingUnitId))
              .reduce((sum, i) => {
                const icf = i.sellingUnits?.find((s) => s.id === i.sellingUnitId)?.conversionFactor ?? 1
                return sum + i.quantity * icf
              }, 0)
            const maxForThis = Math.max(0, Math.floor((totalStock - otherConsumption) / cf))
            return { ...item, quantity: Math.min(quantity, maxForThis) }
          }
          return item
        }),
      )
    }
  }, [])

  const updateDiscount = useCallback((productId: string, discount: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === productId ? { ...item, discount: Math.min(100, Math.max(0, discount)) } : item)),
    )
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    setSelectedClient(null)
    setTaxRate(0)
  }, [])

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const discount = items.reduce((sum, item) => sum + (item.price * item.quantity * (item.discount / 100)), 0)
  const tax = (subtotal - discount) * (taxRate / 100)
  const total = subtotal - discount + tax

  return (
    <CartContext.Provider
      value={{
        items,
        selectedClient,
        setSelectedClient,
        addItem,
        removeItem,
        updateQuantity,
        updateDiscount,
        clearCart,
        subtotal,
        discount,
        tax,
        total,
        taxRate,
        setTaxRate,
        setProductStocks,
        productStockMap,
        setPrincipalStocks,
        principalStockMap,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
