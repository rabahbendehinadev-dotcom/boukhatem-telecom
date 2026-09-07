import { useState } from 'react';
import { useListCustomers, useGetCustomer, useUpdateCustomer } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Eye, Filter, Mail, Phone, ShoppingCart, Calendar, Edit, Download, CheckSquare, Square, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getListCustomersQueryKey, getGetCustomerQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function AdminCustomers() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());

  const queryParams = { 
    page, 
    limit: limit, 
    search: search || undefined 
  };

  const { data: customersData, isLoading } = useListCustomers(queryParams, {
    query: { queryKey: getListCustomersQueryKey(queryParams) }
  });

  const { data: customerDetail, isLoading: isLoadingDetail } = useGetCustomer(
    selectedCustomerId as number,
    { query: { enabled: !!selectedCustomerId, queryKey: getGetCustomerQueryKey(selectedCustomerId as number) } }
  );

  const toggleRowSelection = (id: number) => {
    const newSet = new Set(selectedRowIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedRowIds(newSet);
  };

  const toggleAllSelection = () => {
    if (selectedRowIds.size === customersData?.customers?.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(customersData?.customers?.map(c => c.id) || []));
    }
  };

  const exportCSV = () => {
    if (!customersData?.customers?.length) return;
    const headers = ['ID', 'Nom', 'Email', 'Téléphone', 'Commandes', 'Total Dépensé', 'Date Inscription'];
    const rows = customersData.customers.map(c => [
      c.id,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.email}"`,
      `"${c.phone || ''}"`,
      c.totalOrders || 0,
      c.totalSpent || 0,
      format(new Date(c.createdAt), 'dd/MM/yyyy')
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `clients_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Clients</h2>
          <p className="text-muted-foreground text-sm">Gérez les comptes clients et consultez leur historique.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="shadow-sm bg-background" onClick={exportCSV} disabled={!customersData?.customers?.length}>
            <FileDown className="mr-2 h-4 w-4" /> Exporter (CSV)
          </Button>
        </div>
      </div>

      <Card className="border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher par nom, email ou téléphone..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background shadow-sm border-border h-9"
            />
          </div>
          <div className="text-sm text-muted-foreground font-medium">
            {customersData?.total || 0} clients au total
          </div>
        </div>

        {selectedRowIds.size > 0 && (
          <div className="bg-primary/5 border-b border-border px-4 py-2 flex items-center justify-between animate-in slide-in-from-top-2">
            <span className="text-sm font-medium text-primary">{selectedRowIds.size} sélectionné(s)</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs text-muted-foreground" onClick={() => setSelectedRowIds(new Set())}>
                Effacer la sélection
              </Button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b border-border sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 w-[40px]">
                  <button onClick={toggleAllSelection} className="text-muted-foreground hover:text-foreground focus:outline-none">
                    {selectedRowIds.size === customersData?.customers?.length && customersData?.customers?.length > 0 ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : selectedRowIds.size > 0 ? (
                      <div className="relative h-4 w-4 border rounded bg-primary border-primary flex items-center justify-center">
                        <div className="h-0.5 w-2 bg-primary-foreground rounded-full"></div>
                      </div>
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold text-center">Commandes</th>
                <th className="px-4 py-3 font-semibold text-right">Dépensé</th>
                <th className="px-4 py-3 font-semibold">Inscription</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {isLoading ? (
                Array(10).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-4" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-10 w-10 rounded-full inline-block mr-3 align-middle" /><div className="inline-block align-middle"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-20 mt-1" /></div></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-24 mt-1" /></td>
                    <td className="px-4 py-4 text-center"><Skeleton className="h-4 w-8 mx-auto" /></td>
                    <td className="px-4 py-4 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-4 text-right"><Skeleton className="h-8 w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : customersData?.customers?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Search className="h-12 w-12 mb-4 text-muted-foreground/30" />
                      <p className="text-lg font-medium text-foreground">Aucun client trouvé</p>
                    </div>
                  </td>
                </tr>
              ) : customersData?.customers.map((customer) => (
                <tr key={customer.id} className={`hover:bg-muted/30 transition-colors cursor-pointer ${selectedRowIds.has(customer.id) ? 'bg-primary/5' : ''}`} onClick={() => setSelectedCustomerId(customer.id)}>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => toggleRowSelection(customer.id)} className="text-muted-foreground hover:text-foreground focus:outline-none">
                      {selectedRowIds.has(customer.id) ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold uppercase shrink-0 border border-primary/20">
                        {customer.name.substring(0, 2)}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground group-hover:text-primary transition-colors">{customer.name}</div>
                        <div className="text-xs text-muted-foreground">ID: {customer.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 text-sm">
                      <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> {customer.email}</span>
                      {customer.phone && <span className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3.5 w-3.5" /> {customer.phone}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="secondary" className="font-mono">{customer.totalOrders || 0}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-foreground">
                    {(customer.totalSpent || 0).toLocaleString('fr-DZ')} DA
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-sm">
                    {format(new Date(customer.createdAt), 'dd MMM yyyy', { locale: fr })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {customersData && customersData.totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between bg-muted/5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Afficher</span>
              <Select value={limit.toString()} onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-8 w-[70px] bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground">
                Page {page} sur {customersData.totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-8">Précédent</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(customersData.totalPages, p + 1))} disabled={page === customersData.totalPages} className="h-8">Suivant</Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Customer Detail Sheet */}
      <Sheet open={!!selectedCustomerId} onOpenChange={(open) => !open && setSelectedCustomerId(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto sm:w-[540px] flex flex-col p-0 bg-background">
          {isLoadingDetail ? (
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-6 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
              <Skeleton className="h-32 w-full rounded-xl" />
              <div className="space-y-4 pt-6">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
            </div>
          ) : customerDetail && (
            <>
              <div className="p-6 border-b border-border bg-muted/10 shrink-0">
                <SheetHeader className="text-left">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold uppercase border-2 border-primary/20">
                      {customerDetail.user.name.substring(0, 2)}
                    </div>
                    <div>
                      <SheetTitle className="text-xl">{customerDetail.user.name}</SheetTitle>
                      <SheetDescription className="flex flex-col gap-1 mt-1">
                        <span className="flex items-center gap-1.5 text-foreground/80"><Mail className="h-3.5 w-3.5" /> {customerDetail.user.email}</span>
                        {customerDetail.user.phone && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {customerDetail.user.phone}</span>}
                      </SheetDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {customerDetail.user.isBlocked && <Badge variant="destructive">Compte bloqué</Badge>}
                    <Badge variant="outline" className="bg-background">Membre depuis le {format(new Date(customerDetail.user.createdAt), 'dd MMMM yyyy', { locale: fr })}</Badge>
                  </div>
                </SheetHeader>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 bg-muted/5">
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <Card className="border-border shadow-sm">
                    <CardContent className="p-4 flex flex-col justify-center items-center text-center h-full">
                      <ShoppingCart className="h-6 w-6 text-secondary mb-2 opacity-80" />
                      <div className="text-3xl font-extrabold text-foreground">{customerDetail.user.totalOrders || 0}</div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mt-1">Commandes</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border shadow-sm">
                    <CardContent className="p-4 flex flex-col justify-center items-center text-center h-full">
                      <div className="h-6 w-6 rounded bg-primary/10 text-primary font-bold flex items-center justify-center mb-2">DA</div>
                      <div className="text-xl font-extrabold text-foreground">{(customerDetail.user.totalSpent || 0).toLocaleString('fr-DZ')}</div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mt-1">Total Dépensé</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground border-b border-border pb-2 text-sm uppercase tracking-wider">Historique des commandes</h3>
                  
                  {customerDetail.orders.length === 0 ? (
                    <div className="text-center p-8 bg-background border border-dashed border-border rounded-xl">
                      <p className="text-muted-foreground text-sm">Ce client n'a pas encore passé de commande.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {customerDetail.orders.map((order) => (
                        <a key={order.id} href={`/admin/orders?id=${order.id}`} className="block">
                          <Card className="border-border shadow-sm hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group bg-background">
                            <CardContent className="p-4 flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold text-sm group-hover:text-primary transition-colors">#{order.id}</span>
                                  <Badge variant="outline" className={`px-1.5 py-0 text-[10px] uppercase font-bold
                                    ${order.status === 'pending' ? 'bg-warning/10 text-warning-foreground border-warning/20' : ''}
                                    ${order.status === 'confirmed' ? 'bg-blue-500/10 text-blue-600 border-blue-200' : ''}
                                    ${order.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : ''}
                                    ${order.status === 'cancelled' ? 'bg-destructive/10 text-destructive border-destructive/20' : ''}
                                  `}>
                                    {order.status}
                                  </Badge>
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(order.createdAt), 'dd MMM yyyy', { locale: fr })}
                                </div>
                              </div>
                              <div className="font-bold text-foreground">
                                {order.total.toLocaleString('fr-DZ')} DA
                              </div>
                            </CardContent>
                          </Card>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
