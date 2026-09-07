import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';

export type AdminUser = {
  id: number;
  fullName: string;
  username: string;
  email: string;
  role: 'super_admin' | 'admin' | 'stock_manager' | 'order_manager' | 'employee';
  permissions: string[];
  isActive: boolean;
  mustChangePassword?: boolean;
  lastLogin?: string;
};

interface AdminAuthContextType {
  adminUser: AdminUser | null;
  isLoading: boolean;
  login: (credentials: any) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/admin/auth/me', { credentials: 'include' });
      if (res.ok) {
        const user = await res.json();
        setAdminUser(user);
      } else {
        setAdminUser(null);
      }
    } catch (e) {
      setAdminUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (credentials: any) => {
    const res = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error('Email ou mot de passe incorrect');
    }
    await checkAuth();
  };

  const logout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST', credentials: 'include' });
    } finally {
      setAdminUser(null);
      setLocation('/admin/login');
    }
  };

  return (
    <AdminAuthContext.Provider value={{ adminUser, isLoading, login, logout, checkAuth }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}