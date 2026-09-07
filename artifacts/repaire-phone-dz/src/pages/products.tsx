import { useState } from 'react';
import { useLocation } from 'wouter';
import { getProductImageSrc } from '@/lib/image-utils';
import { useListProducts, useListCategories, useListBrands } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SlidersHorizontal, ChevronLeft, ChevronRight, Star, ShoppingCart, Heart, Filter, X } from 'lucide-react';
import { useCart } from '@/hooks/use-cart-store';
import { useWishlist } from '@/hooks/use-wishlist';
import { toast } from 'sonner';

// Helper to parse query string
const useQueryParams = () => {
  // Subscribe to location changes while reading the browser's query string.
  // Wouter's `location` value intentionally excludes `?search=...`.
  useLocation();
  return new URLSearchParams(window.location.search);
};

const PAGE_SIZE = 24;

function getPaginationItems(totalPages: number, currentPage: number): Array<number | 'ellipsis-left' | 'ellipsis-right'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis-right', totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [1, 'ellipsis-left', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, 'ellipsis-left', currentPage - 1, currentPage, currentPage + 1, 'ellipsis-right', totalPages];
}

export default function Products() {
  const query = useQueryParams();
  const [location, setLocation] = useLocation();
  
  // Filters state
  const [search, setSearch] = useState(query.get('search') || '');
  const [categoryId, setCategoryId] = useState<number | null>(query.get('categoryId') ? Number(query.get('categoryId')) : null);
  const [brandId, setBrandId] = useState<number | null>(query.get('brandId') ? Number(query.get('brandId')) : null);
  const [isNew, setIsNew] = useState<boolean>(query.get('isNew') === 'true');
  const [hasDiscount, setHasDiscount] = useState<boolean>(query.get('hasDiscount') === 'true');
  const [inStock, setInStock] = useState<boolean>(query.get('inStock') === 'true');
  const [sortBy, setSortBy] = useState<string>(query.get('sortBy') || 'newest');
  const initialPage = Number(query.get('page'));
  const [page, setPage] = useState<number>(Number.isInteger(initialPage) && initialPage > 0 ? initialPage : 1);
  
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const { data: categories } = useListCategories();
  const { data: brands } = useListBrands();
  
  const { data: productsData, isLoading } = useListProducts({
    search: search || undefined,
    categoryId: categoryId ?? undefined,
    brandId: brandId ?? undefined,
    isNew: isNew || undefined,
    hasDiscount: hasDiscount || undefined,
    inStock: inStock || undefined,
    sortBy: sortBy as any,
    page,
    limit: PAGE_SIZE,
  }, { query: { queryKey: ['products', search, categoryId, brandId, isNew, hasDiscount, inStock, sortBy, page] } });

  const updateFilters = (key: string, value: string | null) => {
    const params = new URLSearchParams(window.location.search);
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete('page');
    setPage(1);
    const queryString = params.toString();
    setLocation(queryString ? `/products?${queryString}` : '/products');
  };

  const resetFilters = () => {
    setSearch('');
    setCategoryId(null);
    setBrandId(null);
    setIsNew(false);
    setHasDiscount(false);
    setInStock(false);
    setSortBy('newest');
    setPage(1);
    setLocation('/products');
  };

  const goToPage = (nextPage: number) => {
    const totalPages = productsData?.totalPages || 0;
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;

    const params = new URLSearchParams(window.location.search);
    params.set('page', String(nextPage));
    setPage(nextPage);
    setLocation(`/products?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleApplyMobileFilters = () => {
    setIsMobileFiltersOpen(false);
  };

  const FiltersContent = () => (
    <div className="space-y-8">
      <div>
        <h4 className="font-bold text-sm mb-4 uppercase tracking-wider text-muted-foreground">Catégories</h4>
        <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-hide pr-2">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="cat-all" 
              checked={categoryId === null}
              onCheckedChange={() => { setCategoryId(null); updateFilters('categoryId', null); }}
            />
            <Label htmlFor="cat-all" className="text-sm font-medium cursor-pointer">Toutes les catégories</Label>
          </div>
          {categories?.map((cat) => (
            <div key={cat.id} className="flex items-center space-x-2">
              <Checkbox 
                id={`cat-${cat.id}`} 
                checked={categoryId === cat.id}
                onCheckedChange={() => { setCategoryId(cat.id); updateFilters('categoryId', cat.id.toString()); }}
              />
              <Label htmlFor={`cat-${cat.id}`} className="text-sm cursor-pointer">{cat.name}</Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-bold text-sm mb-4 uppercase tracking-wider text-muted-foreground">Marques</h4>
        <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-hide pr-2">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="brand-all" 
              checked={brandId === null}
              onCheckedChange={() => { setBrandId(null); updateFilters('brandId', null); }}
            />
            <Label htmlFor="brand-all" className="text-sm font-medium cursor-pointer">Toutes les marques</Label>
          </div>
          {brands?.map((brand) => (
            <div key={brand.id} className="flex items-center space-x-2">
              <Checkbox 
                id={`brand-${brand.id}`} 
                checked={brandId === brand.id}
                onCheckedChange={() => { setBrandId(brand.id); updateFilters('brandId', brand.id.toString()); }}
              />
              <Label htmlFor={`brand-${brand.id}`} className="text-sm cursor-pointer">{brand.name}</Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-bold text-sm mb-4 uppercase tracking-wider text-muted-foreground">État & Dispo</h4>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="filter-new" 
              checked={isNew}
              onCheckedChange={(c) => { setIsNew(!!c); updateFilters('isNew', c ? 'true' : null); }}
            />
            <Label htmlFor="filter-new" className="text-sm cursor-pointer">Nouveautés uniquement</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="filter-discount" 
              checked={hasDiscount}
              onCheckedChange={(c) => { setHasDiscount(!!c); updateFilters('hasDiscount', c ? 'true' : null); }}
            />
            <Label htmlFor="filter-discount" className="text-sm cursor-pointer">En promotion</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="filter-stock" 
              checked={inStock}
              onCheckedChange={(c) => { setInStock(!!c); updateFilters('inStock', c ? 'true' : null); }}
            />
            <Label htmlFor="filter-stock" className="text-sm cursor-pointer">En stock uniquement</Label>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      {/* Page Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">Tous les Produits</h1>
        <p className="text-muted-foreground">L'équipement professionnel de la réparation mobile</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden md:block w-64 shrink-0">
          <div className="sticky top-24">
            <FiltersContent />
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-card p-2 md:p-3 rounded-xl border border-border shadow-sm">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Button 
                variant="outline" 
                className="md:hidden flex-1 border-primary/20 text-primary bg-primary/5"
                onClick={() => setIsMobileFiltersOpen(true)}
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filtres
              </Button>
              <form className="relative flex-1 md:w-64" onSubmit={(e) => {
                e.preventDefault();
                updateFilters('search', search);
              }}>
                <Input
                  type="search"
                  placeholder="Rechercher..."
                  className="w-full bg-muted/50 border-transparent focus-visible:border-primary"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </form>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              <span className="text-sm text-muted-foreground font-medium">
                {productsData?.total || 0} produits
              </span>
              <Select value={sortBy} onValueChange={(val) => { setSortBy(val); updateFilters('sortBy', val); }}>
                <SelectTrigger className="w-[160px] bg-muted/50 border-transparent">
                  <SelectValue placeholder="Trier par" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Plus récents</SelectItem>
                  <SelectItem value="price_asc">Prix croissant</SelectItem>
                  <SelectItem value="price_desc">Prix décroissant</SelectItem>
                  <SelectItem value="popular">Popularité</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Product Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
              {Array(12).fill(0).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-square rounded-xl" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              ))}
            </div>
          ) : productsData?.products.length === 0 ? (
            <div className="text-center py-20 bg-muted/30 rounded-2xl border border-border border-dashed">
              <Filter className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-bold text-foreground mb-2">Aucun produit trouvé</h3>
              <p className="text-muted-foreground mb-6">Essayez de modifier vos filtres de recherche.</p>
              <Button onClick={resetFilters}>Réinitialiser les filtres</Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
              {productsData?.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {productsData && productsData.total > 0 && (
            <div className="mt-8 flex flex-col items-center gap-4 border-t border-border pt-6">
              <p className="text-sm text-muted-foreground text-center">
                Affichage de <span className="font-semibold text-foreground">{(page - 1) * PAGE_SIZE + 1}</span> à{' '}
                <span className="font-semibold text-foreground">{Math.min(page * PAGE_SIZE, productsData.total)}</span> sur{' '}
                <span className="font-semibold text-foreground">{productsData.total}</span> produits
              </p>

              {productsData.totalPages > 1 && (
                <nav aria-label="Pagination des produits" className="flex items-center justify-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(page - 1)}
                    disabled={page <= 1}
                    aria-label="Page précédente"
                    className="gap-1 px-2.5 sm:px-3"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Précédent</span>
                  </Button>

                  <div className="flex items-center gap-1">
                    {getPaginationItems(productsData.totalPages, page).map((item, index) => (
                      typeof item === 'number' ? (
                        <Button
                          key={item}
                          variant={item === page ? 'default' : 'outline'}
                          size="icon"
                          onClick={() => goToPage(item)}
                          aria-label={`Page ${item}`}
                          aria-current={item === page ? 'page' : undefined}
                          className="h-9 w-9"
                        >
                          {item}
                        </Button>
                      ) : (
                        <span
                          key={`${item}-${index}`}
                          className="flex h-9 w-5 items-center justify-center text-sm text-muted-foreground"
                          aria-hidden="true"
                        >
                          …
                        </span>
                      )
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(page + 1)}
                    disabled={page >= productsData.totalPages}
                    aria-label="Page suivante"
                    className="gap-1 px-2.5 sm:px-3"
                  >
                    <span className="hidden sm:inline">Suivant</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </nav>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      {isMobileFiltersOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-background flex flex-col h-[100dvh]">
          <div className="h-14 flex items-center justify-between px-4 border-b border-border bg-card shrink-0">
            <h3 className="font-bold text-lg">Filtres</h3>
            <Button variant="ghost" size="icon" onClick={() => setIsMobileFiltersOpen(false)}>
              <X className="h-6 w-6" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-muted/10">
            <FiltersContent />
          </div>
          <div className="p-4 bg-card border-t border-border shrink-0 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => {
              resetFilters();
              setIsMobileFiltersOpen(false);
            }}>
              Réinitialiser
            </Button>
            <Button className="flex-1 bg-primary" onClick={handleApplyMobileFilters}>
              Appliquer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusing ProductCard from home.tsx (can move to components/ui/product-card.tsx in real app)
function ProductCard({ product }: { product: any }) {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [location, setLocation] = useLocation();
  
  const inWishlist = isInWishlist(product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product.id, 1);
    toast.success(`${product.name} ajouté au panier`);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  return (
    <div onClick={() => setLocation(`/products/${product.id}`)} className="cursor-pointer">
      <Card className="group h-full flex flex-col overflow-hidden border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300 bg-card rounded-xl">
        <div className="relative aspect-square bg-muted/30 p-4 flex items-center justify-center overflow-hidden">
          {product.hasDiscount && product.discountPercent && (
            <div className="absolute top-2 left-2 bg-secondary text-white text-xs font-extrabold px-1.5 py-0.5 rounded z-10 shadow-sm">
              -{product.discountPercent}%
            </div>
          )}
          {product.isNew && !product.hasDiscount && (
            <div className="absolute top-2 left-2 bg-primary text-white text-xs font-extrabold px-1.5 py-0.5 rounded z-10 shadow-sm">
              Nouveau
            </div>
          )}
          <button 
            onClick={handleToggleWishlist}
            className={`absolute top-2 right-2 z-10 p-1.5 rounded-full transition-colors ${inWishlist ? 'bg-secondary/10 text-secondary' : 'bg-white/80 text-muted-foreground hover:bg-white hover:text-foreground shadow-sm'}`}
          >
            <Heart className={`h-4 w-4 ${inWishlist ? 'fill-secondary' : ''}`} />
          </button>
          
          <img 
            src={getProductImageSrc(product.images?.[0])} 
            alt={product.name}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
          />
        </div>
        <CardContent className="p-3 md:p-4 flex-1 flex flex-col gap-1.5">
          <div className="text-[10px] md:text-xs text-muted-foreground font-medium">{product.brandName || 'Générique'}</div>
          <h4 className="font-bold text-xs md:text-sm leading-tight text-foreground line-clamp-2 flex-1 group-hover:text-primary transition-colors">
            {product.name}
          </h4>
          
          <div className="flex items-center gap-1 my-0.5">
            <div className="flex text-yellow-400">
              {Array(5).fill(0).map((_, i) => (
                <Star key={i} className={`h-2.5 w-2.5 md:h-3 md:w-3 ${i < Math.floor(product.averageRating || 0) ? 'fill-current' : 'text-muted-foreground/30'}`} />
              ))}
            </div>
            <span className="text-[9px] md:text-[10px] text-muted-foreground">({product.reviewCount || 0})</span>
          </div>

          <div className="flex items-end justify-between mt-1">
            <div>
              <div className="font-extrabold text-sm md:text-lg text-primary tracking-tight">
                {product.price.toLocaleString('fr-DZ')} <span className="text-[10px] md:text-xs font-normal">DA</span>
              </div>
              {product.comparePrice && (
                <div className="text-[10px] md:text-xs text-muted-foreground line-through font-medium">
                  {product.comparePrice.toLocaleString('fr-DZ')} DA
                </div>
              )}
            </div>
            <Button 
              size="icon" 
              className="h-7 w-7 md:h-9 md:w-9 rounded-full bg-secondary hover:bg-secondary/90 text-white shadow-md shadow-secondary/20 transition-transform active:scale-95 shrink-0"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}