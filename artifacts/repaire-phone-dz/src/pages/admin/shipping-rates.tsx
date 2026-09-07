import { useState, useMemo, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  MapPin, RefreshCw, Download, Upload,
  Search, Check, X, Save, RotateCcw,
  CheckSquare, Square, AlertTriangle, Home, Building2, Clock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ALGERIA_WILAYAS } from '@/lib/algeria-wilayas';

interface ShippingRate {
  id: number; wilayaCode: string; wilayaName: string;
  isActive: boolean; homeDeliveryEnabled: boolean; officeDeliveryEnabled: boolean;
  homeDeliveryPrice: number; officeDeliveryPrice: number;
  minDeliveryDays: number; maxDeliveryDays: number;
}

type EditState = Partial<ShippingRate>;
type Filter = 'all' | 'active' | 'inactive' | 'domicile' | 'bureau' | 'noprice';
type BulkAction = '' | 'activate' | 'deactivate' | 'enable_home' | 'enable_office' | 'set_home_price' | 'set_office_price' | 'set_min_days' | 'set_max_days' | 'percent_change';

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

const BULK_ACTION_LABELS: Record<BulkAction, string> = {
  '': 'Action groupée…',
  activate: 'Activer les wilayas sélectionnées',
  deactivate: 'Désactiver les wilayas sélectionnées',
  enable_home: 'Activer livraison domicile',
  enable_office: 'Activer livraison bureau',
  set_home_price: 'Définir prix domicile (DA)',
  set_office_price: 'Définir prix bureau (DA)',
  set_min_days: 'Définir délai min (jours)',
  set_max_days: 'Définir délai max (jours)',
  percent_change: 'Appliquer variation % (ex: +10 ou -5)',
};
const BULK_NEEDS_VALUE: BulkAction[] = ['set_home_price', 'set_office_price', 'set_min_days', 'set_max_days', 'percent_change'];

const FILTER_LABELS: Record<Filter, string> = {
  all: 'Toutes',
  active: 'Actives',
  inactive: 'Inactives',
  domicile: 'Domicile disponible',
  bureau: 'Bureau disponible',
  noprice: 'Sans tarif',
};

function parseCsv(text: string): { rows: any[]; errors: string[] } {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return { rows: [], errors: ['Fichier vide ou invalide'] };
  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  const errors: string[] = [];
  const rows: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map(p => p.trim().replace(/^"|"$/g, ''));
    if (parts.length < 2) continue;
    const row: any = {};
    header.forEach((h, idx) => { row[h] = parts[idx] ?? ''; });
    if (!row.code && !row.wilaya_code) { errors.push(`Ligne ${i + 1}: code manquant`); continue; }
    const code = (row.code || row.wilaya_code || '').padStart(2, '0');
    const w = ALGERIA_WILAYAS.find(w => w.code === code);
    if (!w) { errors.push(`Ligne ${i + 1}: code ${code} invalide`); continue; }
    const homePrice = parseInt(row.home_price || row.homedeliverryprice || '', 10);
    const officePrice = parseInt(row.office_price || row.desk_price || row.stopdeskprice || row.bureau_price || '', 10);
    if (isNaN(homePrice) && isNaN(officePrice)) { errors.push(`Ligne ${i + 1}: prix invalide`); continue; }
    rows.push({
      wilayaCode: code, wilayaName: w.name,
      homeDeliveryPrice: isNaN(homePrice) ? 0 : homePrice,
      officeDeliveryPrice: isNaN(officePrice) ? 0 : officePrice,
      minDeliveryDays: parseInt(row.min_days || '2', 10) || 2,
      maxDeliveryDays: parseInt(row.max_days || '3', 10) || 3,
      isActive: row.active !== 'false' && row.is_active !== 'false',
      homeDeliveryEnabled: row.home_enabled !== 'false',
      officeDeliveryEnabled: row.office_enabled !== 'false' && row.desk_enabled !== 'false',
    });
  }
  return { rows, errors };
}

