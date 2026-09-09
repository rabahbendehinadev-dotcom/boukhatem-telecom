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
  variantId: number | null
  quantity: number
  name: string
  price: number
  images: string[]
  optionSnapshots?: any[]
  sku?: string
  barcode?: string
  stock: number
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
  addToCart: (productId: number, quantity?: number, variantId?: number | null) => void
  updateQuantity: (productId: number, quantity: number, variantId?: number | null) => void
  removeItem: (productId: number, variantId?: number | null) => void
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
  const addToCart = useCallback(async (productId: number, quantity = 1, variantId: number | null = null) => {
    if (isAuthenticated) {
      addMutation.mutate(
        { data: { productId, quantity, variantId } as any },
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

        if (product.variants?.length > 0 && !variantId) {
          toast.error("Veuillez sélectionner une option avant d'ajouter au panier.");
          return;
        }

        let variant = null;
        if (variantId) {
          variant = product.variants?.find((v: any) => v.id === variantId);
          if (!variant || !variant.isActive || variant.stock <= 0) {
            toast.error("Cette variante est indisponible.");
            return;
          }
        } else if (product.stock <= 0) {
          toast.error("Ce produit est en rupture de stock.");
          return;
        }

        const price = variant ? variant.price : (product.discountPrice ?? product.price);
        const images = variant?.imageUrl ? [variant.imageUrl] : (Array.isArray(product.images) ? product.images : []);
        const optionSnapshots = variant?.options || [];
        const maxStock = variant ? variant.stock : product.stock;

        setGuestItems(prev => {
          const existing = prev.find(i => i.productId === productId && i.variantId === variantId)
          const newQty = existing ? Math.min(existing.quantity + quantity, maxStock) : Math.min(quantity, maxStock);

          if (existing && existing.quantity >= maxStock) {
            toast.error("Stock maximum atteint pour ce produit.");
            return prev;
          }

          const updated = existing
            ? prev.map(i => (i.productId === productId && i.variantId === variantId) ? { ...i, quantity: newQty, stock: maxStock } : i)
            : [...prev, {
                productId,
                variantId,
                quantity: newQty,
                name: product.name,
                price,
                images,
                optionSnapshots,
                sku: variant?.sku || product.sku,
                barcode: variant?.barcode || product.barcode,
                stock: maxStock,
              }]
          saveGuestItems(updated)
          return updated
        })

      } catch {
        toast.error("Impossible d'ajouter au panier.")
      }
    }
  }, [addMutation, isAuthenticated, queryClient])

  // ── removeItem ────────────────────────────────────────────────────────────
  const removeItem = useCallback((productId: number, variantId: number | null = null) => {
    if (isAuthenticated) {
      removeMutation.mutate(
        { productId, query: { variantId } } as any,
        { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() }) }
      )
    } else {
      setGuestItems(prev => {
        const updated = prev.filter(i => !(i.productId === productId && i.variantId === variantId))
        saveGuestItems(updated)
        return updated
      })
    }
  }, [removeMutation, queryClient, isAuthenticated])

  // ── updateQuantity ────────────────────────────────────────────────────────
  const updateQuantity = useCallback((productId: number, quantity: number, variantId: number | null = null) => {
    if (quantity < 1) { removeItem(productId, variantId); return }
    if (isAuthenticated) {
      updateMutation.mutate(
        { productId, data: { quantity, variantId } as any },
        { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() }) }
      )
    } else {
      setGuestItems(prev => {
        const updated = prev.map(i => {
          if (i.productId === productId && i.variantId === variantId) {
            const allowedQty = Math.min(quantity, i.stock);
            if (quantity > i.stock) toast.error("Stock maximum atteint.");
            return { ...i, quantity: allowedQty };
          }
          return i;
        })
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
