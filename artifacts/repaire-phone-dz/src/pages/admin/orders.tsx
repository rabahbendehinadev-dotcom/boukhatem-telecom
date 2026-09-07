import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Search, Eye, Filter, Download, MapPin, User, Package, Calendar, CheckSquare, Square, Printer, CreditCard, ExternalLink, CheckCircle2, XCircle, Truck, Banknote, Clock, Send, RefreshCw, RotateCcw, Home, Building2, Trash2, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { useListAllOrders, useUpdateOrderStatus, getListAllOrdersQueryKey } from '@workspace/api-client-react';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: 'pending',    label: 'En attente',      color: 'bg-amber-100   text-amber-700   border-amber-300   dark:bg-amber-900/40  dark:text-amber-400  dark:border-amber-700' },
  { value: 'confirmed',  label: 'Confirmée',        color: 'bg-blue-100    text-blue-700    border-blue-300    dark:bg-blue-900/40   dark:text-blue-400   dark:border-blue-700' },
  { value: 'processing', label: 'En préparation',   color: 'bg-purple-100  text-purple-700  border-purple-300  dark:bg-purple-900/40 dark:text-purple-400 dark:border-purple-700' },
  { value: 'shipped',    label: 'Expédiée',         color: 'bg-indigo-100  text-indigo-700  border-indigo-300  dark:bg-indigo-900/40 dark:text-indigo-400 dark:border-indigo-700' },
  { value: 'delivered',  label: 'Livrée',           color: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-700' },
  { value: 'cancelled',  label: 'Annulée',          color: 'bg-red-100     text-red-700     border-red-300     dark:bg-red-900/40    dark:text-red-400    dark:border-red-700' },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: 'all', label: 'Tous les paiements' },
  { value: 'pending', label: 'En attente' },
  { value: 'awaiting_confirmation', label: 'Preuve envoyée' },
  { value: 'confirmed', label: 'Confirmé' },
  { value: 'failed', label: 'Échoué' },
];

const PAYMENT_METHOD_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  cash_on_delivery: { label: 'À la livraison', icon: <Truck className="h-3.5 w-3.5" /> },
  bank_transfer: { label: 'Virement', icon: <Banknote className="h-3.5 w-3.5" /> },
  cib_edahabia: { label: 'CIB/Edahabia', icon: <CreditCard className="h-3.5 w-3.5" /> },
};

// ── WhatsApp / customer helpers ───────────────────────────────────────────────

const WaIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

/** Normalize Algerian phone → 213XXXXXXXXX. Returns null if unparseable. */
function normalizeAlgerianPhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-().+]/g, '');
  if (!cleaned) return null;
  if (/^213\d{9}$/.test(cleaned)) return cleaned;
  if (/^0\d{9}$/.test(cleaned)) return '213' + cleaned.slice(1);
  if (/^\d{9}$/.test(cleaned)) return '213' + cleaned;
  return null;
}

/** Extract customer name, phone, location from order snapshot fields. */
function extractCustomer(order: any) {
  const addr = (order.shippingAddress as any) || {};
  return {
    name: addr.fullName || order.userName || 'Client sans nom',
    phone: addr.phone || null,
    wilaya: addr.wilaya || order.shippingWilayaName || null,
    commune: addr.commune || null,
    email: order.userEmail || null,
  };
}

/** Get product summary lines from order items. */
function getProductLines(items: any[]): Array<{ name: string; qty: number; sku?: string }> {
  if (!Array.isArray(items) || items.length === 0) return [];
  return items.map((item) => ({
    name: item.name || item.productName || 'Produit',
    qty: Number(item.quantity ?? item.qty ?? 1),
    sku: item.sku || item.productSku || undefined,
  }));
}

