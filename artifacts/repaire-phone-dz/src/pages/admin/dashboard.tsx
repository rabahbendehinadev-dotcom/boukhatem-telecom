import { useState } from 'react';
import { useGetAdminDashboard, useGetSalesChart } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, ShoppingCart, Users, Package, TrendingUp, AlertTriangle, ArrowRight, Activity, Calendar, ImageIcon, Settings, Ticket, CreditCard } from 'lucide-react';
import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading, error: statsError, refetch } = useGetAdminDashboard();

  const [salesPeriod, setSalesPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const { data: salesData, isLoading: salesLoading } = useGetSalesChart({ period: salesPeriod });

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (statsError || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <div>
          <p className="font-semibold text-foreground text-lg">Impossible de charger le tableau de bord</p>
          <p className="text-sm text-muted-foreground mt-1">
            {statsError ? 'Erreur lors de la récupération des données.' : 'Aucune donnée disponible.'}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-sm font-medium"
        >
          <TrendingUp className="h-4 w-4" /> Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Vue d'ensemble</h2>
          <p className="text-muted-foreground">Voici l'état de votre boutique aujourd'hui.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {stats.pendingOrders > 0 && (
            <Link href="/admin/orders?status=pending">
              <Badge variant="outline" className="bg-warning/10 text-warning-foreground border-warning/20 hover:bg-warning/20 cursor-pointer transition-colors px-3 py-1 text-sm">
                <Activity className="mr-1.5 h-3.5 w-3.5" /> {stats.pendingOrders} Commande(s) en attente
              </Badge>
            </Link>
          )}
          {(stats.pendingPayments ?? 0) > 0 && (
            <Link href="/admin/orders">
              <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-200 cursor-pointer hover:bg-amber-500/20 transition-colors px-3 py-1 text-sm">
                <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                {stats.pendingPayments} paiement(s) à vérifier
              </Badge>
            </Link>
          )}
          {stats.lowStockCount > 0 && (
            <Link href="/admin/products?stock=low">
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 cursor-pointer transition-colors px-3 py-1 text-sm">
                <AlertTriangle className="mr-1.5 h-3.5 w-3.5" /> {stats.lowStockCount} Produit(s) stock bas
              </Badge>
            </Link>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Chiffre d'affaires — emerald */}
        <Card className="shadow-sm border-border overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-l-xl" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pl-5">
            <CardTitle className="text-sm font-medium text-muted-foreground">Chiffre d'affaires</CardTitle>
            <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <DollarSign className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent className="pl-5">
            <div className="text-2xl font-extrabold text-foreground tracking-tight">
              {stats.totalSales.toLocaleString('fr-DZ')} <span className="text-sm font-normal text-muted-foreground ml-1">DA</span>
            </div>
            {stats.salesThisMonth !== undefined && (
              <p className="text-xs mt-2 flex items-center gap-1">
                <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-700 px-1.5 py-0 shadow-none font-semibold">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +{stats.salesThisMonth.toLocaleString('fr-DZ')} DA
                </Badge>
                <span className="text-muted-foreground ml-1">ce mois</span>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Commandes — blue */}
        <Card className="shadow-sm border-border overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-xl" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pl-5">
            <CardTitle className="text-sm font-medium text-muted-foreground">Commandes</CardTitle>
            <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
              <ShoppingCart className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent className="pl-5">
            <div className="text-2xl font-extrabold text-foreground tracking-tight">{stats.totalOrders}</div>
            {stats.ordersThisMonth !== undefined && (
              <p className="text-xs mt-2 flex items-center gap-1">
                <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-700 px-1.5 py-0 shadow-none font-semibold">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +{stats.ordersThisMonth}
                </Badge>
                <span className="text-muted-foreground ml-1">ce mois</span>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Clients — orange */}
        <Card className="shadow-sm border-border overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500 rounded-l-xl" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pl-5">
            <CardTitle className="text-sm font-medium text-muted-foreground">Clients Inscrits</CardTitle>
            <div className="h-9 w-9 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
              <Users className="h-4.5 w-4.5 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent className="pl-5">
            <div className="text-2xl font-extrabold text-foreground tracking-tight">{stats.totalCustomers}</div>
            <p className="text-xs mt-2 text-muted-foreground">clients inscrits</p>
          </CardContent>
        </Card>

        {/* Produits — violet */}
        <Card className="shadow-sm border-border overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500 rounded-l-xl" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pl-5">
            <CardTitle className="text-sm font-medium text-muted-foreground">Produits Actifs</CardTitle>
            <div className="h-9 w-9 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
              <Package className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400" />
            </div>
          </CardHeader>
          <CardContent className="pl-5">
            <div className="text-2xl font-extrabold text-foreground tracking-tight">{stats.totalProducts}</div>
            {stats.lowStockCount > 0 && (
              <p className="text-xs mt-2">
                <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-400 dark:border-red-700 px-1.5 py-0 shadow-none font-semibold gap-1">
                  <AlertTriangle className="h-3 w-3" /> {stats.lowStockCount} alerte(s) stock
                </Badge>
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        {/* Charts */}
        <Card className="lg:col-span-4 shadow-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border bg-muted/5 rounded-t-xl">
            <div className="space-y-1">
              <CardTitle className="text-base">Évolution des Ventes</CardTitle>
              <CardDescription>Visualisez vos revenus et commandes dans le temps</CardDescription>
            </div>
            <Select value={salesPeriod} onValueChange={(v: any) => setSalesPeriod(v)}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <Calendar className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 derniers jours</SelectItem>
                <SelectItem value="30d">30 derniers jours</SelectItem>
                <SelectItem value="90d">3 derniers mois</SelectItem>
                <SelectItem value="1y">Cette année</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="pt-6">
            {salesLoading ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">Chargement des données...</div>
            ) : salesData?.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">Aucune donnée sur cette période</div>
            ) : (
              <div className="h-[300px]">
                <ChartContainer
                  config={{
                    sales: { label: "Revenus", color: "hsl(var(--primary))" },
                    orders: { label: "Commandes", color: "hsl(var(--secondary))" },
                  }}
                  className="w-full h-full"
                >
                  {salesPeriod === '1y' ? (
                    <BarChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} />
                      <YAxis yAxisId="left" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `${value / 1000}k`} />
                      <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tickMargin={8} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar yAxisId="left" dataKey="sales" fill="var(--color-sales)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  ) : (
                    <AreaChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="fillSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-sales)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--color-sales)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32}
                        tickFormatter={(value) => format(new Date(value), 'dd MMM', { locale: fr })} />
                      <YAxis yAxisId="left" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `${value >= 1000 ? value / 1000 + 'k' : value}`} />
                      <ChartTooltip content={<ChartTooltipContent labelFormatter={(value) => format(new Date(value), 'dd MMMM yyyy', { locale: fr })} />} />
                      <Area yAxisId="left" type="monotone" dataKey="sales" stroke="var(--color-sales)" strokeWidth={2} fill="url(#fillSales)" />
                    </AreaChart>
                  )}
                </ChartContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="lg:col-span-3 shadow-sm border-border flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border bg-muted/5 rounded-t-xl">
            <CardTitle className="text-base">Dernières Commandes</CardTitle>
            <Button variant="ghost" size="sm" asChild className="h-8 text-xs text-primary -mr-2">
              <Link href="/admin/orders">
                Tout voir <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            {stats.recentOrders?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Aucune commande récente.</div>
            ) : (
              <div className="divide-y divide-border">
                {stats.recentOrders?.slice(0, 5).map((order) => (
                  <Link key={order.id} href={`/admin/orders?id=${order.id}`}>
                    <div className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <ShoppingCart className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm group-hover:text-primary transition-colors">
                            Commande #{order.id}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {order.userName || order.userEmail || 'Client'} • {format(new Date(order.createdAt), 'dd/MM HH:mm')}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="font-bold text-sm text-foreground">{order.total.toLocaleString('fr-DZ')} DA</span>
                        <Badge variant="outline" className={`px-1.5 py-0 text-[10px] uppercase font-bold
                          ${order.status === 'pending' ? 'bg-warning/10 text-warning-foreground border-warning/20' : ''}
                          ${order.status === 'confirmed' ? 'bg-blue-500/10 text-blue-600 border-blue-200' : ''}
                          ${order.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : ''}
                          ${order.status === 'cancelled' ? 'bg-destructive/10 text-destructive border-destructive/20' : ''}
                        `}>
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card className="shadow-sm border-border flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border bg-muted/5 rounded-t-xl">
            <CardTitle className="text-base">Produits les plus vendus</CardTitle>
            <Button variant="ghost" size="sm" asChild className="h-8 text-xs text-primary -mr-2">
              <Link href="/admin/products">
                Inventaire <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {stats.topProducts?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Aucune donnée disponible.</div>
            ) : (
              <div className="divide-y divide-border">
                {stats.topProducts?.slice(0, 5).map((product, idx) => (
                  <div key={product.id} className="p-4 flex items-center gap-4 hover:bg-muted/10 transition-colors">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground shrink-0">
                      {idx + 1}
                    </div>
                    <div className="h-12 w-12 rounded-md bg-muted/50 p-1 flex items-center justify-center shrink-0 border border-border">
                      <img src={product.images?.[0] || 'https://placehold.co/40'} alt={product.name} className="max-h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate text-foreground">{product.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{product.price.toLocaleString('fr-DZ')} DA</div>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <Badge variant="outline" className={cn(
                        'text-xs font-semibold',
                        product.stock === 0 ? 'bg-red-600 text-white border-red-700' :
                        product.stock <= 5  ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-400 dark:border-red-700' :
                        product.stock <= 10 ? 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-700' :
                        'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-700'
                      )}>
                        {product.stock} en stock
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Shortcuts */}
        <Card className="shadow-sm border-border bg-gradient-to-br from-sidebar to-background">
          <CardHeader className="pb-2 border-b border-border/50">
            <CardTitle className="text-base">Actions Rapides</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <Link href="/admin/products/new">
                <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2 border-border/60 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all shadow-sm">
                  <Package className="h-5 w-5" />
                  <span>Ajouter un produit</span>
                </Button>
              </Link>
              <Link href="/admin/coupons/new">
                <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2 border-border/60 hover:border-secondary hover:text-secondary hover:bg-secondary/5 transition-all shadow-sm">
                  <Ticket className="h-5 w-5" />
                  <span>Créer un coupon</span>
                </Button>
              </Link>
              <Link href="/admin/banners">
                <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2 border-border/60 hover:border-navy hover:text-navy hover:bg-navy/5 transition-all shadow-sm">
                  <ImageIcon className="h-5 w-5" />
                  <span>Gérer les bannières</span>
                </Button>
              </Link>
              <Link href="/admin/settings">
                <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2 border-border/60 hover:border-foreground hover:text-foreground hover:bg-accent transition-all shadow-sm">
                  <Settings className="h-5 w-5" />
                  <span>Paramètres boutique</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
