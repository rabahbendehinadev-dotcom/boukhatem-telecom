import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Building2, Plus, Pencil, Trash2, Search, Save, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ALGERIA_WILAYAS } from '@/lib/algeria-wilayas';

interface ShippingOffice {
  id: number; wilayaCode: string; name: string;
  commune: string | null; address: string | null; phone: string | null;
  openingHours: string | null; carrier: string | null;
  externalOfficeId: string | null; isActive: boolean;
}

const apiFetch = async (method: string, path: string, body?: any) => {
  const res = await fetch(`/api${path}`, {
    method, credentials: 'include',
    headers: body != null ? { 'Content-Type': 'application/json' } : undefined,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
};

export default function AdminShippingOffices() {
  const queryClient = useQueryClient();
  const [wilayaFilter, setWilayaFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Partial<ShippingOffice> & { _isNew?: boolean }>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'shipping-offices'],
    queryFn: () => apiFetch('GET', '/admin/shipping-offices'),
  });

  const offices: ShippingOffice[] = data?.offices ?? [];

  const filtered = useMemo(() => offices.filter(o => {
    if (wilayaFilter && o.wilayaCode !== wilayaFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!o.name.toLowerCase().includes(q) && !o.commune?.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [offices, wilayaFilter, search]);

  const openAdd = () => { setEditing({ _isNew: true, isActive: true, carrier: 'manual' }); setShowDialog(true); };
  const openEdit = (o: ShippingOffice) => { setEditing({ ...o }); setShowDialog(true); };

  const saveOffice = async () => {
    if (!editing.wilayaCode || !editing.name) { toast.error('Wilaya et Nom requis'); return; }
    setSaving(true);
    try {
      if (editing._isNew) {
        await apiFetch('POST', '/admin/shipping-offices', editing);
        toast.success('Bureau créé');
      } else {
        await apiFetch('PUT', `/admin/shipping-offices/${editing.id}`, editing);
        toast.success('Bureau mis à jour');
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipping-offices'] });
      setShowDialog(false);
    } catch (e: any) { toast.error(e.error || 'Erreur'); }
    setSaving(false);
  };

  const deleteOffice = async (id: number) => {
    if (!confirm('Supprimer ce bureau ?')) return;
    setDeleting(id);
    try {
      await apiFetch('DELETE', `/admin/shipping-offices/${id}`);
      toast.success('Bureau supprimé');
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipping-offices'] });
    } catch { toast.error('Erreur lors de la suppression'); }
    setDeleting(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Bureaux Stop Desk</h2>
          <p className="text-muted-foreground text-sm">
            Gérez les bureaux de retrait par wilaya. Le prix du bureau se configure dans{' '}
            <a href="/admin/shipping-rates" className="text-primary underline underline-offset-2">Tarifs de livraison</a>.
          </p>
        </div>
        <Button className="gap-2" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Ajouter un bureau
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={wilayaFilter} onValueChange={setWilayaFilter}>
          <SelectTrigger className="h-9 w-56 text-sm">
            <SelectValue placeholder="Toutes les wilayas" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            <SelectItem value="">Toutes les wilayas</SelectItem>
            {ALGERIA_WILAYAS.map(w => (
              <SelectItem key={w.code} value={w.code}>{w.code} — {w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Nom, commune…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed rounded-xl">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{offices.length === 0 ? 'Aucun bureau encore ajouté' : 'Aucun bureau pour ce filtre'}</p>
          <p className="text-sm mt-1 max-w-sm mx-auto">
            {offices.length === 0
              ? 'Les bureaux sont optionnels. Vous pouvez définir un prix bureau dans Tarifs de livraison sans ajouter de bureau ici.'
              : 'Essayez un autre filtre.'}
          </p>
          {offices.length === 0 && (
            <Button className="mt-4 gap-2" onClick={openAdd}>
              <Plus className="h-4 w-4" /> Ajouter le premier bureau
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="p-3 text-left font-semibold w-16">Wilaya</th>
                <th className="p-3 text-left font-semibold">Nom du bureau</th>
                <th className="p-3 text-left font-semibold hidden sm:table-cell">Commune</th>
                <th className="p-3 text-left font-semibold hidden md:table-cell">Téléphone</th>
                <th className="p-3 text-left font-semibold hidden lg:table-cell">Transporteur</th>
                <th className="p-3 text-center font-semibold w-20">Statut</th>
                <th className="p-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(o => (
                <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                  <td className="p-3 font-mono text-xs text-muted-foreground">{o.wilayaCode}</td>
                  <td className="p-3 font-medium">{o.name}</td>
                  <td className="p-3 text-muted-foreground hidden sm:table-cell">{o.commune || '—'}</td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell">{o.phone || '—'}</td>
                  <td className="p-3 hidden lg:table-cell">
                    <Badge variant="outline" className="text-xs">{o.carrier || 'manual'}</Badge>
                  </td>
                  <td className="p-3 text-center">
                    <Badge variant={o.isActive ? 'default' : 'secondary'} className="text-xs">
                      {o.isActive ? 'Actif' : 'Inactif'}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(o)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteOffice(o.id)} disabled={deleting === o.id}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing._isNew ? 'Ajouter un bureau' : 'Modifier le bureau'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Wilaya *</Label>
                <Select value={editing.wilayaCode || ''} onValueChange={v => setEditing(p => ({ ...p, wilayaCode: v }))}>
                  <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Choisir…" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {ALGERIA_WILAYAS.map(w => <SelectItem key={w.code} value={w.code}>{w.code} — {w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Transporteur</Label>
                <Input value={editing.carrier || 'manual'} onChange={e => setEditing(p => ({ ...p, carrier: e.target.value }))} className="h-9 mt-1" placeholder="manual, noest…" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Nom du bureau *</Label>
              <Input value={editing.name || ''} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} className="h-9 mt-1" placeholder="Bureau Alger Centre" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Commune</Label>
                <Input value={editing.commune || ''} onChange={e => setEditing(p => ({ ...p, commune: e.target.value }))} className="h-9 mt-1" />
              </div>
              <div>
                <Label className="text-xs">Téléphone</Label>
                <Input value={editing.phone || ''} onChange={e => setEditing(p => ({ ...p, phone: e.target.value }))} className="h-9 mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Adresse</Label>
              <Input value={editing.address || ''} onChange={e => setEditing(p => ({ ...p, address: e.target.value }))} className="h-9 mt-1" />
            </div>
            <div>
              <Label className="text-xs">Horaires d'ouverture</Label>
              <Input value={editing.openingHours || ''} onChange={e => setEditing(p => ({ ...p, openingHours: e.target.value }))} className="h-9 mt-1" placeholder="Dim–Jeu 08h–17h" />
            </div>
            <div>
              <Label className="text-xs">ID externe (NOEST, Yalidine…)</Label>
              <Input value={editing.externalOfficeId || ''} onChange={e => setEditing(p => ({ ...p, externalOfficeId: e.target.value }))} className="h-9 mt-1" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={editing.isActive !== false} onCheckedChange={v => setEditing(p => ({ ...p, isActive: v }))} />
              <Label className="text-sm">Bureau actif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Annuler</Button>
            <Button onClick={saveOffice} disabled={saving} className="gap-2">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editing._isNew ? 'Créer le bureau' : 'Sauvegarder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