/** Build WhatsApp pre-filled URL for an order. Returns null if phone is invalid. */
function buildWhatsAppUrl(order: any): string | null {
  const customer = extractCustomer(order);
  if (!customer.phone) return null;
  const normalized = normalizeAlgerianPhone(customer.phone);
  if (!normalized) return null;
  const lines = getProductLines(order.items || []);
  const productSummary = lines.length > 0
    ? lines.map((p) => `• ${p.name} × ${p.qty}`).join('\n')
    : 'Produit non renseigné';
  const deliveryLabel = order.deliveryType === 'home' ? 'Domicile'
    : order.deliveryType === 'office' ? 'Bureau' : 'Non précisé';
  const message =
    `Bonjour ${customer.name},\n\nNous vous contactons concernant votre commande #${order.id} chez BOUKHATEM TELECOM.\n\nProduits :\n${productSummary}\n\nMode de livraison : ${deliveryLabel}\nTotal : ${Number(order.total).toLocaleString('fr-DZ')} DA\n\nMerci de confirmer votre commande et vos informations de livraison.`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export default function AdminOrders() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [paymentNotes, setPaymentNotes] = useState('');
  const [noestSending, setNoestSending] = useState(false);
  const [noestSyncing, setNoestSyncing] = useState(false);
  const [noestDeliveryType, setNoestDeliveryType] = useState<'home_delivery' | 'stop_desk'>('home_delivery');
  const [deliveryFilter, setDeliveryFilter] = useState<'all' | 'home' | 'office'>('all');
  const [deleteConfirmOrder, setDeleteConfirmOrder] = useState<{ id: number; num: number } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const queryClient = useQueryClient();

  // Debounce search so API isn't called on every keystroke
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const queryParams = {
    page,
    limit,
    search: debouncedSearch || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    paymentStatus: paymentStatusFilter !== 'all' ? paymentStatusFilter : undefined,
  };

  const { data: ordersData, isLoading } = useListAllOrders(queryParams, { query: { queryKey: getListAllOrdersQueryKey(queryParams) } });

  const updateStatus = useUpdateOrderStatus();

  const handleUpdatePayment = async (orderId: number, newPaymentStatus: string) => {
    try {
      await fetch(`/api/orders/${orderId}/payment-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ paymentStatus: newPaymentStatus, paymentNotes: paymentNotes || undefined }),
      }).then(r => { if (!r.ok) throw new Error(); });
      toast.success(newPaymentStatus === 'confirmed' ? 'Paiement confirmé ✓' : 'Statut de paiement mis à jour');
      queryClient.invalidateQueries({ queryKey: getListAllOrdersQueryKey() });
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, paymentStatus: newPaymentStatus });
      }
      setPaymentNotes('');
    } catch {
      toast.error('Erreur lors de la mise à jour du paiement');
    }
  };

  const handleUpdateStatus = async (orderId: number, newStatus: any) => {
    try {
      await updateStatus.mutateAsync({ id: orderId, data: { status: newStatus } });
      toast.success('Statut mis à jour');
      queryClient.invalidateQueries({ queryKey: getListAllOrdersQueryKey() });
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (err: any) {
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const handleDeleteOrder = async () => {
    if (!deleteConfirmOrder) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/orders/${deleteConfirmOrder.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error();
      toast.success(`Commande #${deleteConfirmOrder.num} supprimée`);
      setDeleteConfirmOrder(null);
      if (selectedOrder?.id === deleteConfirmOrder.id) setSelectedOrder(null);
      queryClient.invalidateQueries({ queryKey: getListAllOrdersQueryKey() });
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  // ── NOEST helpers ─────────────────────────────────────────────────────────

  const DELIVERY_STATUS_LABELS: Record<string, { label: string; color: string }> = {
    sent_to_noest:   { label: 'Envoyé à NOEST',    color: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-400' },
    en_preparation:  { label: 'En préparation',     color: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/40 dark:text-purple-400' },
    expedie:         { label: 'Expédié',            color: 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/40 dark:text-indigo-400' },
    en_transit:      { label: 'En transit',         color: 'bg-cyan-100 text-cyan-700 border-cyan-300 dark:bg-cyan-900/40 dark:text-cyan-400' },
    en_livraison:    { label: 'En livraison',       color: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-400' },
    livre:           { label: 'Livré',              color: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-400' },
    echec_livraison: { label: 'Échec de livraison', color: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-400' },
    retour:          { label: 'Retour',             color: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/40 dark:text-orange-400' },
    annule:          { label: 'Annulé',             color: 'bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400' },
  };

  const handleSendToNoest = async (orderId: number) => {
    setNoestSending(true);
    try {
      const res = await fetch(`/api/admin/noest/shipments/${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ deliveryType: noestDeliveryType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`);
      toast.success(`Envoyé à NOEST ✓ — Tracking: ${data.trackingNumber}`);
      queryClient.invalidateQueries({ queryKey: getListAllOrdersQueryKey() });
      setSelectedOrder((o: any) => o ? { ...o, deliveryProvider: 'noest', noestShipmentId: data.shipmentId, trackingNumber: data.trackingNumber, trackingUrl: data.trackingUrl, labelUrl: data.labelUrl, deliveryStatus: data.deliveryStatus, sentToCarrierAt: new Date().toISOString() } : o);
    } catch (err: any) {
      toast.error(err.message ?? 'Erreur lors de l\'envoi à NOEST');
    } finally {
      setNoestSending(false);
    }
  };

  const handleSyncNoest = async (orderId: number) => {
    setNoestSyncing(true);
    try {
      const res = await fetch(`/api/admin/noest/shipments/${orderId}/sync`, {
        method: 'POST', credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      const cfg = DELIVERY_STATUS_LABELS[data.status];
      toast.success(`Statut mis à jour → ${cfg?.label ?? data.status}`);
      queryClient.invalidateQueries({ queryKey: getListAllOrdersQueryKey() });
      setSelectedOrder((o: any) => o ? { ...o, deliveryStatus: data.status } : o);
    } catch (err: any) {
      toast.error(err.message ?? 'Erreur de synchronisation');
    } finally {
      setNoestSyncing(false);
    }
  };

  const getDeliveryBadge = (deliveryType: string | null | undefined) => {
    if (deliveryType === 'home') return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-900/40 dark:text-sky-400 dark:border-sky-700">
        <Home className="h-3 w-3" /> Domicile
      </span>
    );
    if (deliveryType === 'office') return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-700">
        <Building2 className="h-3 w-3" /> Bureau
      </span>
    );
    return <span className="text-xs text-muted-foreground">—</span>;
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_OPTIONS.find(s => s.value === status);
    if (!config) return <Badge variant="outline" className="uppercase text-[10px]">{status}</Badge>;
    return <Badge variant="outline" className={`uppercase text-[10px] px-2 py-0.5 font-bold tracking-wider ${config.color}`}>{config.label}</Badge>;
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="bg-muted/60 text-muted-foreground border-muted text-xs gap-1"><Clock className="h-3 w-3" />En attente</Badge>;
      case 'awaiting_confirmation': return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200 text-xs gap-1"><Clock className="h-3 w-3" />Preuve envoyée</Badge>;
      case 'confirmed': return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200 text-xs gap-1"><CheckCircle2 className="h-3 w-3" />Payé</Badge>;
      case 'failed': return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs gap-1"><XCircle className="h-3 w-3" />Échoué</Badge>;
      default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const toggleRowSelection = (id: number) => {
    const newSet = new Set(selectedRowIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedRowIds(newSet);
  };

  const toggleAllSelection = () => {
    if (selectedRowIds.size === ordersData?.orders?.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(ordersData?.orders?.map(o => o.id) || []));
    }
  };

  const exportCSV = () => {
    if (!ordersData?.orders?.length) return;
    const headers = ['ID', 'Date', 'Client', 'Email', 'Téléphone', 'Statut', 'Mode paiement', 'Statut paiement', 'Total (DA)'];
    const rows = ordersData.orders.map(o => [
      o.id,
      format(new Date(o.createdAt), 'dd/MM/yyyy HH:mm'),
      `"${o.userName || 'Client invité'}"`,
      `"${o.userEmail || ''}"`,
      `"${(o.shippingAddress as any)?.phone || ''}"`,
      o.status,
      o.paymentMethod || '',
      o.paymentStatus || '',
      o.total
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `commandes_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printOrder = () => window.print();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Commandes</h2>
          <p className="text-muted-foreground text-sm">Gérez les commandes, expéditions et statuts de paiement.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="shadow-sm" onClick={exportCSV} disabled={!ordersData?.orders?.length}>
            <Download className="mr-2 h-4 w-4" /> Exporter (CSV)
          </Button>
        </div>
      </div>

      <Card className="border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20 flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par ID, nom, téléphone, produit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background shadow-sm border-border h-9"
            />
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[155px] h-9 bg-background shadow-sm">
                  <SelectValue placeholder="Statut commande" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  {STATUS_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                <SelectTrigger className="w-full sm:w-[165px] h-9 bg-background shadow-sm">
                  <SelectValue placeholder="Statut paiement" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_STATUS_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={deliveryFilter} onValueChange={(v) => setDeliveryFilter(v as any)}>
                <SelectTrigger className="w-full sm:w-[145px] h-9 bg-background shadow-sm">
                  <SelectValue placeholder="Livraison" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes livraisons</SelectItem>
                  <SelectItem value="home"><span className="flex items-center gap-1.5"><Home className="h-3.5 w-3.5" /> Domicile</span></SelectItem>
                  <SelectItem value="office"><span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Bureau</span></SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {selectedRowIds.size > 0 && (
          <div className="bg-primary/5 border-b border-border px-4 py-2 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <span className="text-sm font-medium text-primary">{selectedRowIds.size} sélectionné(s)</span>
            <div className="flex gap-2">
              <Select onValueChange={(val) => {
                Promise.all(Array.from(selectedRowIds).map(id => handleUpdateStatus(id, val)))
                  .then(() => { setSelectedRowIds(new Set()); });
              }}>
                <SelectTrigger className="h-8 w-[160px] text-xs">
                  <SelectValue placeholder="Changer statut" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-8 text-xs text-destructive hover:bg-destructive/10" onClick={() => setSelectedRowIds(new Set())}>
                Annuler
              </Button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b border-border sticky top-0">
              <tr>
                <th className="px-4 py-3 w-[40px]">
                  <button onClick={toggleAllSelection} className="text-muted-foreground hover:text-foreground transition-colors focus:outline-none">
                    {selectedRowIds.size === ordersData?.orders?.length && ordersData?.orders?.length > 0 ? (
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
                <th className="px-4 py-3 font-semibold w-[90px]">ID</th>
                <th className="px-4 py-3 font-semibold min-w-[180px]">Client</th>
                <th className="px-4 py-3 font-semibold min-w-[160px]">Produits</th>
                <th className="px-4 py-3 font-semibold">Date & Heure</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold">Paiement</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Livraison</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array(10).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-4" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-12" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-28 mt-1" /><Skeleton className="h-3 w-20 mt-1" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-20 mt-1" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-6 w-24 rounded-full" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                    <td className="px-4 py-4 text-right"><Skeleton className="h-8 w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : ordersData?.orders?.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Package className="h-12 w-12 mb-4 text-muted-foreground/30" />
                      <p className="text-lg font-medium text-foreground">Aucune commande trouvée</p>
                      <p className="text-sm">Essayez de modifier vos filtres ou termes de recherche.</p>
                    </div>
                  </td>
                </tr>
              ) : (ordersData?.orders ?? []).filter(o => deliveryFilter === 'all' || (o as any).deliveryType === deliveryFilter).map((order) => (
                <tr key={order.id} className={`hover:bg-muted/30 transition-colors ${selectedRowIds.has(order.id) ? 'bg-primary/5' : ''}`}>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleRowSelection(order.id)} className="text-muted-foreground hover:text-foreground transition-colors focus:outline-none">
                      {selectedRowIds.has(order.id) ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-bold text-foreground">
                    <button onClick={() => { setSelectedOrder(order); setPaymentNotes(''); }} className="hover:text-primary hover:underline">
                      #{order.id}
                    </button>
                  </td>
                  <td className="px-4 py-3 max-w-[220px]">
                    {(() => {
                      const customer = extractCustomer(order);
                      const normalized = customer.phone ? normalizeAlgerianPhone(customer.phone) : null;
                      return (
                        <div className="space-y-0.5">
                          <div className="font-semibold text-foreground text-sm leading-tight">{customer.name}</div>
                          {customer.phone ? (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                              <a href={`tel:+${normalized ?? customer.phone}`} className="text-xs text-primary hover:underline font-mono">{customer.phone}</a>
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground italic">Téléphone non renseigné</div>
                          )}
                          {(customer.wilaya || customer.commune) && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3 shrink-0" />
                              {[customer.wilaya, customer.commune].filter(Boolean).join(' — ')}
                            </div>
                          )}
                          {customer.email && (
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">{customer.email}</div>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  {/* PRODUITS column */}
                  <td className="px-4 py-3 max-w-[200px]">
                    {(() => {
                      const lines = getProductLines((order as any).items || []);
                      if (lines.length === 0) return <span className="text-xs text-muted-foreground italic">Produits indisponibles</span>;
                      const visible = lines.slice(0, 2);
                      const extra = lines.length - 2;
                      return (
                        <TooltipProvider delayDuration={200}>
                          <div className="space-y-0.5">
                            {visible.map((p, i) => (
                              <div key={i} className="text-xs text-foreground leading-tight">
                                <span className="font-medium">{p.name}</span>
                                <span className="text-muted-foreground"> × {p.qty}</span>
                              </div>
                            ))}
                            {extra > 0 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button className="text-xs text-primary hover:underline font-medium">+ {extra} autre{extra > 1 ? 's' : ''}</button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-[240px] space-y-1">
                                  {lines.slice(2).map((p, i) => (
                                    <div key={i} className="text-xs">{p.name} × {p.qty}</div>
                                  ))}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TooltipProvider>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-sm whitespace-nowrap">
                    {format(new Date(order.createdAt), 'dd MMM yyyy, HH:mm', { locale: fr })}
                  </td>
                  <td className="px-4 py-3">
                    <Select value={order.status} onValueChange={(val) => handleUpdateStatus(order.id, val)}>
                      <SelectTrigger className="h-7 w-[140px] text-xs px-2 shadow-none border-transparent hover:border-border bg-transparent focus:ring-0 focus:ring-offset-0">
                        {getStatusBadge(order.status)}
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {order.paymentMethod && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {PAYMENT_METHOD_LABELS[order.paymentMethod]?.icon}
                          {PAYMENT_METHOD_LABELS[order.paymentMethod]?.label || order.paymentMethod}
                        </div>
                      )}
                      {order.paymentStatus && getPaymentStatusBadge(order.paymentStatus)}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-bold text-foreground whitespace-nowrap">
                    {order.total.toLocaleString('fr-DZ')} DA
                  </td>
                  <td className="px-4 py-3">
                    {getDeliveryBadge((order as any).deliveryType)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <TooltipProvider delayDuration={200}>
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => { setSelectedOrder(order); setPaymentNotes(''); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Voir détails</TooltipContent>
                        </Tooltip>
                        {(() => {
                          const waUrl = buildWhatsAppUrl(order);
                          return (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-[#25D366] hover:text-[#128C7E] hover:bg-green-50 dark:hover:bg-green-950/30 disabled:opacity-30"
                                    disabled={!waUrl}
                                    onClick={() => waUrl && window.open(waUrl, '_blank', 'noopener,noreferrer')}
                                  >
                                    <WaIcon className="h-4 w-4" />
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>{waUrl ? 'Contacter sur WhatsApp' : 'Numéro WhatsApp invalide'}</TooltipContent>
                            </Tooltip>
                          );
                        })()}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteConfirmOrder({ id: order.id, num: order.id })}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Supprimer</TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {ordersData && ordersData.totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between bg-muted/10">
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
              <span>par page</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground">
                Page {page} sur {ordersData.totalPages} ({ordersData.total} au total)
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-8">
                  Précédent
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(ordersData.totalPages, p + 1))} disabled={page === ordersData.totalPages} className="h-8">
                  Suivant
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col bg-background print:max-h-none print:h-auto print:block">
          {selectedOrder && (
            <>
              <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/10 print:hidden shrink-0">
                <div>
                  <DialogTitle className="text-xl flex items-center gap-3 flex-wrap">
                    Commande #{selectedOrder.id}
                    {getStatusBadge(selectedOrder.status)}
                    {selectedOrder.paymentStatus && getPaymentStatusBadge(selectedOrder.paymentStatus)}
                  </DialogTitle>
                  <DialogDescription className="mt-1">
                    Passée le {format(new Date(selectedOrder.createdAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                  </DialogDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={printOrder} className="h-9">
                    <Printer className="h-4 w-4 mr-2" /> Imprimer
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-muted/5 print:p-0 print:bg-white print:overflow-visible">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left Column: Items + Payment */}
                  <div className="md:col-span-2 space-y-6">
                    {/* Payment Info */}
                    <Card className="shadow-sm border-border print:border-none print:shadow-none">
                      <CardHeader className="py-4 border-b border-border bg-muted/20 print:bg-transparent">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <CreditCard className="h-4 w-4" /> Paiement
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className={cn(
                          "rounded-xl border p-4",
                          selectedOrder.paymentStatus === 'awaiting_confirmation' ? "border-amber-200 bg-amber-50 dark:bg-amber-950/20" :
                          selectedOrder.paymentStatus === 'confirmed' ? "border-green-200 bg-green-50 dark:bg-green-950/20" :
                          selectedOrder.paymentStatus === 'failed' ? "border-destructive/30 bg-destructive/5" :
                          "border-border bg-muted/20"
                        )}>
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground font-medium">Mode :</span>
                                <div className="flex items-center gap-1.5 font-semibold">
                                  {PAYMENT_METHOD_LABELS[selectedOrder.paymentMethod]?.icon}
                                  {PAYMENT_METHOD_LABELS[selectedOrder.paymentMethod]?.label || selectedOrder.paymentMethod}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground font-medium">Statut :</span>
                                {getPaymentStatusBadge(selectedOrder.paymentStatus)}
                              </div>
                              {selectedOrder.paymentNotes && (
                                <div className="text-xs text-muted-foreground italic mt-1">
                                  Note : {selectedOrder.paymentNotes}
                                </div>
                              )}
                            </div>
                            {selectedOrder.paymentProofUrl && (
                              <a
                                href={selectedOrder.paymentProofUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline shrink-0 border border-primary/30 rounded-lg px-3 py-2 bg-primary/5"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Voir la preuve
                              </a>
                            )}
                          </div>

                          {selectedOrder.paymentProofUrl && (
                            <div className="mb-4">
                              <p className="text-xs text-muted-foreground mb-2 font-medium">Preuve de paiement :</p>
                              <img
                                src={selectedOrder.paymentProofUrl}
                                alt="Preuve de paiement"
                                className="max-h-48 rounded-lg border border-border object-contain bg-white"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            </div>
                          )}

                          {(selectedOrder.paymentMethod === 'bank_transfer' || selectedOrder.paymentMethod === 'cib_edahabia') &&
                           selectedOrder.paymentStatus !== 'confirmed' && (
                            <div className="border-t border-border/50 pt-3 mt-3 space-y-3">
                              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action admin</Label>
                              <Textarea
                                placeholder="Note optionnelle (ex: référence de virement reçu...)"
                                value={paymentNotes}
                                onChange={(e) => setPaymentNotes(e.target.value)}
                                rows={2}
                                className="text-sm resize-none"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                                  onClick={() => handleUpdatePayment(selectedOrder.id, 'confirmed')}
                                  disabled={updateStatus.isPending}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                  Confirmer le paiement
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-destructive/50 text-destructive hover:bg-destructive/10 gap-1.5"
                                  onClick={() => handleUpdatePayment(selectedOrder.id, 'failed')}
                                  disabled={updateStatus.isPending}
                                >
                                  <XCircle className="h-4 w-4" />
                                  Rejeter
                                </Button>
                              </div>
                            </div>
                          )}

                          {selectedOrder.paymentStatus === 'confirmed' && (
                            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm font-medium mt-2 pt-2 border-t border-green-200/50">
                              <CheckCircle2 className="h-4 w-4" />
                              Paiement vérifié et confirmé
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Items */}
                    <Card className="shadow-sm border-border print:border-none print:shadow-none">
                      <CardHeader className="py-4 border-b border-border bg-muted/20 print:bg-transparent print:border-b-2 print:border-black">
                        <CardTitle className="text-base font-semibold">Articles commandés ({selectedOrder.items?.length || 0})</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/10 border-b border-border text-muted-foreground print:bg-transparent">
                            <tr>
                              <th className="px-4 py-3 text-left font-medium">Produit</th>
                              <th className="px-4 py-3 text-center font-medium">Prix unit.</th>
                              <th className="px-4 py-3 text-center font-medium">Qte</th>
                              <th className="px-4 py-3 text-right font-medium">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {selectedOrder.items?.map((item: any, i: number) => (
                              <tr key={i} className="group">
                                <td className="px-4 py-3 flex items-center gap-3">
                                  <div className="h-12 w-12 rounded bg-muted p-1 flex items-center justify-center shrink-0 border border-border print:hidden">
                                    <img src={item.images?.[0] || 'https://placehold.co/40'} alt="" className="max-h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                                  </div>
                                  <div>
                                    <span className="font-semibold text-foreground line-clamp-2">{item.name}</span>
                                    <span className="text-xs text-muted-foreground mt-1 block">ID: {item.productId}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center text-muted-foreground">{item.price.toLocaleString('fr-DZ')} DA</td>
                                <td className="px-4 py-3 text-center font-medium">x{item.quantity}</td>
                                <td className="px-4 py-3 text-right font-bold text-foreground">{(item.price * item.quantity).toLocaleString('fr-DZ')} DA</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm border-border print:border-none print:shadow-none">
                      <CardContent className="p-0">
                        <div className="bg-card p-6 space-y-3 text-sm">
                          <div className="flex justify-between text-muted-foreground items-center">
                            <span>Sous-total ({selectedOrder.items?.reduce((acc: number, item: any) => acc + item.quantity, 0)} articles)</span>
                            <span className="font-medium text-foreground">{selectedOrder.subtotal.toLocaleString('fr-DZ')} DA</span>
                          </div>
                          {selectedOrder.discount > 0 && (
                            <div className="flex justify-between text-secondary items-center bg-secondary/5 -mx-6 px-6 py-2 border-y border-secondary/10">
                              <span className="flex items-center gap-1 font-medium">
                                Remise {selectedOrder.couponCode ? `(${selectedOrder.couponCode})` : ''}
                              </span>
                              <span className="font-bold">-{selectedOrder.discount.toLocaleString('fr-DZ')} DA</span>
                            </div>
                          )}
                          <div className="flex justify-between text-muted-foreground items-center">
                            <span>Frais de livraison</span>
                            <span className="font-medium text-foreground">{selectedOrder.shipping === 0 ? 'Gratuite' : `${selectedOrder.shipping?.toLocaleString('fr-DZ')} DA`}</span>
                          </div>
                          <div className="flex justify-between font-extrabold text-lg pt-4 border-t border-border mt-4 text-primary">
                            <span>Total de la commande</span>
                            <span>{selectedOrder.total.toLocaleString('fr-DZ')} DA</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Column: Customer Info */}
                  <div className="space-y-6">
                    <Card className="shadow-sm border-border print:border-none print:shadow-none">
                      <CardHeader className="py-4 border-b border-border bg-muted/20 print:bg-transparent print:border-b-2 print:border-black">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <User className="h-4 w-4" /> Client
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        <div>
                          <p className="font-bold text-foreground text-base">{selectedOrder.userName || 'Client Invité'}</p>
                          <p className="text-sm text-primary hover:underline cursor-pointer">{selectedOrder.userEmail}</p>
                          <p className="text-sm text-muted-foreground mt-1">{selectedOrder.shippingAddress?.phone}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm border-border print:border-none print:shadow-none">
                      <CardHeader className="py-4 border-b border-border bg-muted/20 print:bg-transparent print:border-b-2 print:border-black">
                        <CardTitle className="text-base font-semibold flex items-center gap-2 flex-wrap">
                          <MapPin className="h-4 w-4" /> Livraison
                          {getDeliveryBadge(selectedOrder.deliveryType)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3 text-sm">
                        {/* Mode */}
                        <div className="flex items-center gap-2">
                          {selectedOrder.deliveryType === 'home'
                            ? <Home className="h-4 w-4 text-sky-600 shrink-0" />
                            : selectedOrder.deliveryType === 'office'
                              ? <Building2 className="h-4 w-4 text-orange-600 shrink-0" />
                              : null}
                          <span className="font-semibold">
                            {selectedOrder.deliveryType === 'home' ? 'Livraison à domicile'
                              : selectedOrder.deliveryType === 'office' ? 'Livraison au bureau'
                              : 'Mode non spécifié'}
                          </span>
                        </div>

                        {/* Contact */}
                        <div className="pt-2 border-t border-border/50">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Destinataire</p>
                          <p className="font-semibold">{selectedOrder.shippingAddress?.fullName}</p>
                          <p className="text-muted-foreground">{selectedOrder.shippingAddress?.phone}</p>
                        </div>

                        {/* Wilaya / Commune */}
                        <div className="pt-2 border-t border-border/50 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Wilaya</span>
                            <span className="font-medium">{selectedOrder.shippingWilayaName || selectedOrder.shippingAddress?.wilaya || '—'}</span>
                          </div>
                          {selectedOrder.shippingAddress?.commune && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Commune</span>
                              <span className="font-medium">{selectedOrder.shippingAddress.commune}</span>
                            </div>
                          )}
                        </div>

                        {/* Address — home only */}
                        {selectedOrder.deliveryType === 'home' && selectedOrder.shippingAddress?.address && (
                          <div className="pt-2 border-t border-border/50">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Adresse détaillée</p>
                            <p className="leading-relaxed text-foreground">{selectedOrder.shippingAddress.address}</p>
                          </div>
                        )}

                        {/* Preferred office — office only */}
                        {selectedOrder.deliveryType === 'office' && selectedOrder.shippingOfficeName && (
                          <div className="pt-2 border-t border-border/50">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Bureau souhaité</p>
                            <p className="font-medium text-foreground">{selectedOrder.shippingOfficeName}</p>
                          </div>
                        )}
                        {selectedOrder.deliveryType === 'office' && !selectedOrder.shippingOfficeName && (
                          <div className="pt-2 border-t border-border/50">
                            <p className="text-xs text-muted-foreground italic">Bureau à confirmer par téléphone</p>
                          </div>
                        )}

                        {/* Notes */}
                        {selectedOrder.notes && (
                          <div className="pt-2 border-t border-border/50">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                            <p className="text-foreground italic">{selectedOrder.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {selectedOrder.notes && (
                      <Card className="shadow-sm border-border bg-warning/5 print:border-none print:shadow-none">
                        <CardHeader className="py-3 border-b border-warning/20">
                          <CardTitle className="text-sm font-semibold text-warning-foreground">Notes du client</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                          <p className="text-sm italic text-foreground/80 whitespace-pre-wrap">{selectedOrder.notes}</p>
                        </CardContent>
                      </Card>
                    )}

                    {/* ── NOEST Express ───────────────────────────────── */}
                    <Card className={cn(
                      "shadow-sm border-border print:hidden",
                      selectedOrder.deliveryStatus === 'echec_livraison' && "border-red-300 bg-red-50/40 dark:bg-red-950/10",
                      selectedOrder.deliveryStatus === 'retour' && "border-orange-300 bg-orange-50/40 dark:bg-orange-950/10",
                      selectedOrder.deliveryStatus === 'livre' && "border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/10",
                    )}>
                      <CardHeader className="py-3 border-b border-border bg-muted/20">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Truck className="h-4 w-4 text-primary" /> NOEST Express
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3">
                        {!selectedOrder.noestShipmentId ? (
                          /* Not yet sent */
                          <div className="space-y-3">
                            <p className="text-xs text-muted-foreground">Commande non encore envoyée à NOEST.</p>
                            <div className="space-y-2">
                              <Label className="text-xs font-medium">Type de livraison</Label>
                              <select
                                value={noestDeliveryType}
                                onChange={e => setNoestDeliveryType(e.target.value as any)}
                                className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                              >
                                <option value="home_delivery">Livraison à domicile</option>
                                <option value="stop_desk">Stop Desk</option>
                              </select>
                            </div>
                            <Button
                              size="sm"
                              className="w-full gap-2 bg-primary hover:bg-primary/90"
                              onClick={() => handleSendToNoest(selectedOrder.id)}
                              disabled={noestSending}
                            >
                              <Send className={cn('h-3.5 w-3.5', noestSending && 'animate-pulse')} />
                              {noestSending ? 'Envoi en cours…' : 'Envoyer à NOEST'}
                            </Button>
                          </div>
                        ) : (
                          /* Already sent — show tracking info */
                          <div className="space-y-3">
                            {/* Delivery status badge */}
                            {selectedOrder.deliveryStatus && (() => {
                              const cfg = DELIVERY_STATUS_LABELS[selectedOrder.deliveryStatus];
                              return cfg ? (
                                <div className={cn('inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border', cfg.color)}>
                                  {cfg.label}
                                </div>
                              ) : null;
                            })()}

                            {/* Tracking number */}
                            {selectedOrder.trackingNumber && (
                              <div className="flex items-center gap-2">
                                <code className="flex-1 text-xs bg-muted px-2 py-1 rounded font-mono border border-border">
                                  {selectedOrder.trackingNumber}
                                </code>
                                {selectedOrder.trackingUrl && (
                                  <a
                                    href={selectedOrder.trackingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:text-primary/80"
                                    title="Suivre le colis"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                )}
                              </div>
                            )}

                            {/* Alert for returns/failures */}
                            {(selectedOrder.deliveryStatus === 'echec_livraison' || selectedOrder.deliveryStatus === 'retour') && (
                              <div className="flex items-start gap-2 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-2">
                                <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                <span>
                                  {selectedOrder.deliveryStatus === 'retour'
                                    ? 'Colis retourné — vérifiez avec NOEST avant de réapprovisionner le stock.'
                                    : 'Échec de livraison — contactez le client pour replanifier.'}
                                </span>
                              </div>
                            )}

                            {selectedOrder.deliveryStatus === 'livre' && (
                              <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Livré avec succès
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2 pt-1 flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-xs h-8"
                                onClick={() => handleSyncNoest(selectedOrder.id)}
                                disabled={noestSyncing}
                              >
                                <RefreshCw className={cn('h-3 w-3', noestSyncing && 'animate-spin')} />
                                Mettre à jour
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-xs h-8"
                                onClick={() => window.open(`/api/admin/noest/shipments/${selectedOrder.id}/label`, '_blank')}
                              >
                                <Printer className="h-3 w-3" />
                                Bordereau
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-border bg-background flex items-center justify-between shrink-0 print:hidden">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground">Mettre à jour:</span>
                  <Select value={selectedOrder.status} onValueChange={(val) => handleUpdateStatus(selectedOrder.id, val)}>
                    <SelectTrigger className="w-[180px] h-9 font-medium">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" onClick={() => setSelectedOrder(null)}>Fermer</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirmOrder} onOpenChange={(open) => !open && setDeleteConfirmOrder(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Supprimer la commande
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer la commande <span className="font-bold text-foreground">#{deleteConfirmOrder?.num}</span> ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end mt-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOrder(null)} disabled={deleting}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteOrder} disabled={deleting}>
              {deleting ? 'Suppression...' : 'Supprimer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
