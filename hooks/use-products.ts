"use client"

import { useState, useEffect, useCallback } from "react"

export function useProducts(categoryId?: string, search?: string) {
    const [products, setProducts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchProducts = useCallback(async (catId?: string, query?: string) => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            const activeCatId = catId || categoryId
            const activeQuery = query !== undefined ? query : search

            if (activeCatId && activeCatId !== "all") params.append("categoryId", activeCatId)
            if (activeQuery) params.append("search", activeQuery)

            const response = await fetch(`/api/products?${params.toString()}`)
            if (!response.ok) throw new Error("Failed to fetch products")
            const data = await response.json()
            setProducts(data)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [categoryId, search])

    useEffect(() => {
        fetchProducts()
    }, [fetchProducts])

    const createProduct = async (productData: any) => {
        try {
            const response = await fetch("/api/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(productData),
            })
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}))
                throw new Error(errData.error || "Failed to create product")
            }
            const newProduct = await response.json()
            await fetchProducts()
            return newProduct
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    const updateProduct = async (id: string, productData: any) => {
        try {
            const response = await fetch(`/api/products/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(productData),
            })
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}))
                throw new Error(errData.error || "Failed to update product")
            }
            const updatedProduct = await response.json()
            await fetchProducts()
            return updatedProduct
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    const deleteProduct = async (id: string) => {
        try {
            const response = await fetch(`/api/products/${id}`, {
                method: "DELETE",
            })
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}))
                throw new Error(errData.error || "Failed to delete product")
            }
            setProducts((prev) => prev.filter((p) => p.id !== id))
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    return { products, loading, error, refresh: fetchProducts, createProduct, updateProduct, deleteProduct }
}

export function useCategories() {
    const [categories, setCategories] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchCategories = useCallback(async () => {
        setLoading(true)
        try {
            const response = await fetch("/api/categories")
            if (!response.ok) throw new Error("Failed to fetch categories")
            const data = await response.json()
            setCategories(data)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchCategories()
    }, [fetchCategories])

    const createCategory = async (categoryData: any) => {
        try {
            const response = await fetch("/api/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(categoryData),
            })
            if (!response.ok) throw new Error("Failed to create category")
            const newCategory = await response.json()
            setCategories((prev) => [...prev, newCategory])
            return newCategory
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    const updateCategory = async (id: string, categoryData: any) => {
        try {
            const response = await fetch(`/api/categories/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(categoryData),
            })
            if (!response.ok) throw new Error("Failed to update category")
            const updated = await response.json()
            setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)))
            return updated
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    const deleteCategory = async (id: string) => {
        try {
            const response = await fetch(`/api/categories/${id}`, {
                method: "DELETE",
            })
            if (!response.ok) throw new Error("Failed to delete category")
            setCategories((prev) => prev.filter((c) => c.id !== id))
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    return { categories, loading, error, refresh: fetchCategories, createCategory, updateCategory, deleteCategory }
}
