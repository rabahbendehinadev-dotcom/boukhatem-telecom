import { useState, useEffect, useMemo } from 'react';
import { useCart } from '@/hooks/use-cart-store';
import { useWishlist } from '@/hooks/use-wishlist';
import { toast } from 'sonner';
import { useGetProduct, useGetRelatedProducts } from '@workspace/api-client-react';
import { getImageSrc, getProductImageSrc } from '@/lib/image-utils';
import { useParams, Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, ShoppingCart, Heart, Shield, Truck, RotateCcw, Plus, Minus, XCircle } from 'lucide-react';
import { StockBadge } from '@/components/ui/stock-badge';
import { cn } from '@/lib/utils';

export default function ProductDetail() {
  const { id } = useParams();
  const productId = parseInt(id || '0');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: product, isLoading } = useGetProduct(productId, { query: { enabled: !!productId } as any });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: relatedProducts } = useGetRelatedProducts(productId, { query: { enabled: !!productId } as any });

  const [, setLocation] = useLocation();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [selectedOptionValues, setSelectedOptionValues] = useState<Record<number, number>>({});

  const p = product as any;

  useEffect(() => {
    if (p && p.options?.length > 0) {
      const firstActiveInStock = p.variants?.find((v: any) => v.isActive && v.stock > 0);
      const variantToSelect = firstActiveInStock || p.variants?.find((v: any) => v.isActive) || p.variants?.[0];

      if (variantToSelect) {
        const initialSelections: Record<number, number> = {};
        p.options.forEach((opt: any) => {
          const val = opt.values.find((v: any) => variantToSelect.optionValueIds.includes(v.id));
          if (val) initialSelections[opt.id] = val.id;
        });
        setSelectedOptionValues(initialSelections);
      }
    }
  }, [p]);

  const selectedVariant = useMemo(() => {
    if (!p || !p.variants?.length) return null;
    const selectedIds = Object.values(selectedOptionValues);
    if (selectedIds.length !== p.options?.length) return null;
    return p.variants.find((v: any) =>
      v.isActive && selectedIds.every(id => v.optionValueIds.includes(id))
    ) || null;
  }, [p, selectedOptionValues]);

  // Derive display values based on selected variant
  const displayPrice = selectedVariant ? selectedVariant.price : (p?.price ?? 0);
  const displayComparePrice = selectedVariant ? selectedVariant.comparePrice : p?.comparePrice;
  const displayStock = selectedVariant ? selectedVariant.stock : (p?.stock ?? 0);
  const displaySku = selectedVariant?.sku || p?.sku;
  const isOutOfStock = displayStock === 0;

  const images = useMemo(() => {
    if (!p) return [];
    if (selectedVariant?.imageUrl) return [getImageSrc(selectedVariant.imageUrl)!];
    return p.images?.length
      ? p.images.map((img: string) => getImageSrc(img) ?? 'https://placehold.co/800x800/f8fafc/1e3a5f?text=Produit')
      : ['https://placehold.co/800x800/f8fafc/1e3a5f?text=Produit'];
  }, [p, selectedVariant]);

  // Reset selected image when changing variants
  useEffect(() => {
    setSelectedImage(0);
  }, [images]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="space-y-6">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!p) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Produit introuvable</h2>
        <Button asChild><Link href="/products">Retour aux produits</Link></Button>
      </div>
    );
  }

  const inWishlist = isInWishlist(p.id);

  // Helper to check if an option value would result in a valid variant
  const isOptionValueValid = (optionId: number, valueId: number) => {
    if (!p.variants) return false;
    const testSelections = { ...selectedOptionValues, [optionId]: valueId };
    return p.variants.some((v: any) =>
      v.isActive && Object.values(testSelections).every(id => v.optionValueIds.includes(id))
    );
  };

  const handleOptionSelect = (optionId: number, valueId: number) => {
    // If it's a valid choice with current other selections, just update it
    if (isOptionValueValid(optionId, valueId)) {
      setSelectedOptionValues(prev => ({ ...prev, [optionId]: valueId }));
      return;
    }
    // Otherwise, we need to pick a valid variant that has this value and reset other selections if needed
    const validVariant = p.variants?.find((v: any) => v.isActive && v.optionValueIds.includes(valueId));
    if (validVariant) {
      const newSelections: Record<number, number> = {};
      p.options.forEach((opt: any) => {
        const val = opt.values.find((v: any) => validVariant.optionValueIds.includes(v.id));
        if (val) newSelections[opt.id] = val.id;
      });
      setSelectedOptionValues(newSelections);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-muted-foreground mb-6 overflow-x-auto whitespace-nowrap scrollbar-hide">
        <Link href="/" className="hover:text-primary transition-colors">Accueil</Link>
        <span className="mx-2">/</span>
        {p.categoryId && (
          <>
            <Link href={`/products?categoryId=${p.categoryId}`} className="hover:text-primary transition-colors">
              {p.categoryName || 'Catégorie'}
            </Link>
            <span className="mx-2">/</span>
          </>
        )}
        <span className="text-foreground font-medium truncate">{p.name}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 mb-16">
        {/* Gallery */}
        <div className="space-y-4">
          <div className="aspect-square rounded-2xl bg-muted border border-border p-4 flex items-center justify-center overflow-hidden relative">
            {p.hasDiscount && p.discountPercent && (
              <Badge className="absolute top-4 left-4 bg-secondary text-white border-none z-10 font-extrabold text-sm px-3 py-1 shadow-md">
                -{p.discountPercent}%
              </Badge>
            )}
            <img
              src={images[selectedImage]}
              alt={p.name}
              className="w-full h-full object-contain"
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {images.map((img: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`w-20 h-20 shrink-0 rounded-xl border-2 p-1 overflow-hidden transition-all ${selectedImage === idx ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}
                >
                  <div className="w-full h-full bg-muted flex items-center justify-center rounded-lg">
                    <img src={img} alt="" className="max-h-full object-contain" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <div className="mb-2">
            {p.brandName && (
              <span className="text-sm font-bold text-primary tracking-widest uppercase mb-2 inline-block">
                {p.brandName}
              </span>
            )}
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-foreground leading-tight tracking-tight">
              {p.name}
            </h1>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center text-yellow-400">
              {Array(5).fill(0).map((_, i) => (
                <Star key={i} className={`h-4 w-4 ${i < Math.floor(p.averageRating || 0) ? 'fill-current' : 'text-muted-foreground/30'}`} />
              ))}
              <span className="text-foreground ml-2 text-sm font-medium">({p.reviewCount || 0} avis)</span>
            </div>
            <span className="text-muted-foreground">|</span>
            <span className="text-sm font-medium text-muted-foreground">
              SKU: <span className="text-foreground">{displaySku || 'N/A'}</span>
            </span>
          </div>

          <div className="mb-6">
            <div className="flex items-end gap-3">
              <span className="text-4xl font-extrabold text-primary tracking-tighter">
                {displayPrice.toLocaleString('fr-DZ')} <span className="text-xl font-bold">DA</span>
              </span>
              {displayComparePrice && displayComparePrice > displayPrice && (
                <span className="text-lg text-muted-foreground line-through font-medium mb-1">
                  {displayComparePrice.toLocaleString('fr-DZ')} DA
                </span>
              )}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <StockBadge stock={displayStock} />
            </div>
          </div>

          {/* Options */}
          {p.options && p.options.length > 0 && (
            <div className="space-y-6 mb-8 pt-4 border-t border-border">
              {p.options.sort((a: any, b: any) => a.position - b.position).map((option: any) => (
                <div key={option.id}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-foreground">{option.name}</span>
                    {option.name.toLowerCase() === 'couleur' && selectedOptionValues[option.id] && (
                      <span className="text-sm text-muted-foreground">
                        {option.values.find((v: any) => v.id === selectedOptionValues[option.id])?.label}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {option.values.sort((a: any, b: any) => a.position - b.position).map((val: any) => {
                      const isSelected = selectedOptionValues[option.id] === val.id;
                      const isValid = isOptionValueValid(option.id, val.id);
                      const isColor = option.name.toLowerCase() === 'couleur' && val.colorHex;

                      return (
                        <button
                          key={val.id}
                          onClick={() => handleOptionSelect(option.id, val.id)}
                          className={cn(
                            "relative overflow-hidden transition-all duration-200 border-2 rounded-xl text-sm font-bold",
                            isColor ? "w-12 h-12 rounded-full p-0" : "px-5 py-2.5 min-w-[3rem]",
                            isSelected ? "border-primary ring-2 ring-primary/20 ring-offset-2 ring-offset-background" : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground",
                            !isValid && !isSelected && "opacity-40 cursor-not-allowed",
                            !isColor && isSelected && "bg-primary text-white border-primary"
                          )}
                          disabled={!isValid && !isSelected}
                        >
                          {isColor ? (
                            <div className="w-full h-full" style={{ backgroundColor: val.colorHex }} title={val.label} />
                          ) : (
                            val.label
                          )}
                          {/* Cross-out line if not valid and it's selected (shouldn't happen with our auto-switch, but good for visual fallback) */}
                          {!isValid && !isSelected && (
                            <svg className="absolute inset-0 w-full h-full text-muted-foreground/30 stroke-current" viewBox="0 0 100 100" preserveAspectRatio="none">
                              <line x1="0" y1="100" x2="100" y2="0" strokeWidth="2" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="p-6 bg-muted/30 border border-border rounded-2xl mb-8 space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center bg-background border border-input rounded-lg h-12 w-full sm:w-32 shrink-0">
                <button
                  className="w-10 h-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors rounded-l-lg"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1 || isOutOfStock}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="flex-1 text-center font-bold">{quantity}</div>
                <button
                  className="w-10 h-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors rounded-r-lg"
                  onClick={() => setQuantity(Math.min(displayStock, quantity + 1))}
                  disabled={quantity >= displayStock || isOutOfStock}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <Button
                className="flex-1 h-12 text-base font-bold bg-secondary hover:bg-secondary/90 text-white shadow-lg shadow-secondary/20 disabled:opacity-60"
                disabled={isOutOfStock || (p.options?.length > 0 && !selectedVariant)}
                onClick={() => {
                  addToCart(p.id, quantity, selectedVariant?.id);
                  toast.success(`${quantity}x ${p.name} ajouté au panier`);
                }}
              >
                {isOutOfStock ? (
                  <><XCircle className="mr-2 h-5 w-5" />Rupture de stock</>
                ) : (
                  <><ShoppingCart className="mr-2 h-5 w-5" />Ajouter au panier</>
                )}
              </Button>

              <Button
                variant="outline"
                size="icon"
                className={`h-12 w-12 shrink-0 border-2 ${inWishlist ? 'border-secondary/50 text-secondary bg-secondary/10' : 'border-border text-muted-foreground'}`}
                onClick={() => toggleWishlist(p.id)}
              >
                <Heart className={`h-5 w-5 ${inWishlist ? 'fill-current' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Guarantees */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6 border-y border-border mb-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h5 className="font-bold text-sm text-foreground">Garantie Pro</h5>
                <p className="text-xs text-muted-foreground">{p.warrantyInfo || 'Garantie 6 mois'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                <Truck className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <h5 className="font-bold text-sm text-foreground">Livraison 58 Wilayas</h5>
                <p className="text-xs text-muted-foreground">{p.shippingInfo || 'Expédition sous 24h'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Details Tabs */}
      <Tabs defaultValue="description" className="mb-16">
        <TabsList className="w-full h-auto bg-transparent border-b border-border rounded-none justify-start p-0">
          <TabsTrigger value="description" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 font-bold text-base data-[state=active]:text-primary">
            Description
          </TabsTrigger>
          <TabsTrigger value="specs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 font-bold text-base data-[state=active]:text-primary">
            Caractéristiques techniques
          </TabsTrigger>
          <TabsTrigger value="reviews" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 font-bold text-base data-[state=active]:text-primary">
            Avis ({p.reviewCount || 0})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="description" className="py-8">
          <div className="prose prose-sm md:prose-base max-w-none text-foreground/80" dangerouslySetInnerHTML={{ __html: p.description || '<p>Aucune description disponible.</p>' }} />
        </TabsContent>
        <TabsContent value="specs" className="py-8">
          {p.specifications ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 max-w-4xl">
              {Object.entries(p.specifications as Record<string, string>).map(([key, val]) => (
                <div key={key} className="flex py-3 border-b border-border">
                  <span className="w-1/2 font-semibold text-muted-foreground">{key}</span>
                  <span className="w-1/2 font-bold text-foreground">{val}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Aucune caractéristique technique spécifiée.</p>
          )}
        </TabsContent>
        <TabsContent value="reviews" className="py-8">
          <p className="text-muted-foreground text-center py-10">Les avis seront bientôt disponibles.</p>
        </TabsContent>
      </Tabs>

      {/* Related Products */}
      {relatedProducts && relatedProducts.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-8 border-t border-border pt-10">
            <h3 className="text-2xl font-extrabold tracking-tight">Produits similaires</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {relatedProducts.slice(0, 4).map((rel) => (
              <div key={rel.id} onClick={() => setLocation(`/products/${rel.id}`)} className="cursor-pointer group">
                <div className="aspect-square bg-muted/30 rounded-xl mb-3 p-4 flex items-center justify-center border border-border group-hover:border-primary/50 transition-colors">
                  <img src={getProductImageSrc(rel.images?.[0])} alt={rel.name} className="max-h-full object-contain group-hover:scale-105 transition-transform" />
                </div>
                <h4 className="font-bold text-sm text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">{rel.name}</h4>
                <div className="font-extrabold text-primary">{rel.price.toLocaleString('fr-DZ')} DA</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}