import { useQuery } from '@tanstack/react-query';
import { useListBanners } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { getImageSrc } from '@/lib/image-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowRight, ChevronRight, Star, ShoppingCart, Heart,
  ShieldCheck, Zap, Wrench, Package, Tag, Smartphone, CreditCard, Download, ExternalLink,
} from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import { useEffect, useCallback } from 'react';
import { useCart } from '@/hooks/use-cart-store';
import { useWishlist } from '@/hooks/use-wishlist';
import { toast } from 'sonner';
import { useStoreSettings } from '@/hooks/use-store-settings';

// ── Types ──────────────────────────────────────────────────────────────────────

interface HomepageProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  comparePrice: number | null;
  discountPercent: number | null;
  stock: number;
  isNew: boolean;
  isFeatured: boolean;
  hasDiscount: boolean;
  averageRating: number;
  reviewCount: number;
  images: string[];
  brandName: string | null;
  categoryName: string | null;
}

interface HomepageCategory {
  id: number;
  name: string;
  slug: string;
  imageUrl: string | null;
  productCount: number;
}

interface HomepageData {
  featuredProducts: HomepageProduct[];
  newProducts: HomepageProduct[];
  promotionalProducts: HomepageProduct[];
  popularCategories: HomepageCategory[];
}

// ── Data hook ─────────────────────────────────────────────────────────────────

function useHomepage() {
  return useQuery<HomepageData>({
    queryKey: ['homepage'],
    queryFn: async () => {
      const res = await fetch('/api/homepage');
      if (!res.ok) throw new Error('Failed to load homepage');
      return res.json();
    },
    staleTime: 3 * 60 * 1000,
  });
}

// ── Skeleton grid ──────────────────────────────────────────────────────────────

function ProductSkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
      {Array(count).fill(0).map((_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton className="aspect-square rounded-xl" />
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3.5 w-1/2" />
          <Skeleton className="h-8 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

// ── Product card ───────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: HomepageProduct }) {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
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

  const imgSrc = product.images?.[0] ?? null;

  return (
    <Link href={`/products/${product.id}`}>
      <Card className="group h-full flex flex-col cursor-pointer overflow-hidden border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300 bg-card rounded-xl">
        {/* Image area — fixed aspect ratio */}
        <div className="relative aspect-square bg-muted/40 overflow-hidden flex items-center justify-center">
          {/* Badges */}
          {product.hasDiscount && product.discountPercent && product.discountPercent > 0 && (
            <span className="absolute top-3 left-3 bg-secondary text-white text-xs font-extrabold px-2 py-0.5 rounded z-10 shadow-sm">
              -{product.discountPercent}%
            </span>
          )}
          {product.isNew && !(product.hasDiscount && product.discountPercent) && (
            <span className="absolute top-3 left-3 bg-primary text-white text-xs font-extrabold px-2 py-0.5 rounded z-10 shadow-sm">
              Nouveau
            </span>
          )}

          {/* Wishlist */}
          <button
            onClick={handleToggleWishlist}
            className={`absolute top-3 right-3 z-10 p-2 rounded-full transition-colors ${
              inWishlist
                ? 'bg-secondary/10 text-secondary'
                : 'bg-white/80 text-muted-foreground hover:bg-white hover:text-foreground shadow-sm'
            }`}
          >
            <Heart className={`h-4 w-4 ${inWishlist ? 'fill-secondary' : ''}`} />
          </button>

          {/* Product image or unified placeholder */}
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={product.name}
              className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground/40 select-none">
              <Package className="h-14 w-14 stroke-[1.2]" />
            </div>
          )}
        </div>

        {/* Content area — uniform layout via flex */}
        <CardContent className="p-4 flex-1 flex flex-col">
          <p className="text-xs text-muted-foreground font-medium mb-1">
            {product.brandName ?? 'Générique'}
          </p>

          {/* Name — always 2 lines, price always at the bottom */}
          <h4 className="font-bold text-sm leading-snug text-foreground line-clamp-2 min-h-[2.6rem] group-hover:text-primary transition-colors mb-2">
            {product.name}
          </h4>

          {/* Stars */}
          <div className="flex items-center gap-1 mb-3">
            <div className="flex text-yellow-400">
              {Array(5).fill(0).map((_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${
                    i < Math.floor(product.averageRating) ? 'fill-current' : 'text-muted-foreground/25'
                  }`}
                />
              ))}
            </div>
            <span className="text-[10px] text-muted-foreground">({product.reviewCount})</span>
          </div>

          {/* Price row — always at the bottom */}
          <div className="mt-auto flex items-end justify-between gap-2">
            <div>
              <div className="font-extrabold text-lg text-primary tracking-tight leading-tight">
                {product.price.toLocaleString('fr-DZ')}
                <span className="text-xs font-normal ml-1">DA</span>
              </div>
              {product.comparePrice && product.comparePrice > product.price && (
                <div className="text-xs text-muted-foreground line-through font-medium">
                  {product.comparePrice.toLocaleString('fr-DZ')} DA
                </div>
              )}
            </div>
            <Button
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full bg-secondary hover:bg-secondary/90 text-white shadow-md shadow-secondary/20 transition-transform active:scale-95"
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

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({
  title,
  linkHref,
  linkLabel,
  children,
}: {
  title: string;
  linkHref?: string;
  linkLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="container mx-auto px-4">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <h3 className="text-xl md:text-2xl font-extrabold tracking-tight">{title}</h3>
        {linkHref && linkLabel && (
          <Link href={linkHref} className="text-sm font-semibold text-primary hover:text-primary/80 flex items-center group">
            {linkLabel}
            <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function Home() {
  const { data: banners, isLoading: loadingBanners } = useListBanners();
  const { data: homepage, isLoading: loadingHomepage } = useHomepage();
  const { settings } = useStoreSettings();

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const t = setInterval(() => emblaApi.scrollNext(), 5000);
    return () => clearInterval(t);
  }, [emblaApi]);

  const { featuredProducts = [], newProducts = [], promotionalProducts = [], popularCategories = [] } =
    homepage ?? {};
  const quickServices = [
    settings?.flexyEnabled && settings.flexyUrl ? {
      key: 'flexy',
      title: settings.flexyTitle,
      description: settings.flexyDescription,
      buttonText: settings.flexyButtonText,
      url: settings.flexyUrl,
      icon: Smartphone,
      actionIcon: Download,
      accent: 'primary',
    } : null,
    settings?.paymentEnabled && settings.paymentUrl ? {
      key: 'payment',
      title: settings.paymentTitle,
      description: settings.paymentDescription,
      buttonText: settings.paymentButtonText,
      url: settings.paymentUrl,
      icon: CreditCard,
      actionIcon: ExternalLink,
      accent: 'secondary',
    } : null,
  ].filter(Boolean) as Array<{
    key: string;
    title: string;
    description: string;
    buttonText: string;
    url: string;
    icon: typeof Smartphone;
    actionIcon: typeof Download;
    accent: 'primary' | 'secondary';
  }>;

  return (
    <div className="flex flex-col gap-10 md:gap-16 pb-10">

      {/* ── 1. Hero Banner ──────────────────────────────────────────────── */}
      <section className="relative bg-muted">
        <div className="overflow-hidden relative" ref={emblaRef}>
          <div className="flex">
            {loadingBanners ? (
              <div className="flex-[0_0_100%] min-w-0">
                <Skeleton className="w-full aspect-[21/9] md:aspect-[21/7] rounded-none" />
              </div>
            ) : banners?.filter(b => b.isActive).length ? (
              banners.filter(b => b.isActive).map((banner) => {
                const b = banner as any;
                const desktopSrc = getImageSrc(banner.imageUrl) || `https://placehold.co/1920x700/1e3a5f/ffffff?text=${encodeURIComponent(banner.title)}`;
                const mobileSrc  = getImageSrc(b.mobileImageUrl) || desktopSrc;
                const desktopPos = b.desktopPosition || 'left';
                const mobilePos  = b.mobilePosition  || 'left';
                const showTitleDesktop  = b.showTitleDesktop  !== false;
                const showButtonDesktop = b.showButtonDesktop !== false;
                const showTitleMobile   = b.showTitleMobile   !== false;
                const showButtonMobile  = b.showButtonMobile  !== false;
                const hasDesktopOverlay = showTitleDesktop || showButtonDesktop;
                const hasMobileOverlay  = showTitleMobile  || showButtonMobile;
                const posClass = (p: string) =>
                  p === 'center' ? 'items-center text-center' : p === 'right' ? 'items-end text-right' : 'items-start text-left';
                return (
                  <div key={banner.id} className="flex-[0_0_100%] min-w-0 relative">
                    {hasDesktopOverlay && <div className="absolute inset-0 bg-gradient-to-r from-navy/80 via-navy/50 to-transparent z-10 hidden md:block" />}
                    {hasMobileOverlay  && <div className="absolute inset-0 bg-gradient-to-b from-navy/60 via-navy/30 to-transparent z-10 md:hidden" />}
                    <picture>
                      <source media="(max-width: 767px)" srcSet={mobileSrc} />
                      <img
                        src={desktopSrc}
                        alt={banner.title}
                        className="w-full object-cover object-center md:aspect-[21/7]"
                        style={{ minHeight: '360px', maxHeight: '520px' } as React.CSSProperties}
                      />
                    </picture>
                    {hasDesktopOverlay && (
                      <div className={`absolute inset-0 z-20 hidden md:flex flex-col justify-center px-16 container mx-auto ${posClass(desktopPos)}`}>
                        <div className="max-w-xl">
                          {showTitleDesktop && (
                            <>
                              <h2 className="text-4xl lg:text-6xl font-extrabold text-white mb-3 leading-tight tracking-tight drop-shadow-lg">{banner.title}</h2>
                              {banner.subtitle && <p className="text-lg text-white/90 mb-6 font-medium drop-shadow">{banner.subtitle}</p>}
                            </>
                          )}
                          {showButtonDesktop && (
                            <Button asChild size="lg" className="bg-secondary hover:bg-secondary/90 text-white font-bold px-8 h-12 shadow-lg shadow-secondary/20">
                              <Link href={banner.linkUrl || '/products'}>{banner.buttonText || 'Découvrir'} <ArrowRight className="ml-2 h-5 w-5" /></Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                    {hasMobileOverlay && (
                      <div className={`absolute inset-0 z-20 flex md:hidden flex-col justify-end px-4 pb-5 ${posClass(mobilePos)}`}>
                        {showTitleMobile && (
                          <>
                            <h2 className="text-xl font-extrabold text-white mb-1.5 leading-tight drop-shadow-lg">{banner.title}</h2>
                            {banner.subtitle && <p className="text-xs text-white/85 mb-3 font-medium drop-shadow">{banner.subtitle}</p>}
                          </>
                        )}
                        {showButtonMobile && (
                          <Button asChild size="sm" className="bg-secondary hover:bg-secondary/90 text-white font-bold px-5 h-9 text-sm shadow-md self-start">
                            <Link href={banner.linkUrl || '/products'}>{banner.buttonText || 'Découvrir'} <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="flex-[0_0_100%] min-w-0 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-navy/90 to-primary/80 z-10" />
                <div className="w-full aspect-[4/3] md:aspect-[21/7] bg-navy" />
                <div className="absolute inset-0 z-20 flex flex-col justify-center px-6 md:px-16 container mx-auto">
                  <div className="max-w-xl">
                    <span className="inline-block py-1 px-3 rounded-full bg-secondary/20 text-secondary font-bold text-xs uppercase tracking-wider mb-4 border border-secondary/30">Nouveauté</span>
                    <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 leading-tight tracking-tight">L'équipement des pros</h2>
                    <p className="text-lg text-white/90 mb-8 font-medium">Découvrez notre nouvelle gamme de fers à souder et microscopes trinoculaires.</p>
                    <Button asChild size="lg" className="bg-secondary hover:bg-secondary/90 text-white font-bold px-8 h-14">
                      <Link href="/products">Voir le catalogue <ArrowRight className="ml-2" /></Link>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-30">
            {banners?.filter(b => b.isActive).map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-white/50" />
            ))}
          </div>
        </div>

        {/* ── 2. Avantages strip ─────────────────────────────────────────── */}
        <div className="hidden md:block relative z-30 container mx-auto px-4 -mt-8">
          <div className="bg-card rounded-xl shadow-xl border border-border p-6 grid grid-cols-3 gap-6 divide-x divide-border">
            <div className="flex items-center gap-4 px-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h4 className="font-bold text-foreground">Qualité Pro</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Matériel testé et garanti</p>
              </div>
            </div>
            <div className="flex items-center gap-4 px-4">
              <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                <Zap className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <h4 className="font-bold text-foreground">Livraison Rapide</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Partout en Algérie</p>
              </div>
            </div>
            <div className="flex items-center gap-4 px-4">
              <div className="h-12 w-12 rounded-full bg-navy/10 flex items-center justify-center shrink-0">
                <Wrench className="h-6 w-6 text-navy" />
              </div>
              <div>
                <h4 className="font-bold text-foreground">Support Technique</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Par des techniciens pour des techniciens</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {quickServices.length > 0 && (
        <Section title={settings?.servicesSectionTitle || 'Nos services en ligne'}>
          <div className={`grid gap-4 md:gap-6 ${quickServices.length > 1 ? 'md:grid-cols-2' : 'max-w-2xl'}`}>
            {quickServices.map((service) => {
              const Icon = service.icon;
              const ActionIcon = service.actionIcon;
              const isPrimary = service.accent === 'primary';
              return (
                <Card
                  key={service.key}
                  className="group overflow-hidden border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl"
                >
                  <CardContent className="flex h-full flex-col gap-5 p-6 sm:flex-row sm:items-center md:p-8">
                    <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${isPrimary ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                      <Icon className="h-8 w-8" />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <h3 className="text-xl font-extrabold tracking-tight text-foreground">{service.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{service.description}</p>
                      <Button asChild className={`mt-5 w-full sm:w-fit ${isPrimary ? 'bg-primary hover:bg-primary/90' : 'bg-secondary hover:bg-secondary/90'} text-white`}>
                        <a href={service.url} target="_blank" rel="noopener noreferrer">
                          {service.buttonText}
                          <ActionIcon className="ml-2 h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── 3. Catégories Populaires ────────────────────────────────────── */}
      <Section title="Catégories Populaires" linkHref="/categories" linkLabel="Tout voir">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
          {loadingHomepage ? (
            Array(6).fill(0).map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)
          ) : popularCategories.length > 0 ? (
            popularCategories.map((cat) => (
              <Link key={cat.id} href={`/products?categoryId=${cat.id}`}>
                <Card className="aspect-square cursor-pointer group hover:border-primary/50 hover:shadow-md transition-all overflow-hidden bg-muted/30">
                  <CardContent className="p-4 flex flex-col items-center justify-center h-full text-center">
                    <div className="w-16 h-16 md:w-20 md:h-20 mb-3 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
                      {cat.imageUrl ? (
                        <img src={getImageSrc(cat.imageUrl)} alt={cat.name} className="w-10 h-10 md:w-12 md:h-12 object-contain" />
                      ) : (
                        <Wrench className="h-8 w-8 text-muted-foreground/50" />
                      )}
                    </div>
                    <h4 className="font-bold text-xs md:text-sm text-foreground line-clamp-2">{cat.name}</h4>
                  </CardContent>
                </Card>
              </Link>
            ))
          ) : null}
        </div>
      </Section>

      {/* ── 4. Sélection Pro — only if featured products exist ─────────── */}
      {(loadingHomepage || featuredProducts.length > 0) && (
        <Section title="Sélection Pro">
          {loadingHomepage ? (
            <ProductSkeletonGrid />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
              {featuredProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </Section>
      )}

      {/* ── 5. Bannière atelier ─────────────────────────────────────────── */}
      <section className="container mx-auto px-4">
        <div className="bg-navy rounded-2xl overflow-hidden relative shadow-lg">
          <div className="absolute inset-0 opacity-10 mix-blend-overlay bg-gradient-to-br from-white/5 to-transparent" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-8 md:p-12 gap-8">
            <div className="text-center md:text-left max-w-xl">
              <h3 className="text-2xl md:text-4xl font-extrabold text-white mb-3">Besoin d'équiper un nouvel atelier ?</h3>
              <p className="text-white/70 font-medium">Demandez un devis personnalisé et bénéficiez de réductions exclusives pour les professionnels.</p>
            </div>
            <Button asChild size="lg" className="bg-secondary hover:bg-secondary/90 text-white font-bold h-14 px-8 shrink-0">
              <Link href="/products">Demander un devis</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── 6. Nouveaux Arrivages — only if new products exist ─────────── */}
      {(loadingHomepage || newProducts.length > 0) && (
        <Section title="Nouveaux Arrivages" linkHref="/products?isNew=true" linkLabel="Tout voir">
          {loadingHomepage ? (
            <ProductSkeletonGrid />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
              {newProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </Section>
      )}

      {/* ── 7. Promotions — only if promo products exist ───────────────── */}
      {(loadingHomepage || promotionalProducts.length > 0) && (
        <Section title="Promotions" linkHref="/products?hasDiscount=true" linkLabel="Tout voir">
          {loadingHomepage ? (
            <ProductSkeletonGrid />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
              {promotionalProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </Section>
      )}

    </div>
  );
}
