import { useQuery } from '@tanstack/react-query';
import { useListBanners } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { getImageSrc } from '@/lib/image-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowRight, ChevronRight, Star, ShoppingCart, Heart,
  ShieldCheck, Zap, Wrench, Package, Tag, Smartphone, CreditCard, Download, ExternalLink, Check, Lock
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
  header,
}: {
  title?: string | React.ReactNode;
  linkHref?: string;
  linkLabel?: string;
  children: React.ReactNode;
  header?: React.ReactNode;
}) {
  return (
    <section className="container mx-auto px-4">
      {header ? header : (
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <h3 className="text-xl md:text-2xl font-extrabold tracking-tight">{title}</h3>
          {linkHref && linkLabel && (
            <Link href={linkHref} className="text-sm font-semibold text-primary hover:text-primary/80 flex items-center group">
              {linkLabel}
              <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

// ── Services Illustrations ──────────────────────────────────────────────────────

function FlexyIllustration() {
  return (
    <div className="relative w-full h-full min-h-[220px] flex items-center justify-center pointer-events-none">
      <div className="absolute w-48 h-48 bg-primary/20 rounded-full blur-3xl -left-8 top-10"></div>
      <div className="absolute w-40 h-40 bg-blue-400/20 rounded-full blur-2xl right-0 bottom-0"></div>

      <div className="relative z-10 w-[130px] h-[260px] md:w-[140px] md:h-[280px] md:-ml-8 bg-navy rounded-[2rem] md:rounded-[2.5rem] border-[6px] md:border-[8px] border-navy shadow-2xl flex flex-col overflow-hidden rotate-[-5deg] transform-gpu group-hover:rotate-0 group-hover:scale-105 transition-all duration-700 ease-out">
        <div className="flex-1 bg-gradient-to-br from-blue-500 via-primary to-blue-900 w-full relative flex flex-col items-center justify-center">
          <div className="absolute top-0 w-14 h-4 bg-navy rounded-b-xl z-20"></div>
          <div className="flex items-center justify-center w-14 h-14 bg-white text-primary rounded-2xl font-black text-3xl mb-3 shadow-lg italic">F</div>
          <div className="text-white font-bold text-xl leading-tight">Flexy</div>
          <div className="text-white/80 text-[9px] mt-1 font-medium">Plus proche de vous</div>
        </div>
      </div>

      <div className="absolute right-4 top-1/2 -translate-y-1/2 rotate-3 text-primary font-bold text-sm leading-snug text-center hidden md:block">
        Tout<br/>Boukhatem<br/>Telecom<br/>dans votre<br/>poche !
      </div>
    </div>
  );
}

function PaymentIllustration() {
  return (
    <div className="relative w-full h-full min-h-[220px] flex items-center justify-center pointer-events-none">
      <div className="absolute w-48 h-48 bg-secondary/20 rounded-full blur-3xl -left-8 top-10"></div>
      <div className="absolute w-40 h-40 bg-orange-400/20 rounded-full blur-2xl right-0 bottom-0"></div>

      <div className="absolute z-0 w-[160px] h-[100px] bg-gradient-to-br from-slate-800 to-slate-950 rounded-xl shadow-xl border border-slate-700 p-4 flex flex-col justify-between right-2 md:right-6 top-1/2 -translate-y-1/2 rotate-[15deg] transform-gpu group-hover:rotate-[20deg] group-hover:translate-x-3 group-hover:-translate-y-5 transition-all duration-700 ease-out">
        <div className="flex justify-between items-center">
          <CreditCard className="w-5 h-5 text-slate-400" />
          <div className="flex -space-x-2">
            <div className="w-5 h-5 rounded-full bg-white/20"></div>
            <div className="w-5 h-5 rounded-full bg-white/20"></div>
          </div>
        </div>
        <div>
          <div className="text-slate-300 font-mono text-[11px] tracking-[0.2em]">**** 3456</div>
          <div className="text-slate-500 font-mono text-[9px] mt-1.5 tracking-wider">12/28</div>
        </div>
      </div>

      <div className="relative z-10 w-[130px] h-[260px] md:w-[140px] md:h-[280px] -ml-12 md:-ml-16 bg-navy rounded-[2rem] md:rounded-[2.5rem] border-[6px] md:border-[8px] border-navy shadow-2xl flex flex-col overflow-hidden rotate-[-8deg] transform-gpu group-hover:rotate-[-4deg] group-hover:scale-105 transition-all duration-700 ease-out">
        <div className="flex-1 bg-white w-full relative flex flex-col items-center justify-center p-4">
          <div className="absolute top-0 w-14 h-4 bg-navy rounded-b-xl"></div>
          <div className="text-navy font-bold text-[11px] mb-6">Paiement sécurisé</div>
          <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30">
            <Check className="w-7 h-7 text-white stroke-[3]" />
          </div>
          <div className="text-navy font-bold text-[10px]">Transaction sécurisée</div>
          <div className="w-20 h-1.5 bg-slate-100 rounded-full mt-6"></div>
          <div className="w-14 h-1.5 bg-slate-100 rounded-full mt-2"></div>
        </div>
      </div>

      <div className="absolute right-2 bottom-8 -rotate-6 text-secondary font-bold text-sm leading-tight text-right hidden md:block">
        Simple<br/>Rapide<br/>Sécurisé
      </div>
    </div>
  );
}

function PaymentMethodsBadges() {
  return (
    <div className="flex items-center gap-2 mb-6 mt-1">
      <div className="bg-white dark:bg-slate-800 shadow-sm border border-black/5 dark:border-white/10 rounded-md px-2 py-1 flex items-center justify-center h-7">
        <span className="text-[10px] font-bold text-navy dark:text-white tracking-tighter">CB</span>
      </div>
      <div className="bg-white dark:bg-slate-800 shadow-sm border border-black/5 dark:border-white/10 rounded-md px-2 py-1 flex items-center justify-center h-7">
        <span className="text-[10px] font-black text-[#1a1f71] dark:text-white italic">VISA</span>
      </div>
      <div className="bg-white dark:bg-slate-800 shadow-sm border border-black/5 dark:border-white/10 rounded-md px-2 py-1 flex items-center justify-center h-7 gap-0.5">
        <div className="w-2.5 h-2.5 rounded-full bg-[#eb001b]"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-[#f79e1b] -ml-1 mix-blend-multiply dark:mix-blend-normal"></div>
      </div>
      <div className="bg-white dark:bg-slate-800 shadow-sm border border-black/5 dark:border-white/10 rounded-md px-2 py-1 flex items-center justify-center h-7">
        <span className="text-[10px] font-bold text-[#b4985a]">الذهبية</span>
      </div>
    </div>
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
      title: settings.flexyTitle || 'Application Flexy',
      description: settings.flexyDescription,
      buttonText: settings.flexyButtonText,
      url: settings.flexyUrl,
      actionIcon: Download,
      accent: 'primary',
      bgClass: 'bg-gradient-to-br from-[#f0f7ff] to-[#e0f0ff] dark:from-primary/10 dark:to-primary/5',
      logo: (
        <div className="bg-primary text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg font-black text-2xl italic">F</div>
      ),
      features: [
        { icon: Zap, text: 'Rapide' },
        { icon: ShieldCheck, text: 'Sécurisée' },
        { icon: Smartphone, text: 'Toujours avec vous' },
      ],
      bottomText: (
        <div className="flex items-center gap-1.5 text-xs text-navy/60 dark:text-slate-400 font-semibold">
          <Smartphone className="w-3.5 h-3.5" />
          <span>Disponible sur Android</span>
        </div>
      ),
      illustration: <FlexyIllustration />
    } : null,
    settings?.paymentEnabled && settings.paymentUrl ? {
      key: 'payment',
      title: settings.paymentTitle || 'Paiement en ligne',
      description: settings.paymentDescription,
      buttonText: settings.paymentButtonText,
      url: settings.paymentUrl,
      actionIcon: Lock,
      accent: 'secondary',
      bgClass: 'bg-gradient-to-br from-[#fff6ef] to-[#ffedd5] dark:from-secondary/10 dark:to-secondary/5',
      logo: (
        <div className="bg-secondary text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg">
          <CreditCard className="w-6 h-6" />
        </div>
      ),
      features: 'payment-methods',
      bottomText: (
        <div className="flex items-center gap-1.5 text-xs text-secondary/80 font-bold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Paiement 100% sécurisé</span>
        </div>
      ),
      illustration: <PaymentIllustration />
    } : null,
  ].filter(Boolean) as Array<any>;

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
        <Section
          header={
            <div className="mb-6 md:mb-8">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-0.5 bg-primary"></div>
                <span className="text-xs font-bold text-primary uppercase tracking-wider">Nos Services</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                {settings?.servicesSectionTitle || 'Nos services en ligne'}
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Des solutions simples et rapides pour mieux vous servir
              </p>
            </div>
          }
        >
          <div className="grid gap-4 md:gap-6 md:grid-cols-2">
            {quickServices.map((service) => {
              const ActionIcon = service.actionIcon;
              const isPrimary = service.accent === 'primary';

              return (
                <div
                  key={service.key}
                  className={`group relative overflow-hidden rounded-3xl border border-border/50 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl ${service.bgClass} ${quickServices.length === 1 ? 'md:col-span-2 max-w-4xl mx-auto w-full' : ''}`}
                >
                  <div className="flex h-full min-h-[300px]">
                    {/* Left Content */}
                    <div className="relative z-20 flex flex-col p-5 md:p-8 w-[66%] sm:w-[58%] lg:w-[60%] shrink-0">
                      <div className="flex items-center gap-4 mb-4">
                        {service.logo}
                        <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight text-navy dark:text-white leading-none">
                          {service.title.split(' ').map((word: string, i: number, arr: string[]) => (
                            <span key={i} className={i === 0 && arr.length > 1 ? "font-medium block text-lg md:text-xl text-navy/80 dark:text-slate-200 mb-1" : ""}>
                              {word}{' '}
                            </span>
                          ))}
                        </h3>
                      </div>

                      <p className="text-sm text-navy/70 dark:text-slate-300 leading-relaxed mb-4 max-w-sm">
                        {service.description}
                      </p>

                      {service.features === 'payment-methods' ? (
                        <PaymentMethodsBadges />
                      ) : Array.isArray(service.features) ? (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-6">
                          {service.features.map((feat: any, i: number) => {
                            const FeatIcon = feat.icon;
                            return (
                              <div key={i} className="flex items-center gap-1.5 text-xs font-semibold text-navy/80 dark:text-slate-300">
                                <FeatIcon className="w-3.5 h-3.5 text-primary" />
                                <span>{feat.text}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}

                      <div className="mt-auto pt-6">
                        <Button asChild className={`w-full sm:w-auto h-11 px-6 rounded-xl font-bold transition-all shadow-lg active:scale-95 ${
                          isPrimary
                            ? 'bg-primary hover:bg-primary/90 text-white shadow-primary/25 hover:shadow-primary/40'
                            : 'bg-secondary hover:bg-secondary/90 text-white shadow-secondary/25 hover:shadow-secondary/40'
                        }`}>
                          <a href={service.url} target="_blank" rel="noopener noreferrer">
                            <ActionIcon className="mr-2 h-4 w-4" />
                            {service.buttonText}
                            <ChevronRight className="ml-1 h-4 w-4 opacity-70 group-hover:translate-x-1 transition-transform" />
                          </a>
                        </Button>

                        {service.bottomText && (
                          <div className="mt-4">
                            {service.bottomText}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Illustration */}
                    <div className="absolute inset-y-0 right-0 w-[42%] sm:w-[45%] overflow-hidden">
                      {service.illustration}
                    </div>
                  </div>
                </div>
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