function exportToCsv(rates: ShippingRate[]) {
  const header = 'code,wilaya,active,home_enabled,home_price,office_enabled,office_price,min_days,max_days\n';
  const body = rates.map(r =>
    `${r.wilayaCode},${r.wilayaName},${r.isActive},${r.homeDeliveryEnabled},${r.homeDeliveryPrice},${r.officeDeliveryEnabled},${r.officeDeliveryPrice},${r.minDeliveryDays},${r.maxDeliveryDays}`
  ).join('\n');
  const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'tarifs-livraison.csv';
  a.click(); URL.revokeObjectURL(url);
}

export default function AdminShippingRates() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editState, setEditState] = useState<Record<string, EditState>>({});
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [savingAll, setSavingAll] = useState(false);

  const [bulkAction, setBulkAction] = useState<BulkAction>('');
  const [bulkValue, setBulkValue] = useState('');
  const [applyingBulk, setApplyingBulk] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: ratesData, isLoading } = useQuery({
    queryKey: ['admin', 'shipping-rates'],
    queryFn: () => apiFetch('GET', '/admin/shipping-rates'),
  });

  const rates: ShippingRate[] = ratesData?.rates ?? [];

  const stats = useMemo(() => ({
    total: rates.length,
    active: rates.filter(r => r.isActive).length,
    inactive: rates.filter(r => !r.isActive).length,
    noprice: rates.filter(r => !r.homeDeliveryPrice && !r.officeDeliveryPrice).length,
  }), [rates]);

  const filteredRates = useMemo(() => rates.filter(r => {
    if (search) {
      const q = search.toLowerCase();
      if (!r.wilayaName.toLowerCase().includes(q) && !r.wilayaCode.includes(q)) return false;
    }
    if (filter === 'active') return r.isActive;
    if (filter === 'inactive') return !r.isActive;
    if (filter === 'domicile') return r.homeDeliveryEnabled;
    if (filter === 'bureau') return r.officeDeliveryEnabled;
    if (filter === 'noprice') return !r.homeDeliveryPrice && !r.officeDeliveryPrice;
    return true;
  }), [rates, search, filter]);

  const getVal = useCallback(<K extends keyof ShippingRate>(code: string, field: K, fallback: ShippingRate[K]) =>
    (editState[code]?.[field] ?? fallback) as ShippingRate[K], [editState]);

  const setVal = useCallback((code: string, field: keyof ShippingRate, value: any) =>
    setEditState(prev => ({ ...prev, [code]: { ...prev[code], [field]: value } })), []);

  const isDirty = (code: string) => code in editState;
  const dirtyCount = Object.keys(editState).length;

  const saveRow = useCallback(async (code: string) => {
    const rate = rates.find(r => r.wilayaCode === code);
    if (!rate) return;
    const merged = { ...rate, ...editState[code] };
    setSaving(p => new Set(p).add(code));
    try {
      await apiFetch('PUT', `/admin/shipping-rates/${code}`, merged);
      setEditState(p => { const n = { ...p }; delete n[code]; return n; });
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipping-rates'] });
      toast.success(`${rate.wilayaName} — tarifs mis à jour`);
    } catch (e: any) {
      toast.error(e.error || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(p => { const n = new Set(p); n.delete(code); return n; });
    }
  }, [rates, editState, queryClient]);

  const saveAllDirty = useCallback(async () => {
    const codes = Object.keys(editState);
    if (!codes.length) return;
    setSavingAll(true);
    let ok = 0; let err = 0;
    for (const code of codes) {
      const rate = rates.find(r => r.wilayaCode === code);
      if (!rate) continue;
      const merged = { ...rate, ...editState[code] };
      try {
        await apiFetch('PUT', `/admin/shipping-rates/${code}`, merged);
        setEditState(p => { const n = { ...p }; delete n[code]; return n; });
        ok++;
      } catch { err++; }
    }
    queryClient.invalidateQueries({ queryKey: ['admin', 'shipping-rates'] });
    if (err) toast.error(`${ok} sauvegardé(s), ${err} erreur(s)`);
    else toast.success(`${ok} wilaya(s) mis à jour`);
    setSavingAll(false);
  }, [editState, rates, queryClient]);

  const applyBulk = useCallback(async () => {
    if (!bulkAction || selected.size === 0) return;
    setApplyingBulk(true);
    try {
      const res = await apiFetch('POST', '/admin/shipping-rates/bulk', {
        action: bulkAction,
        wilayaCodes: Array.from(selected),
        value: BULK_NEEDS_VALUE.includes(bulkAction) ? Number(bulkValue) : undefined,
      });
      toast.success(`${res.updated} wilaya(s) mis à jour`);
      setSelected(new Set());
      setBulkAction('');
      setBulkValue('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipping-rates'] });
    } catch (e: any) {
      toast.error(e.error || 'Erreur');
    } finally { setApplyingBulk(false); }
  }, [bulkAction, bulkValue, selected, queryClient]);

  const toggleSelect = (code: string) => setSelected(p => {
    const n = new Set(p);
    if (n.has(code)) n.delete(code); else n.add(code);
    return n;
  });
  const toggleSelectAll = () => {
    if (selected.size === filteredRates.length) setSelected(new Set());
    else setSelected(new Set(filteredRates.map(r => r.wilayaCode)));
  };

  const handleSeed = async () => {
    try {
      const res = await apiFetch('POST', '/admin/shipping-rates/seed');
      toast.success(res.message || 'Wilayas initialisées');
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipping-rates'] });
    } catch { toast.error('Erreur lors de l\'initialisation'); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { rows, errors } = parseCsv(ev.target?.result as string ?? '');
      setImportRows(rows); setImportErrors(errors);
      setShowImport(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const confirmImport = async () => {
    if (!importRows.length) return;
    setImporting(true);
    let ok = 0;
    for (const row of importRows) {
      try { await apiFetch('PUT', `/admin/shipping-rates/${row.wilayaCode}`, row); ok++; } catch {}
    }
    toast.success(`${ok} wilaya(s) importée(s)`);
    queryClient.invalidateQueries({ queryKey: ['admin', 'shipping-rates'] });
    setShowImport(false); setImportRows([]); setImportErrors([]);
    setImporting(false);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tarifs de livraison</h2>
          <p className="text-muted-foreground text-sm">Prix et délais par wilaya — indépendant de la gestion des bureaux</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleSeed} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Initialiser les wilayas
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportToCsv(rates)} className="gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileChange} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total wilayas', value: stats.total, color: 'text-foreground' },
          { label: 'Actives', value: stats.active, color: 'text-green-600' },
          { label: 'Inactives', value: stats.inactive, color: 'text-destructive' },
          { label: 'Sans tarif', value: stats.noprice, color: 'text-amber-600' },
        ].map(s => (
          <Card key={s.label} className="shadow-sm">
            <CardContent className="p-4">
              <div className={cn('text-2xl font-extrabold', s.color)}>{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher une wilaya…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {(Object.entries(FILTER_LABELS) as [Filter, string][]).map(([f, label]) => (
            <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'}
              onClick={() => setFilter(f)}
              className="h-9 text-xs">
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/20">
          <span className="text-sm font-semibold text-primary">{selected.size} wilaya(s) sélectionnée(s)</span>
          <Select value={bulkAction} onValueChange={v => { setBulkAction(v as BulkAction); setBulkValue(''); }}>
            <SelectTrigger className="h-8 w-64 text-xs"><SelectValue placeholder="Choisir une action…" /></SelectTrigger>
            <SelectContent>
              {(Object.entries(BULK_ACTION_LABELS) as [BulkAction, string][]).filter(([k]) => k !== '').map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {bulkAction && BULK_NEEDS_VALUE.includes(bulkAction) && (
            <Input placeholder={bulkAction === 'percent_change' ? '+10 ou -5' : 'Valeur'}
              value={bulkValue} onChange={e => setBulkValue(e.target.value)}
              className="h-8 w-28 text-xs" type="number" />
          )}
          {bulkAction && (
            <Button size="sm" className="h-8 text-xs gap-1" onClick={applyBulk} disabled={applyingBulk}>
              <Check className="h-3 w-3" /> Appliquer
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setSelected(new Set())}>
            <X className="h-3 w-3 mr-1" /> Désélectionner
          </Button>
        </div>
      )}

      {/* Unsaved changes banner */}
      {dirtyCount > 0 && (
        <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-sm text-amber-700 dark:text-amber-300 flex-1">
            {dirtyCount} modification(s) non sauvegardée(s)
          </span>
          <Button size="sm" className="h-8 gap-1 text-xs" onClick={saveAllDirty} disabled={savingAll}>
            <Save className="h-3 w-3" />
            {savingAll ? 'Sauvegarde…' : 'Enregistrer toutes les modifications'}
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => setEditState({})}>
            <RotateCcw className="h-3 w-3" /> Annuler
          </Button>
        </div>
      )}

      {/* ── DESKTOP TABLE ── */}
      {isLoading ? (
        <div className="space-y-2">
          {Array(10).fill(0).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
        </div>
      ) : (
        <>
          <div className="hidden md:block rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="p-3 text-left w-10">
                    <button onClick={toggleSelectAll} className="text-muted-foreground hover:text-foreground">
                      {selected.size === filteredRates.length && filteredRates.length > 0
                        ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                    </button>
                  </th>
                  <th className="p-3 text-left font-semibold w-8 text-xs text-muted-foreground">Code</th>
                  <th className="p-3 text-left font-semibold">Wilaya</th>
                  <th className="p-3 text-center font-semibold w-20">Active</th>
                  <th className="p-3 text-center font-semibold w-20">Domicile<br/><span className="text-xs font-normal text-muted-foreground">actif</span></th>
                  <th className="p-3 text-center font-semibold w-28">Prix domicile</th>
                  <th className="p-3 text-center font-semibold w-20">Bureau<br/><span className="text-xs font-normal text-muted-foreground">actif</span></th>
                  <th className="p-3 text-center font-semibold w-28">Prix bureau</th>
                  <th className="p-3 text-center font-semibold w-24">Délai min</th>
                  <th className="p-3 text-center font-semibold w-24">Délai max</th>
                  <th className="p-3 w-28 text-center font-semibold">Enregistrer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRates.map(rate => {
                  const dirty = isDirty(rate.wilayaCode);
                  const isSaving = saving.has(rate.wilayaCode);
                  const isSelected = selected.has(rate.wilayaCode);
                  return (
                    <tr key={rate.wilayaCode}
                      className={cn('transition-colors', dirty ? 'bg-amber-50/60 dark:bg-amber-950/10' : 'hover:bg-muted/20', isSelected && 'bg-primary/5')}>
                      <td className="p-3">
                        <button onClick={() => toggleSelect(rate.wilayaCode)} className="text-muted-foreground hover:text-foreground">
                          {isSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{rate.wilayaCode}</td>
                      <td className="p-3 font-medium">{rate.wilayaName}</td>
                      {/* Active */}
                      <td className="p-3 text-center">
                        <Switch checked={getVal(rate.wilayaCode, 'isActive', rate.isActive)}
                          onCheckedChange={v => setVal(rate.wilayaCode, 'isActive', v)} />
                      </td>
                      {/* Domicile */}
                      <td className="p-2 text-center">
                        <Switch checked={getVal(rate.wilayaCode, 'homeDeliveryEnabled', rate.homeDeliveryEnabled)}
                          onCheckedChange={v => setVal(rate.wilayaCode, 'homeDeliveryEnabled', v)} />
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1 justify-center">
                          <Input type="number" min={0}
                            value={getVal(rate.wilayaCode, 'homeDeliveryPrice', rate.homeDeliveryPrice)}
                            onChange={e => setVal(rate.wilayaCode, 'homeDeliveryPrice', parseInt(e.target.value) || 0)}
                            className="h-7 w-20 text-xs text-center" />
                          <span className="text-xs text-muted-foreground">DA</span>
                        </div>
                      </td>
                      {/* Bureau */}
                      <td className="p-2 text-center">
                        <Switch checked={getVal(rate.wilayaCode, 'officeDeliveryEnabled', rate.officeDeliveryEnabled)}
                          onCheckedChange={v => setVal(rate.wilayaCode, 'officeDeliveryEnabled', v)} />
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1 justify-center">
                          <Input type="number" min={0}
                            value={getVal(rate.wilayaCode, 'officeDeliveryPrice', rate.officeDeliveryPrice)}
                            onChange={e => setVal(rate.wilayaCode, 'officeDeliveryPrice', parseInt(e.target.value) || 0)}
                            className="h-7 w-20 text-xs text-center" />
                          <span className="text-xs text-muted-foreground">DA</span>
                        </div>
                      </td>
                      {/* Delay */}
                      <td className="p-2 text-center">
                        <Input type="number" min={1}
                          value={getVal(rate.wilayaCode, 'minDeliveryDays', rate.minDeliveryDays)}
                          onChange={e => setVal(rate.wilayaCode, 'minDeliveryDays', parseInt(e.target.value) || 1)}
                          className="h-7 w-16 text-xs text-center mx-auto" />
                      </td>
                      <td className="p-2 text-center">
                        <Input type="number" min={1}
                          value={getVal(rate.wilayaCode, 'maxDeliveryDays', rate.maxDeliveryDays)}
                          onChange={e => setVal(rate.wilayaCode, 'maxDeliveryDays', parseInt(e.target.value) || 1)}
                          className="h-7 w-16 text-xs text-center mx-auto" />
                      </td>
                      <td className="p-2 text-center">
                        <Button size="sm"
                          className={cn("h-7 px-3 text-xs gap-1", !dirty && "opacity-50")}
                          onClick={() => saveRow(rate.wilayaCode)}
                          disabled={isSaving || !dirty}>
                          {isSaving
                            ? <RefreshCw className="h-3 w-3 animate-spin" />
                            : <><Save className="h-3 w-3" /> Enregistrer</>}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredRates.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <MapPin className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>{rates.length === 0 ? 'Aucune wilaya initialisée' : 'Aucun résultat pour ce filtre'}</p>
                {rates.length === 0 && (
                  <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={handleSeed}>
                    <RefreshCw className="h-4 w-4" /> Initialiser les wilayas
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* ── MOBILE CARDS ── */}
          <div className="md:hidden space-y-3">
            {filteredRates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MapPin className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>{rates.length === 0 ? 'Aucune wilaya initialisée' : 'Aucun résultat'}</p>
                {rates.length === 0 && (
                  <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={handleSeed}>
                    <RefreshCw className="h-4 w-4" /> Initialiser les wilayas
                  </Button>
                )}
              </div>
            ) : filteredRates.map(rate => {
              const dirty = isDirty(rate.wilayaCode);
              return (
                <Card key={rate.wilayaCode} className={cn('border', dirty ? 'border-amber-300 bg-amber-50/30 dark:bg-amber-950/10' : '')}>
                  <CardContent className="p-4 space-y-4">
                    {/* Header row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleSelect(rate.wilayaCode)}>
                          {selected.has(rate.wilayaCode)
                            ? <CheckSquare className="h-4 w-4 text-primary" />
                            : <Square className="h-4 w-4 text-muted-foreground" />}
                        </button>
                        <span className="font-mono text-xs text-muted-foreground">{rate.wilayaCode}</span>
                        <span className="font-bold text-base">{rate.wilayaName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">Wilaya active</Label>
                        <Switch checked={getVal(rate.wilayaCode, 'isActive', rate.isActive)}
                          onCheckedChange={v => setVal(rate.wilayaCode, 'isActive', v)} />
                      </div>
                    </div>

                    {/* Domicile + Bureau side by side */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 p-3 bg-muted/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Home className="h-4 w-4 text-blue-500" />
                          <span className="text-xs font-semibold">Livraison à domicile</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Input type="number" min={0}
                            value={getVal(rate.wilayaCode, 'homeDeliveryPrice', rate.homeDeliveryPrice)}
                            onChange={e => setVal(rate.wilayaCode, 'homeDeliveryPrice', parseInt(e.target.value) || 0)}
                            className="h-9 text-sm" />
                          <span className="text-xs text-muted-foreground shrink-0">DA</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch className="scale-75" checked={getVal(rate.wilayaCode, 'homeDeliveryEnabled', rate.homeDeliveryEnabled)}
                            onCheckedChange={v => setVal(rate.wilayaCode, 'homeDeliveryEnabled', v)} />
                          <Label className="text-xs">{getVal(rate.wilayaCode, 'homeDeliveryEnabled', rate.homeDeliveryEnabled) ? 'Activé' : 'Désactivé'}</Label>
                        </div>
                      </div>
                      <div className="space-y-2 p-3 bg-muted/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-purple-500" />
                          <span className="text-xs font-semibold">Livraison au bureau</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Input type="number" min={0}
                            value={getVal(rate.wilayaCode, 'officeDeliveryPrice', rate.officeDeliveryPrice)}
                            onChange={e => setVal(rate.wilayaCode, 'officeDeliveryPrice', parseInt(e.target.value) || 0)}
                            className="h-9 text-sm" />
                          <span className="text-xs text-muted-foreground shrink-0">DA</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch className="scale-75" checked={getVal(rate.wilayaCode, 'officeDeliveryEnabled', rate.officeDeliveryEnabled)}
                            onCheckedChange={v => setVal(rate.wilayaCode, 'officeDeliveryEnabled', v)} />
                          <Label className="text-xs">{getVal(rate.wilayaCode, 'officeDeliveryEnabled', rate.officeDeliveryEnabled) ? 'Activé' : 'Désactivé'}</Label>
                        </div>
                      </div>
                    </div>

                    {/* Delay + Save */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground">Délai:</span>
                        <Input type="number" min={1}
                          value={getVal(rate.wilayaCode, 'minDeliveryDays', rate.minDeliveryDays)}
                          onChange={e => setVal(rate.wilayaCode, 'minDeliveryDays', parseInt(e.target.value) || 1)}
                          className="h-7 w-14 text-xs text-center" />
                        <span className="text-xs text-muted-foreground">–</span>
                        <Input type="number" min={1}
                          value={getVal(rate.wilayaCode, 'maxDeliveryDays', rate.maxDeliveryDays)}
                          onChange={e => setVal(rate.wilayaCode, 'maxDeliveryDays', parseInt(e.target.value) || 1)}
                          className="h-7 w-14 text-xs text-center" />
                        <span className="text-xs text-muted-foreground">j</span>
                      </div>
                      <Button size="sm"
                        className={cn("h-8 px-4 text-xs gap-1 shrink-0", !dirty && "opacity-50")}
                        onClick={() => saveRow(rate.wilayaCode)}
                        disabled={saving.has(rate.wilayaCode) || !dirty}>
                        {saving.has(rate.wilayaCode)
                          ? <RefreshCw className="h-3 w-3 animate-spin" />
                          : <><Save className="h-3 w-3" /> Enregistrer</>}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* ── IMPORT DIALOG ── */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importer les tarifs — aperçu</DialogTitle>
          </DialogHeader>
          {importErrors.length > 0 && (
            <div className="space-y-1 p-3 bg-destructive/5 rounded-lg border border-destructive/20">
              {importErrors.map((e, i) => (
                <p key={i} className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3 shrink-0" />{e}</p>
              ))}
            </div>
          )}
          {importRows.length > 0 ? (
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40"><tr>
                  <th className="p-2 text-left">Code</th><th className="p-2 text-left">Wilaya</th>
                  <th className="p-2 text-right">Domicile DA</th><th className="p-2 text-right">Bureau DA</th>
                  <th className="p-2 text-center">Min j</th><th className="p-2 text-center">Max j</th>
                </tr></thead>
                <tbody className="divide-y">{importRows.slice(0, 20).map(r => (
                  <tr key={r.wilayaCode}>
                    <td className="p-2 font-mono">{r.wilayaCode}</td>
                    <td className="p-2">{r.wilayaName}</td>
                    <td className="p-2 text-right">{r.homeDeliveryPrice}</td>
                    <td className="p-2 text-right">{r.officeDeliveryPrice}</td>
                    <td className="p-2 text-center">{r.minDeliveryDays}</td>
                    <td className="p-2 text-center">{r.maxDeliveryDays}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <p className="text-sm text-muted-foreground">Aucune ligne valide trouvée.</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImport(false)}>Annuler</Button>
            <Button onClick={confirmImport} disabled={importing || !importRows.length} className="gap-2">
              {importing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Importer {importRows.length} wilaya(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
