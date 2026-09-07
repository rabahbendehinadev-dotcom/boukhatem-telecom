import React, { ReactNode, useEffect } from 'react';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { useLocation, Link } from 'wouter';
import { 
  LayoutDashboard, Box, Tags, ShoppingCart, Users, Ticket, Truck, Building2,
  Image as ImageIcon, Settings, Activity, LogOut, ChevronDown, UserCircle, Bell, Search, Sun, Moon, Laptop, Shield, MapPin
} from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarInset,
  SidebarTrigger,
  useSidebar
} from '@/components/ui/sidebar';
import { ThemeProvider, useTheme } from '@/hooks/use-theme';
import { AdminErrorBoundary } from '@/components/admin/admin-error-boundary';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

const navGroups = [
  {
    title: 'Tableau de bord',
    items: [
      { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    ]
  },
  {
    title: 'Catalogue',
    items: [
      { label: 'Produits', href: '/admin/products', icon: Box },
      { label: 'Catégories', href: '/admin/categories', icon: Tags },
      { label: 'Marques', href: '/admin/brands', icon: Box },
    ]
  },
  {
    title: 'Commerce',
    items: [
      { label: 'Commandes', href: '/admin/orders', icon: ShoppingCart },
      { label: 'Clients', href: '/admin/customers', icon: Users },
      { label: 'Coupons', href: '/admin/coupons', icon: Ticket },
    ]
  },
  {
    title: 'Livraison',
    items: [
    ]
  },
  {
    title: 'Contenu',
    items: [
      { label: 'Bannières', href: '/admin/banners', icon: ImageIcon },
      { label: 'Paramètres', href: '/admin/settings', icon: Settings },
    ]
  },
  {
    title: 'Administration',
    items: [
      { label: 'Utilisateurs', href: '/admin/users', icon: Shield },
      { label: 'Activité', href: '/admin/activity', icon: Activity },
    ]
  }
];

function AdminHeader() {
  const { adminUser, logout } = useAdminAuth();
  const { theme, setTheme } = useTheme();
  const [location] = useLocation();

  // Basic breadcrumb logic
  const paths = location.split('/').filter(Boolean);
  const breadcrumbs = paths.map((path, index) => {
    const href = `/${paths.slice(0, index + 1).join('/')}`;
    const isLast = index === paths.length - 1;
    // Map path to readable name
    const labelMap: Record<string, string> = {
      admin: 'Administration',
      dashboard: 'Dashboard',
      products: 'Produits',
      categories: 'Catégories',
      brands: 'Marques',
      orders: 'Commandes',
      customers: 'Clients',
      coupons: 'Coupons',
      banners: 'Bannières',
      settings: 'Paramètres',
      users: 'Utilisateurs',
      activity: 'Activité',
      'shipping-rates': 'Tarifs de livraison',
      'shipping-offices': 'Bureaux Stop Desk',
    };
    return {
      href,
      label: labelMap[path] || path,
      isLast
    };
  });

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4 shadow-sm md:px-6">
      <SidebarTrigger className="-ml-2" />
      <div className="mr-2 hidden md:block">
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.href}>
                <BreadcrumbItem>
                  {crumb.isLast ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={crumb.href} asChild>
                      <Link href={crumb.href}>{crumb.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!crumb.isLast && <BreadcrumbSeparator />}
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="ml-auto flex items-center space-x-4">
        <div className="relative hidden w-64 md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Rechercher partout..."
            className="w-full appearance-none bg-background pl-8 shadow-none"
          />
        </div>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-destructive"></span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Changer le thème</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun className="mr-2 h-4 w-4" /> Clair
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon className="mr-2 h-4 w-4" /> Sombre
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              <Laptop className="mr-2 h-4 w-4" /> Système
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {adminUser && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 rounded-full pl-2 pr-4 flex items-center gap-2 border border-border/50 bg-background/50 hover:bg-accent">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UserCircle className="h-4 w-4" />
                </div>
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-medium leading-none">{adminUser.fullName || adminUser.username}</span>
                  <span className="text-[10px] text-muted-foreground mt-1 capitalize">{adminUser.role.replace('_', ' ')}</span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{adminUser.fullName}</p>
                  <p className="text-xs leading-none text-muted-foreground">{adminUser.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/admin/settings" className="cursor-pointer flex w-full items-center">
                  <Settings className="mr-2 h-4 w-4" /> Paramètres
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive focus:bg-destructive/10 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" /> Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}

function AdminSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border shadow-sm z-50">
      <SidebarHeader className="h-16 flex items-center px-4 border-b border-sidebar-border bg-sidebar-background">
        <Link href="/admin" className="flex items-center gap-2 font-bold text-xl text-sidebar-primary tracking-tight overflow-hidden transition-all group-data-[collapsible=icon]:w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <span className="truncate">Repair<span className="text-secondary">DZ</span></span>
        </Link>
      </SidebarHeader>
      
      <SidebarContent>
        {navGroups.map((group, idx) => (
          <SidebarGroup key={idx}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item, iIdx) => {
                  const isActive = location === item.href || (item.href !== '/admin' && location.startsWith(item.href));
                  return (
                    <SidebarMenuItem key={iIdx}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center justify-center group-data-[collapsible=icon]:hidden text-xs text-muted-foreground">
          v1.0.0
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { adminUser, isLoading, logout } = useAdminAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !adminUser) {
      setLocation('/admin/login');
    }
  }, [isLoading, adminUser, setLocation]);

  useEffect(() => {
    if (!isLoading && adminUser?.mustChangePassword && location !== '/admin/settings') {
      toast.error('Vous devez changer votre mot de passe');
      setLocation('/admin/settings');
    }
  }, [isLoading, adminUser, location, setLocation]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    </div>;
  }

  if (!adminUser) {
    return null;
  }

  return (
    <ThemeProvider storageKey="admin-theme">
      <SidebarProvider defaultOpen={true}>
        <div className="flex min-h-screen w-full bg-muted/10 font-sans">
          <AdminSidebar />
          <SidebarInset className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
            <AdminHeader />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
              <div className="mx-auto w-full max-w-7xl animate-in fade-in duration-300">
                <AdminErrorBoundary>
                  {children}
                </AdminErrorBoundary>
              </div>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}
