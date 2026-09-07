import { createContext, useContext, ReactNode, useCallback, useState, useEffect } from "react"
import {
  useGetCart, useAddToCart, useUpdateCartItem, useRemoveFromCart, useClearCart,
  getGetCartQueryKey
} from "@workspace/api-client-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"

// ─── Guest cart (localStorage) ───────────────────────────────────────────────

const GUEST_CART_KEY = "repair_guest_cart"

export interface GuestCartItem {
  productId: number
  quantity: number
  name: string
  price: number
  images: string[]
}

function loadGuestItems(): GuestCartItem[] {
  try { return JSON.parse(localStorage.getItem(GUEST_CART_KEY) || "[]") }
  catch { return [] }
}

function saveGuestItems(items: GuestCartItem[]) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items))
}

function buildGuestCart(items: GuestCartItem[], shippingCost: number) {
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  return {
    items,
    itemCount: items.reduce((s, i) => s + i.quantity, 0),
    subtotal,
    discount: 0,
    couponDiscount: 0,
    couponCode: null as string | null,
    shipping: shippingCost,
    total: subtotal + shippingCost,
  }
}

// ─── Context type ─────────────────────────────────────────────────────────────

interface CartContextType {
  cart: ReturnType<typeof buildGuestCart> | any
  isLoading: boolean
  isGuest: boolean
  addToCart: (productId: number, quantity?: number) => void
  updateQuantity: (productId: number, quantity: number) => void
  removeItem: (productId: number) => void
  clearCart: () => void
  itemCount: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const queryClient = useQueryClient()

  // Fetch shipping cost from admin settings — single source of truth
  const { data: settingsData } = useQuery({
    queryKey: ['public-settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings')
      if (!res.ok) return { shippingCost: 0 }
      return res.json()
    },
    staleTime: 2 * 60 * 1000,
  })
  const shippingCost: number = settingsData?.shippingCost ?? 0

  // Guest cart — initialised from localStorage
  const [guestItems, setGuestItems] = useState<GuestCartItem[]>(loadGuestItems)

  // Keep localStorage in sync whenever guest items change
  useEffect(() => {
    if (!isAuthenticated) saveGuestItems(guestItems)
  }, [guestItems, isAuthenticated])

  // API cart — only enabled when the user is logged in
  const { data: apiCart, isLoading } = useGetCart({
    query: {
      enabled: isAuthenticated,
      queryKey: getGetCartQueryKey(),
    },
  })

  const addMutation    = useAddToCart()
  const updateMutation = useUpdateCartItem()
  const removeMutation = useRemoveFromCart()
  const clearMutation  = useClearCart()

  // ── addToCart — no auth guard; works for guests via localStorage ──────────
  const addToCart = useCallback(async (productId: number, quantity = 1) => {
    if (isAuthenticated) {
      addMutation.mutate(
        { data: { productId, quantity } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() })
          },
          onError: () => {
            toast.error("Impossible d'ajouter au panier.")
          },
        }
      )
    } else {
      // Guest: fetch product details, then persist to localStorage
      try {
        const res = await fetch(`/api/products/${productId}`)
        if (!res.ok) throw new Error("product fetch failed")
        const product = await res.json()

        setGuestItems(prev => {
          const existing = prev.find(i => i.productId === productId)
          const updated = existing
            ? prev.map(i => i.productId === productId ? { ...i, quantity: i.quantity + quantity } : i)
            : [...prev, {
                productId,
                quantity,
                name: product.name,
                price: product.discountPrice ?? product.price,
                images: Array.isArray(product.images) ? product.images : [],
              }]
          saveGuestItems(updated)
          return updated
        })

      } catch {
        toast.error("Impossible d'ajouter au panier.")
      }
    }
  }, [addMutation, isAuthenticated, queryClient, toast])

  // ── removeItem ────────────────────────────────────────────────────────────
  const removeItem = useCallback((productId: number) => {
    if (isAuthenticated) {
      removeMutation.mutate(
        { productId },
        { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() }) }
      )
    } else {
      setGuestItems(prev => {
        const updated = prev.filter(i => i.productId !== productId)
        saveGuestItems(updated)
        return updated
      })
    }
  }, [removeMutation, queryClient, isAuthenticated])

  // ── updateQuantity ────────────────────────────────────────────────────────
  const updateQuantity = useCallback((productId: number, quantity: number) => {
    if (quantity < 1) { removeItem(productId); return }
    if (isAuthenticated) {
      updateMutation.mutate(
        { productId, data: { quantity } },
        { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() }) }
      )
    } else {
      setGuestItems(prev => {
        const updated = prev.map(i => i.productId === productId ? { ...i, quantity } : i)
        saveGuestItems(updated)
        return updated
      })
    }
  }, [updateMutation, queryClient, removeItem, isAuthenticated])

  // ── clearCart ─────────────────────────────────────────────────────────────
  const clearCart = useCallback(() => {
    if (isAuthenticated) {
      clearMutation.mutate(undefined, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() })
      })
    } else {
      setGuestItems([])
      localStorage.removeItem(GUEST_CART_KEY)
    }
  }, [clearMutation, queryClient, isAuthenticated])

  const cart      = isAuthenticated ? apiCart : buildGuestCart(guestItems, shippingCost)
  const itemCount = (cart as any)?.itemCount ?? 0

  return (
    <CartContext.Provider value={{
      cart,
      isLoading: isAuthenticated ? isLoading : false,
      isGuest: !isAuthenticated,
      addToCart,
      updateQuantity,
      removeItem,
      clearCart,
      itemCount,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error("useCart must be used within a CartProvider")
  return context
}
