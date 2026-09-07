import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Activity as ActivityIcon, Clock, User, Filter, ArrowRightLeft, FileDown, Monitor } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

const ACTION_TYPES = [
  { value: 'CREATE', label: 'Création' },
  { value: 'UPDATE', label: 'Modification' },
  { value: 'DELETE', label: 'Suppression' },
  { value: 'LOGIN', label: 'Connexion' },
  { value: 'LOGOUT', label: 'Déconnexion' },
];

export default function AdminActivity() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const { data: logsData, isLoading } = useQuery({
    queryKey: ['admin', 'activity', page, limit, search, actionFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) params.append('search', search);
      if (actionFilter !== 'all') params.append('action', actionFilter);
      
      const res = await fetch(`/api/admin/activity?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch activity logs');
      return res.json();
    }
  });

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
      case 'UPDATE': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'DELETE': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'LOGIN': return 'bg-purple-500/10 text-purple-600 border-purple-200';
      case 'LOGOUT': return 'bg-muted text-muted-foreground border-border';
      default: return 'bg-secondary/10 text-secondary border-secondary/20';
    }
  };

  const getActionLabel = (action: string) => {
    return ACTION_TYPES.find(a => a.value === action)?.label || action;
  };

  const exportCSV = () => {
    if (!logsData?.logs?.length) return;
    const headers = ['ID', 'Date', 'Administrateur', 'Action', 'Entité', 'ID Entité', 'IP'];
    const rows = logsData.logs.map((l: any) => [
      l.id,
      format(new Date(l.createdAt), 'dd/MM/yyyy HH:mm:ss'),
      `"${l.adminName}"`,
      l.action,
      l.entityType || '-',
      l.entityId || '-',
      l.ipAddress || '-'
    ]);
    const csvContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `activite_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Journal d'Activité</h2>
          <p className="text-muted-foreground text-sm">Tracez les actions effectuées par les administrateurs.</p>
        </div>
        <Button variant="outline" className="shadow-sm bg-background" onClick={exportCSV} disabled={!logsData?.logs?.length}>
          <FileDown className="mr-2 h-4 w-4" /> Exporter (CSV)
        </Button>
      </div>

      <Card className="border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher (Admin, Entité)..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background shadow-sm border-border h-9"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full md:w-[180px] h-9 bg-background shadow-sm">
                <SelectValue placeholder="Toutes les actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les actions</SelectItem>
                {ACTION_TYPES.map(a => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b border-border">
              <tr>
                <th className="px-4 py-3 font-semibold w-[160px]">Date & Heure</th>
                <th className="px-4 py-3 font-semibold">Administrateur</th>
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">Cible (Entité)</th>
                <th className="px-4 py-3 font-semibold text-right">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {isLoading ? (
                Array(10).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-28" /></td>
                    <td className="px-4 py-4"><div className="flex items-center gap-2"><Skeleton className="h-6 w-6 rounded-full" /><Skeleton className="h-4 w-32" /></div></td>
                    <td className="px-4 py-4"><Skeleton className="h-6 w-24 rounded-full" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-4 py-4 text-right"><Skeleton className="h-8 w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : logsData?.logs?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <ActivityIcon className="h-12 w-12 mb-4 text-muted-foreground/30" />
                      <p className="text-lg font-medium text-foreground">Aucune activité trouvée</p>
                    </div>
                  </td>
                </tr>
              ) : logsData?.logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {format(new Date(log.createdAt), 'dd MMM yy, HH:mm:ss', { locale: fr })}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold uppercase shrink-0">
                        {log.adminName.substring(0, 2)}
                      </div>
                      <span className="font-medium text-foreground">{log.adminName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`font-semibold tracking-wider text-[10px] uppercase ${getActionBadgeColor(log.action)}`}>
                      {getActionLabel(log.action)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {log.entityType ? (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{log.entityType}</span>
                        {log.entityId && <span className="text-foreground font-medium">#{log.entityId}</span>}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-primary hover:bg-primary/10" onClick={() => setSelectedLog(log)}>
                      Voir <ArrowRightLeft className="h-3 w-3 ml-1" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {logsData && logsData.totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between bg-muted/5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Afficher</span>
              <Select value={limit.toString()} onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-8 w-[70px] bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground">
                Page {page} sur {logsData.totalPages} ({logsData.total} entrées)
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-8">Précédent</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(logsData.totalPages, p + 1))} disabled={page === logsData.totalPages} className="h-8">Suivant</Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détails de l'action</DialogTitle>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground font-medium">Administrateur</p>
                  <p className="flex items-center gap-2 font-semibold">
                    <User className="h-4 w-4" /> {selectedLog.adminName}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground font-medium">Date et Heure</p>
                  <p className="flex items-center gap-2 font-semibold">
                    <Clock className="h-4 w-4" /> {format(new Date(selectedLog.createdAt), 'dd MMMM yyyy, HH:mm:ss', { locale: fr })}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground font-medium">Action & Entité</p>
                  <p className="font-semibold flex items-center gap-2">
                    <Badge variant="outline" className={`${getActionBadgeColor(selectedLog.action)}`}>
                      {getActionLabel(selectedLog.action)}
                    </Badge>
                    {selectedLog.entityType && (
                      <span className="text-muted-foreground">{selectedLog.entityType} #{selectedLog.entityId}</span>
                    )}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground font-medium">Adresse IP</p>
                  <p className="flex items-center gap-2 font-mono text-xs">
                    <Monitor className="h-4 w-4" /> {selectedLog.ipAddress || 'Inconnue'}
                  </p>
                </div>
              </div>

              {(selectedLog.oldValue || selectedLog.newValue) && (
                <div className="border-t border-border pt-4 mt-2">
                  <h4 className="font-semibold text-sm mb-3">Différences (Payload)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedLog.oldValue && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avant</p>
                        <pre className="bg-destructive/5 border border-destructive/20 rounded-md p-3 text-[11px] overflow-x-auto font-mono text-destructive">
                          {JSON.stringify(selectedLog.oldValue, null, 2)}
                        </pre>
                      </div>
                    )}
                    {selectedLog.newValue && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Après / Données</p>
                        <pre className="bg-emerald-500/5 border border-emerald-500/20 rounded-md p-3 text-[11px] overflow-x-auto font-mono text-emerald-600">
                          {JSON.stringify(selectedLog.newValue, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
