import { createContext, useContext, ReactNode, useState, useEffect } from "react"
import { useGetWishlist, useAddToWishlist, useRemoveFromWishlist, getGetWishlistQueryKey } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"

interface WishlistContextType {
  items: any[];
  isLoading: boolean;
  toggleWishlist: (productId: number) => void;
  isInWishlist: (productId: number) => boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  const { data: wishlist, isLoading } = useGetWishlist({
    query: {
      enabled: isAuthenticated,
      queryKey: getGetWishlistQueryKey()
    }
  })

  const items = wishlist || []

  const addMutation = useAddToWishlist()
  const removeMutation = useRemoveFromWishlist()

  const isInWishlist = (productId: number) => {
    return items.some((item: any) => item.id === productId)
  }

  const toggleWishlist = (productId: number) => {
    if (!isAuthenticated) {
      toast({ title: "Connexion requise", description: "Veuillez vous connecter pour gérer vos favoris", variant: "destructive" })
      return
    }
    
    if (isInWishlist(productId)) {
      removeMutation.mutate(
        { productId },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetWishlistQueryKey() })
            toast({ title: "Retiré des favoris" })
          }
        }
      )
    } else {
      addMutation.mutate(
        { productId },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetWishlistQueryKey() })
            toast({ title: "Ajouté aux favoris" })
          }
        }
      )
    }
  }

  return (
    <WishlistContext.Provider
      value={{
        items,
        isLoading,
        toggleWishlist,
        isInWishlist
      }}
    >
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const context = useContext(WishlistContext)
  if (context === undefined) {
    throw new Error("useWishlist must be used within a WishlistProvider")
  }
  return context
}
