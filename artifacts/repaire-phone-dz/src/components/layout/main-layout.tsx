import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useCart } from '@/hooks/use-cart-store';
import { useWishlist } from '@/hooks/use-wishlist';
import { useAuth } from '@/hooks/use-auth';
import { useStoreSettings } from '@/hooks/use-store-settings';
import { 
  ShoppingCart, Heart, User, Search, Menu, 
  Phone, Mail, Facebook, Instagram, Home, LayoutGrid, X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [location, setLocation] = useLocation();
  const { itemCount } = useCart();
  const { items: wishlistItems } = useWishlist();
  const { user, isAuthenticated, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { storeName, phone, email, facebook, instagram, logoUrl, metaDescription } = useStoreSettings();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const navLinks = [
    { label: 'Accueil', href: '/' },
    { label: 'Tous les Produits', href: '/products' },
    { label: 'Catégories', href: '/categories' },
    { label: 'Nouveautés', href: '/products?isNew=true' },
    { label: 'Promotions', href: '/products?hasDiscount=true' },
  ];

  // Split storeName into two parts for the text fallback.
  const logoWords = storeName.split(' ');
  const logoMain = logoWords.slice(0, -1).join(' ') || storeName;
  const logoAccent = logoWords.length > 1 ? logoWords[logoWords.length - 1] : '';

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background font-sans selection:bg-primary/20">
      {/* Top Bar - Desktop only */}
      <div className="hidden md:flex h-10 bg-navy text-navy-foreground items-center justify-between px-6 text-sm">
        <div className="flex items-center gap-6">
          {phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-secondary" />
              <span>{phone}</span>
            </div>
          )}
          {email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-secondary" />
              <span>{email}</span>
            </div>
          )}
        </div>
        {metaDescription && (
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground/80">{metaDescription}</span>
          </div>
        )}
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-40 w-full bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 lg:px-6 h-20 flex items-center justify-between gap-4 lg:gap-8">
          
          {/* Logo */}
          <div className="flex items-center gap-4 shrink-0">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="h-6 w-6" />
            </Button>
            <Link href="/" className="flex items-center gap-2 cursor-pointer">
              {logoUrl ? (
                <img
                  src={logoUrl.startsWith('/objects/') ? '/api/storage' + logoUrl : logoUrl}
                  alt={storeName}
                  className="h-10 w-auto object-contain"
                />
              ) : (
                <span className="font-extrabold text-2xl tracking-tight text-primary">
                  {logoMain}<span className="text-secondary">{logoAccent}</span>
                </span>
              )}
            </Link>
          </div>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-2xl">
            <form onSubmit={handleSearch} className="relative w-full flex items-center">
              <Input
                type="search"
                placeholder="Rechercher une pièce, un outil, un SKU..."
                className="w-full h-11 pr-14 bg-muted border-border focus-visible:ring-primary rounded-r-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button type="submit" className="h-11 rounded-l-none bg-primary hover:bg-primary/90 text-primary-foreground px-6">
                <Search className="h-5 w-5" />
              </Button>
            </form>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Link href={isAuthenticated ? "/profile" : "/auth/login"} className="hidden sm:flex flex-col items-center justify-center p-2 text-muted-foreground hover:text-primary transition-colors">
              <User className="h-6 w-6 mb-1" />
              <span className="text-[10px] font-semibold uppercase">{isAuthenticated ? "Compte" : "Connexion"}</span>
            </Link>
            
            <Link href="/wishlist" className="hidden sm:flex relative flex-col items-center justify-center p-2 text-muted-foreground hover:text-primary transition-colors">
              <div className="relative">
                <Heart className="h-6 w-6 mb-1" />
                {wishlistItems?.length > 0 && (
                  <span className="absolute -top-1 -right-2 bg-secondary text-white text-[10px] font-bold h-4 min-w-4 px-1 rounded-full flex items-center justify-center border-2 border-card">
                    {wishlistItems.length}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold uppercase">Favoris</span>
            </Link>

            <Link href="/cart" className="relative flex flex-col items-center justify-center p-2 text-muted-foreground hover:text-primary transition-colors">
              <div className="relative">
                <ShoppingCart className="h-6 w-6 mb-1" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-2 bg-secondary text-white text-[10px] font-bold h-4 min-w-4 px-1 rounded-full flex items-center justify-center border-2 border-card">
                    {itemCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold uppercase hidden sm:inline-block">Panier</span>
            </Link>
          </div>
        </div>

        {/* Nav Strip - Desktop */}
        <div className="hidden md:flex h-12 bg-muted/30 border-t border-border">
          <div className="container mx-auto px-6 flex items-center gap-8">
            <Button variant="ghost" className="bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-none h-full px-6 font-bold tracking-tight uppercase text-xs flex items-center gap-2 transition-colors">
              <Menu className="h-4 w-4" />
              Toutes les Catégories
            </Button>
            <nav className="flex items-center gap-6">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} className="text-sm font-semibold text-foreground/80 hover:text-primary transition-colors uppercase tracking-wider">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Search Bar - Mobile */}
      <div className="md:hidden p-4 bg-card border-b border-border z-30 sticky top-20">
        <form onSubmit={handleSearch} className="relative w-full flex items-center">
          <Input
            type="search"
            placeholder="Rechercher..."
            className="w-full h-10 pr-12 bg-muted border-border"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button type="submit" size="icon" className="absolute right-0 h-10 w-12 rounded-l-none bg-primary text-white">
            <Search className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* Main Content */}
      <main className="flex-1 pb-16 md:pb-0">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-navy text-navy-foreground border-t-4 border-primary pb-20 md:pb-0">
        <div className="container mx-auto px-4 py-12 lg:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            <div>
              {logoUrl ? (
                <img
                  src={logoUrl.startsWith('/objects/') ? '/api/storage' + logoUrl : logoUrl}
                  alt={storeName}
                  className="h-10 w-auto object-contain mb-6 brightness-0 invert"
                />
              ) : (
                <span className="font-extrabold text-2xl tracking-tight text-white mb-6 inline-block">
                  {logoMain}<span className="text-secondary">{logoAccent}</span>
                </span>
              )}
              {metaDescription && (
                <p className="text-navy-foreground/70 text-sm mb-6 leading-relaxed">
                  {metaDescription}
                </p>
              )}
              <div className="flex items-center gap-4">
                {facebook && (
                  <a href={facebook} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="rounded-full bg-white/5 hover:bg-primary text-white">
                      <Facebook className="h-5 w-5" />
                    </Button>
                  </a>
                )}
                {instagram && (
                  <a href={instagram} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="rounded-full bg-white/5 hover:bg-primary text-white">
                      <Instagram className="h-5 w-5" />
                    </Button>
                  </a>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="font-bold text-white mb-6 uppercase tracking-wider text-sm">Liens Rapides</h4>
              <ul className="space-y-3">
                <li><Link href="/products" className="text-sm text-navy-foreground/70 hover:text-secondary transition-colors">Tous les produits</Link></li>
                <li><Link href="/categories" className="text-sm text-navy-foreground/70 hover:text-secondary transition-colors">Catégories</Link></li>
                <li><Link href="/products?isNew=true" className="text-sm text-navy-foreground/70 hover:text-secondary transition-colors">Nouveautés</Link></li>
                <li><Link href="/products?hasDiscount=true" className="text-sm text-navy-foreground/70 hover:text-secondary transition-colors">Promotions</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-6 uppercase tracking-wider text-sm">Mon Compte</h4>
              <ul className="space-y-3">
                <li><Link href="/profile" className="text-sm text-navy-foreground/70 hover:text-secondary transition-colors">Mon profil</Link></li>
                <li><Link href="/orders" className="text-sm text-navy-foreground/70 hover:text-secondary transition-colors">Mes commandes</Link></li>
                <li><Link href="/wishlist" className="text-sm text-navy-foreground/70 hover:text-secondary transition-colors">Mes favoris</Link></li>
                <li><Link href="/cart" className="text-sm text-navy-foreground/70 hover:text-secondary transition-colors">Panier</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-6 uppercase tracking-wider text-sm">Contact</h4>
              <ul className="space-y-4">
                {phone && (
                  <li className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                    <span className="text-sm text-navy-foreground/70">{phone}</span>
                  </li>
                )}
                {email && (
                  <li className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                    <span className="text-sm text-navy-foreground/70">{email}</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-navy-foreground/50">© {currentYear} {storeName}. Tous droits réservés.</p>
            <p className="text-sm text-navy-foreground/50 text-center">
              Developed by{' '}
              <a
                href="https://www.tiktok.com/@gabschooldz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-semibold hover:text-primary/80 transition-colors"
              >
                GAB School
              </a>
            </p>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around z-50 px-2 pb-safe">
        <Link href="/" className={`flex flex-col items-center justify-center w-16 h-full ${location === '/' ? 'text-primary' : 'text-muted-foreground'}`}>
          <Home className={`h-5 w-5 mb-1 ${location === '/' ? 'fill-primary/20' : ''}`} />
          <span className="text-[10px] font-semibold">Accueil</span>
        </Link>
        <Link href="/categories" className={`flex flex-col items-center justify-center w-16 h-full ${location === '/categories' ? 'text-primary' : 'text-muted-foreground'}`}>
          <LayoutGrid className={`h-5 w-5 mb-1 ${location === '/categories' ? 'fill-primary/20' : ''}`} />
          <span className="text-[10px] font-semibond">Catégories</span>
        </Link>
        <div className="flex flex-col items-center justify-center w-16 h-full text-muted-foreground cursor-pointer" onClick={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
          if (searchInput) searchInput.focus();
        }}>
          <Search className="h-5 w-5 mb-1" />
          <span className="text-[10px] font-semibold">Recherche</span>
        </div>
        <Link href="/wishlist" className={`flex flex-col items-center justify-center w-16 h-full relative ${location === '/wishlist' ? 'text-primary' : 'text-muted-foreground'}`}>
          <Heart className={`h-5 w-5 mb-1 ${location === '/wishlist' ? 'fill-primary/20' : ''}`} />
          {wishlistItems?.length > 0 && (
            <span className="absolute top-1 right-3 bg-secondary text-white text-[9px] font-bold h-3.5 min-w-3.5 px-1 rounded-full flex items-center justify-center border border-card">
              {wishlistItems.length}
            </span>
          )}
          <span className="text-[10px] font-semibold">Favoris</span>
        </Link>
        <Link href="/cart" className={`flex flex-col items-center justify-center w-16 h-full relative ${location === '/cart' ? 'text-primary' : 'text-muted-foreground'}`}>
          <ShoppingCart className={`h-5 w-5 mb-1 ${location === '/cart' ? 'fill-primary/20' : ''}`} />
          {itemCount > 0 && (
            <span className="absolute top-1 right-3 bg-secondary text-white text-[9px] font-bold h-3.5 min-w-3.5 px-1 rounded-full flex items-center justify-center border border-card">
              {itemCount}
            </span>
          )}
          <span className="text-[10px] font-semibold">Panier</span>
        </Link>
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="absolute top-0 left-0 bottom-0 w-4/5 max-w-sm bg-card shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="h-20 flex items-center justify-between px-6 border-b border-border bg-muted/30">
              {logoUrl ? (
                <img
                  src={logoUrl.startsWith('/objects/') ? '/api/storage' + logoUrl : logoUrl}
                  alt={storeName}
                  className="h-8 w-auto object-contain"
                />
              ) : (
                <span className="font-extrabold text-xl tracking-tight text-primary">
                  {logoMain}<span className="text-secondary">{logoAccent}</span>
                </span>
              )}
              <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                <X className="h-6 w-6" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setIsMobileMenuOpen(false)}>
                  <div className="p-4 rounded-lg hover:bg-muted font-semibold text-foreground/90 transition-colors">
                    {link.label}
                  </div>
                </Link>
              ))}
              <div className="h-px bg-border my-4 mx-4" />
              <Link href={isAuthenticated ? "/profile" : "/auth/login"} onClick={() => setIsMobileMenuOpen(false)}>
                <div className="p-4 rounded-lg hover:bg-muted font-semibold text-foreground/90 flex items-center gap-3 transition-colors">
                  <User className="h-5 w-5 text-muted-foreground" />
                  {isAuthenticated ? "Mon Compte" : "Connexion / Inscription"}
                </div>
              </Link>
            </div>
            {(phone || email) && (
              <div className="p-6 bg-navy text-navy-foreground text-sm">
                <div className="flex flex-col gap-3">
                  {phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-secondary" />
                      <span>{phone}</span>
                    </div>
                  )}
                  {email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-secondary" />
                      <span>{email}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
