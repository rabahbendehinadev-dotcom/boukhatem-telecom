import { useWishlist } from '@/hooks/use-wishlist';
import { useGetProduct } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, Heart, Trash2 } from 'lucide-react';
import { useCart } from '@/hooks/use-cart-store';
import { toast } from 'sonner';

export default function Wishlist() {
  const { items, isLoading, toggleWishlist } = useWishlist();

  if (isLoading) return <div className="p-20 text-center">Chargement...</div>;

  if (!items || items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-2xl text-center">
        <div className="w-32 h-32 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-8">
          <Heart className="h-16 w-16 text-muted-foreground/50" />
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold mb-4 tracking-tight">Vos favoris sont vides</h2>
        <p className="text-muted-foreground mb-8 text-lg">Sauvegardez vos équipements préférés pour les retrouver plus tard.</p>
        <Button asChild size="lg" className="h-14 px-8 bg-primary text-primary-foreground font-bold text-lg">
          <Link href="/products">Parcourir le catalogue</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-8">Mes Favoris ({items.length})</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
        {items.map((productId) => (
          <WishlistItem key={productId} productId={productId} onRemove={() => toggleWishlist(productId)} />
        ))}
      </div>
    </div>
  );
}

function WishlistItem({ productId, onRemove }: { productId: number, onRemove: () => void }) {
  const { data: product, isLoading } = useGetProduct(productId);
  const { addToCart } = useCart();

  if (isLoading) return <div className="aspect-square bg-muted animate-pulse rounded-xl"></div>;
  if (!product) return null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product.id, 1);
    toast.success(`${product.name} ajouté au panier`);
  };

  return (
    <Link href={`/products/${product.id}`}>
      <Card className="group h-full flex flex-col overflow-hidden border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300 bg-card rounded-xl">
        <div className="relative aspect-square bg-muted/30 p-4 flex items-center justify-center overflow-hidden">
          <button 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
            className="absolute top-2 right-2 z-10 p-2 rounded-full bg-white/80 text-destructive hover:bg-destructive hover:text-white transition-colors shadow-sm"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <img 
            src={product.images?.[0] || 'https://placehold.co/400x400'} 
            alt={product.name}
            className="max-h-full object-contain group-hover:scale-105 transition-transform duration-500"
          />
        </div>
        <CardContent className="p-4 flex-1 flex flex-col gap-2">
          <h4 className="font-bold text-sm leading-tight text-foreground line-clamp-2 flex-1 group-hover:text-primary transition-colors">
            {product.name}
          </h4>
          <div className="flex items-end justify-between mt-1">
            <div className="font-extrabold text-lg text-primary tracking-tight">
              {product.price.toLocaleString('fr-DZ')} <span className="text-xs font-normal">DA</span>
            </div>
            <Button 
              size="icon" 
              className="h-9 w-9 rounded-full bg-secondary hover:bg-secondary/90 text-white shadow-md transition-transform active:scale-95 shrink-0"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}