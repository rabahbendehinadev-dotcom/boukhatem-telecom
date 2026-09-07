import { useGetOrder } from '@workspace/api-client-react';
import { useParams, Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Package, Clock, CheckCircle2, Truck, XCircle, MapPin, Receipt, Phone, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_CONFIG: Record<string, { label: string, color: string, icon: any }> = {
  pending: { label: 'En attente de confirmation', color: 'bg-warning/10 text-warning-foreground border-warning/20', icon: Clock },
  confirmed: { label: 'Confirmée', color: 'bg-blue-500/10 text-blue-600 border-blue-200', icon: CheckCircle2 },
  processing: { label: 'En préparation', color: 'bg-purple-500/10 text-purple-600 border-purple-200', icon: Package },
  shipped: { label: 'Expédiée', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200', icon: Truck },
  delivered: { label: 'Livrée', color: 'bg-green-500/10 text-green-600 border-green-200', icon: CheckCircle2 },
  cancelled: { label: 'Annulée', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle },
};

export default function OrderDetail() {
  const { id } = useParams();
  const orderId = parseInt(id || '0');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order, isLoading } = useGetOrder(orderId, { query: { enabled: !!orderId } as any });

  if (isLoading) return <div className="p-20 text-center">Chargement...</div>;
  if (!order) return <div className="p-20 text-center">Commande introuvable</div>;

  const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const StatusIcon = status.icon;

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-5xl">
      <Button variant="ghost" asChild className="mb-6 pl-0 hover:bg-transparent hover:text-primary">
        <Link href="/orders"><ArrowLeft className="mr-2 h-4 w-4" /> Retour aux commandes</Link>
      </Button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">Commande #{order.id}</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" /> Passée le {format(new Date(order.createdAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
          </p>
        </div>
        <Badge variant="outline" className={`${status.color} font-bold px-4 py-2 text-sm flex items-center gap-2 shadow-sm`}>
          <StatusIcon className="h-4 w-4" />
          {status.label}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Items List */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5 text-primary" /> Articles commandés
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="p-4 flex gap-4 hover:bg-muted/10 transition-colors">
                    <div className="w-20 h-20 bg-background rounded-lg p-2 flex items-center justify-center shrink-0 border border-border shadow-sm">
                      <img src={item.images?.[0] || 'https://placehold.co/100'} alt={item.name} className="max-h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <Link href={`/products/${item.productId}`} className="font-bold text-foreground hover:text-primary transition-colors line-clamp-2 mb-1">
                        {item.name}
                      </Link>
                      <div className="text-sm text-muted-foreground mb-2">Quantité: {item.quantity}</div>
                      <div className="font-extrabold text-primary">{item.price.toLocaleString('fr-DZ')} DA</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary & Info */}
        <div className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="bg-muted/30 border-b border-border pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Receipt className="h-5 w-5 text-secondary" /> Résumé financier
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3 text-sm mb-6">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span className="font-bold text-foreground">{order.subtotal.toLocaleString('fr-DZ')} DA</span>
                </div>
                {order.discount !== undefined && order.discount > 0 && (
                  <div className="flex justify-between text-secondary font-bold">
                    <span>Remise</span>
                    <span>-{order.discount.toLocaleString('fr-DZ')} DA</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Livraison</span>
                  <span className="font-bold text-foreground">
                    {order.shipping === 0 ? 'Gratuite' : `${order.shipping?.toLocaleString('fr-DZ')} DA`}
                  </span>
                </div>
              </div>
              <div className="pt-4 border-t border-border flex justify-between items-end">
                <span className="font-bold text-foreground text-lg">Total payé</span>
                <span className="font-extrabold text-2xl text-primary tracking-tight">{order.total.toLocaleString('fr-DZ')} DA</span>
              </div>
            </CardContent>
          </Card>

          {order.shippingAddress && (
            <Card className="border-border shadow-sm">
              <CardHeader className="bg-muted/30 border-b border-border pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5 text-navy" /> Adresse de livraison
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span className="font-bold text-sm text-foreground">{order.shippingAddress.fullName}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span className="text-sm text-muted-foreground">{order.shippingAddress.phone}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span className="text-sm text-muted-foreground leading-relaxed">
                      {order.shippingAddress.address}<br />
                      {order.shippingAddress.commune}<br />
                      {order.shippingAddress.wilaya}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {order.notes && (
            <Card className="border-border shadow-sm bg-muted/10">
              <CardContent className="p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Notes de commande</h4>
                <p className="text-sm text-foreground/80 italic">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}