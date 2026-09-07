import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { AuthProvider } from '@/hooks/use-auth';
import { AdminAuthProvider } from '@/hooks/use-admin-auth';
import { CartProvider } from '@/hooks/use-cart-store';
import { WishlistProvider } from '@/hooks/use-wishlist';
import { MainLayout } from '@/components/layout/main-layout';
import { ScrollToTop } from '@/components/scroll-to-top';
import { AdminLayout } from '@/components/layout/admin-layout';
import NotFound from '@/pages/not-found';

import Home from '@/pages/home';
import Products from '@/pages/products';
import ProductDetail from '@/pages/product-detail';
import Categories from '@/pages/categories';
import Cart from '@/pages/cart';
import Checkout from '@/pages/checkout';
import Wishlist from '@/pages/wishlist';
import Orders from '@/pages/orders';
import OrderDetail from '@/pages/order-detail';
import Profile from '@/pages/profile';
import Login from '@/pages/auth/login';
import Register from '@/pages/auth/register';

import AdminLogin from '@/pages/admin/login';
import AdminDashboard from '@/pages/admin/dashboard';
import AdminProducts from '@/pages/admin/products';
import AdminOrders from '@/pages/admin/orders';
import AdminCategories from '@/pages/admin/categories';
import AdminBrands from '@/pages/admin/brands';
import AdminCoupons from '@/pages/admin/coupons';
import AdminBanners from '@/pages/admin/banners';
import AdminCustomers from '@/pages/admin/customers';
import AdminUsers from '@/pages/admin/users';
import AdminActivity from '@/pages/admin/activity';
import AdminSettings from '@/pages/admin/settings';
import AdminShippingRates from '@/pages/admin/shipping-rates';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function MainRoutes() {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <MainLayout>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/products" component={Products} />
              <Route path="/products/:id" component={ProductDetail} />
              <Route path="/categories" component={Categories} />
              <Route path="/cart" component={Cart} />
              <Route path="/checkout" component={Checkout} />
              <Route path="/wishlist" component={Wishlist} />
              <Route path="/orders" component={Orders} />
              <Route path="/orders/:id" component={OrderDetail} />
              <Route path="/profile" component={Profile} />
              <Route path="/auth/login" component={Login} />
              <Route path="/auth/register" component={Register} />
              <Route component={NotFound} />
            </Switch>
          </MainLayout>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}

function AdminRoutes() {
  return (
    <AdminAuthProvider>
      <Switch>
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin/*?">
          <AdminLayout>
            <Switch>
              <Route path="/admin" component={AdminDashboard} />
              <Route path="/admin/products" component={AdminProducts} />
              <Route path="/admin/orders" component={AdminOrders} />
              <Route path="/admin/categories" component={AdminCategories} />
              <Route path="/admin/brands" component={AdminBrands} />
              <Route path="/admin/coupons" component={AdminCoupons} />
              <Route path="/admin/banners" component={AdminBanners} />
              <Route path="/admin/customers" component={AdminCustomers} />
              <Route path="/admin/users" component={AdminUsers} />
              <Route path="/admin/activity" component={AdminActivity} />
              <Route path="/admin/settings" component={AdminSettings} />
              <Route path="/admin/shipping-rates" component={AdminShippingRates} />
              <Route component={NotFound} />
            </Switch>
          </AdminLayout>
        </Route>
      </Switch>
    </AdminAuthProvider>
  );
}

function AppRouter() {
  const [location] = useLocation();
  const isAdminRoute = location.startsWith('/admin');

  return (
    <Switch>
      {isAdminRoute ? (
        <Route path="/admin/*?">
          <AdminRoutes />
        </Route>
      ) : (
        <Route path="/*">
          <MainRoutes />
        </Route>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <ScrollToTop />
        <AppRouter />
        <Toaster />
        <SonnerToaster position="bottom-right" richColors duration={3500} />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;