import { createContext, useContext, ReactNode, useEffect, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useGetMe, getGetMeQueryKey, type User } from "@workspace/api-client-react"

interface AuthContextType {
  user: User | null | undefined;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const token = localStorage.getItem("token")
  
  const { data: user, isLoading, isError } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
      queryKey: getGetMeQueryKey()
    }
  })

  // Clear token if user fetch fails (e.g. invalid token)
  useEffect(() => {
    if (isError) {
      localStorage.removeItem("token")
    }
  }, [isError])

  const login = useCallback((newToken: string) => {
    localStorage.setItem("token", newToken)
    queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() })
  }, [queryClient])

  const logout = useCallback(() => {
    localStorage.removeItem("token")
    queryClient.setQueryData(getGetMeQueryKey(), null)
    window.location.href = "/" // hard redirect on logout
  }, [queryClient])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === "admin",
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
