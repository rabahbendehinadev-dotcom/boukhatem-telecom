import { useListMyOrders } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, ChevronRight, Clock, CheckCircle2, Truck, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_CONFIG: Record<string, { label: string, color: string, icon: any }> = {
  pending: { label: 'En attente', color: 'bg-warning/10 text-warning-foreground border-warning/20', icon: Clock },
  confirmed: { label: 'Confirmée', color: 'bg-blue-500/10 text-blue-600 border-blue-200', icon: CheckCircle2 },
  processing: { label: 'En préparation', color: 'bg-purple-500/10 text-purple-600 border-purple-200', icon: Package },
  shipped: { label: 'Expédiée', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200', icon: Truck },
  delivered: { label: 'Livrée', color: 'bg-green-500/10 text-green-600 border-green-200', icon: CheckCircle2 },
  cancelled: { label: 'Annulée', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle },
};

export default function Orders() {
  const { data, isLoading } = useListMyOrders();

  if (isLoading) return <div className="p-20 text-center">Chargement...</div>;

  if (!data || data.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-2xl text-center">
        <div className="w-32 h-32 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-8">
          <Package className="h-16 w-16 text-muted-foreground/50" />
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold mb-4 tracking-tight">Aucune commande</h2>
        <p className="text-muted-foreground mb-8 text-lg">Vous n'avez pas encore passé de commande sur notre boutique.</p>
        <Button asChild size="lg" className="h-14 px-8 bg-primary text-primary-foreground font-bold text-lg">
          <Link href="/products">Parcourir le catalogue</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-5xl">
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-8">Mes Commandes</h1>
      
      <div className="space-y-4 md:space-y-6">
        {data.map((order) => {
          const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
          const StatusIcon = status.icon;

          return (
            <Link key={order.id} href={`/orders/${order.id}`}>
              <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row md:items-center justify-between p-6 border-b border-border gap-4 bg-muted/20">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-background border border-border flex items-center justify-center shrink-0 shadow-sm">
                        <Package className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="font-bold text-lg text-foreground">Commande #{order.id}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(order.createdAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-2">
                      <div className="font-extrabold text-xl text-primary">{order.total.toLocaleString('fr-DZ')} DA</div>
                      <Badge variant="outline" className={`${status.color} font-bold px-3 py-1 flex items-center gap-1.5`}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        {status.label}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-6 bg-card flex items-center justify-between">
                    <div className="flex -space-x-4">
                      {(order.items as any[])?.slice(0, 4).map((item: any, i: number) => (
                        <div key={i} className="h-14 w-14 rounded-lg bg-white border-2 border-card flex items-center justify-center overflow-hidden shadow-sm relative z-10">
                          <img src={item.images?.[0] || 'https://placehold.co/100'} alt="" className="max-h-full object-contain" />
                        </div>
                      ))}
                      {(order.items?.length || 0) > 4 && (
                        <div className="h-14 w-14 rounded-lg bg-muted border-2 border-card flex items-center justify-center shadow-sm relative z-0 font-bold text-sm text-muted-foreground">
                          +{(order.items?.length || 0) - 4}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center text-sm font-bold text-primary group">
                      Détails <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}