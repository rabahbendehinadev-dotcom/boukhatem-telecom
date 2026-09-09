import { useCart } from '@/hooks/use-cart-store';
import { useApplyCoupon } from '@workspace/api-client-react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Tag, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function Cart() {
  const { cart, isLoading, updateQuantity, removeItem, clearCart, isGuest } = useCart();
  const [couponCode, setCouponCode] = useState(cart?.couponCode || '');
  const applyCoupon = useApplyCoupon();
  const [, setLocation] = useLocation();

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    try {
      await applyCoupon.mutateAsync({ data: { code: couponCode } });
      toast.success('Code promo appliqué avec succès');
      // Cart should refetch automatically if hooks are set up right
    } catch (err: any) {
      toast.error(err.message || 'Code promo invalide ou expiré');
    }
  };

  if (isLoading) {
    return <div className="container mx-auto px-4 py-20 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-2xl text-center">
        <div className="w-32 h-32 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-8">
          <ShoppingBag className="h-16 w-16 text-muted-foreground/50" />
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold mb-4 tracking-tight">Votre panier est vide</h2>
        <p className="text-muted-foreground mb-8 text-lg">Vous n'avez pas encore ajouté de matériel professionnel à votre panier.</p>
        <Button asChild size="lg" className="h-14 px-8 bg-primary text-primary-foreground font-bold text-lg">
          <Link href="/products">Parcourir le catalogue</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-8">Mon Panier</h1>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Cart Items */}
        <div className="flex-1 w-full space-y-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            {/* Header hidden on mobile */}
            <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-muted/30 border-b border-border text-sm font-bold text-muted-foreground uppercase tracking-wider">
              <div className="col-span-6">Produit</div>
              <div className="col-span-2 text-center">Prix Unitaire</div>
              <div className="col-span-2 text-center">Quantité</div>
              <div className="col-span-2 text-right">Total</div>
            </div>

            <div className="divide-y divide-border">
              {cart.items.map((item: any) => (
                <div key={`${item.productId}-${item.variantId || 'base'}`} className="p-4 flex flex-col md:grid md:grid-cols-12 md:items-center gap-4 hover:bg-muted/10 transition-colors">
                  {/* Product Info */}
                  <div className="col-span-6 flex items-center gap-4">
                    <div className="w-20 h-20 bg-muted/30 rounded-lg p-2 flex items-center justify-center shrink-0 border border-border/50">
                      <img src={item.images?.[0] || 'https://placehold.co/100x100'} alt={item.name} className="max-h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/products/${item.productId}`} className="font-bold text-sm md:text-base text-foreground hover:text-primary transition-colors line-clamp-2 mb-1">
                        {item.name}
                      </Link>
                      {item.optionSnapshots && item.optionSnapshots.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1 mb-1">
                          {item.optionSnapshots.map((opt: any, index: number) => (
                            <span key={`${opt.optionId ?? opt.name}-${opt.valueId ?? opt.value}-${index}`} className="inline-flex items-center rounded-sm bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                              {opt.optionName ?? opt.name}: {opt.label ?? opt.value}
                            </span>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => removeItem(item.productId, item.variantId)}
                        className="text-xs text-destructive hover:underline flex items-center gap-1 mt-1"
                      >
                        <Trash2 className="h-3 w-3" /> Supprimer
                      </button>
                    </div>
                  </div>

                  {/* Mobile price and qty layout */}
                  <div className="flex items-center justify-between md:hidden mt-2">
                    <div className="font-extrabold text-primary">{item.price.toLocaleString('fr-DZ')} DA</div>
                    <div className="flex items-center border border-input rounded-md h-9">
                      <button onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1), item.variantId)} className="w-8 h-full flex items-center justify-center text-muted-foreground hover:bg-muted"><Minus className="h-3 w-3" /></button>
                      <div className="w-8 text-center text-sm font-bold">{item.quantity}</div>
                      <button onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)} className="w-8 h-full flex items-center justify-center text-muted-foreground hover:bg-muted"><Plus className="h-3 w-3" /></button>
                    </div>
                  </div>

                  {/* Desktop price and qty */}
                  <div className="hidden md:block col-span-2 text-center font-bold text-foreground">
                    {item.price.toLocaleString('fr-DZ')} DA
                  </div>

                  <div className="hidden md:flex col-span-2 justify-center">
                    <div className="flex items-center border border-input rounded-md h-10 w-24">
                      <button onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1), item.variantId)} className="flex-1 h-full flex items-center justify-center text-muted-foreground hover:bg-muted"><Minus className="h-3 w-3" /></button>
                      <div className="w-8 text-center text-sm font-bold">{item.quantity}</div>
                      <button onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)} className="flex-1 h-full flex items-center justify-center text-muted-foreground hover:bg-muted"><Plus className="h-3 w-3" /></button>
                    </div>
                  </div>

                  <div className="hidden md:block col-span-2 text-right font-extrabold text-primary text-lg tracking-tight">
                    {(item.price * item.quantity).toLocaleString('fr-DZ')} DA
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-muted/10 border-t border-border flex justify-between items-center">
              <Button variant="ghost" className="text-muted-foreground hover:text-destructive text-sm" onClick={clearCart}>
                <Trash2 className="h-4 w-4 mr-2" /> Vider le panier
              </Button>
              <Button variant="outline" asChild>
                <Link href="/products">Continuer les achats</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="w-full lg:w-96 shrink-0 space-y-6">
          <Card className="border-border shadow-md">
            <CardContent className="p-6">
              <h3 className="font-extrabold text-lg mb-6 tracking-tight">Résumé de la commande</h3>

              <div className="space-y-4 text-sm mb-6">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span className="font-bold">{cart.subtotal.toLocaleString('fr-DZ')} DA</span>
                </div>
                {cart.discount > 0 && (
                  <div className="flex justify-between text-secondary font-bold">
                    <span>Remise</span>
                    <span>-{cart.discount.toLocaleString('fr-DZ')} DA</span>
                  </div>
                )}
                {cart.couponDiscount > 0 && (
                  <div className="flex justify-between text-secondary font-bold">
                    <span>Code Promo ({cart.couponCode})</span>
                    <span>-{cart.couponDiscount.toLocaleString('fr-DZ')} DA</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frais de livraison</span>
                  <span className="font-bold">{cart.shipping === 0 ? 'Confirmés par téléphone' : `${cart.shipping.toLocaleString('fr-DZ')} DA`}</span>
                </div>
              </div>

              <div className="border-t border-border pt-4 mb-6">
                <div className="flex justify-between items-end">
                  <span className="font-bold text-foreground">Total à payer</span>
                  <span className="font-extrabold text-2xl text-primary tracking-tight">{cart.total.toLocaleString('fr-DZ')} DA</span>
                </div>
                <p className="text-[10px] text-muted-foreground text-right mt-1">Taxes incluses</p>
              </div>

              <Button
                className="w-full h-14 text-base font-bold bg-secondary hover:bg-secondary/90 text-white shadow-lg shadow-secondary/20 mb-4"
                onClick={() => setLocation('/checkout')}
              >
                Passer la commande <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              {/* Coupon Code */}
              <div className="pt-6 border-t border-border">
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Code promo"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="pl-9 h-11 bg-muted/30"
                    />
                  </div>
                  <Button type="submit" variant="secondary" className="h-11 px-4 font-bold" disabled={applyCoupon.isPending || !couponCode.trim()}>
                    Appliquer
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>

          {/* Trust badges */}
          <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3 text-sm text-foreground/80">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <ShoppingCart className="h-4 w-4 text-primary" />
              </div>
              <span className="font-medium">Paiement à la livraison disponible</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-foreground/80">
              <div className="h-8 w-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                <ShoppingCart className="h-4 w-4 text-secondary" />
              </div>
              <span className="font-medium">Livraison express 58 wilayas</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}