import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useGetFeaturedProducts,
  useGetNewArrivals,
  useGetPromotionProducts,
  useListBanners,
  useListCategories,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { BannerCarousel, BannerSkeleton } from '@/components/BannerCarousel';
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Map web-app Lucide icon names → Ionicons names
function mapCategoryIcon(iconName?: string | null): any {
  const map: Record<string, string> = {
    Flame: 'flame-outline', Microscope: 'search-outline', Cpu: 'hardware-chip-outline',
    Monitor: 'desktop-outline', Zap: 'flash-outline', Wrench: 'construct-outline',
    Sparkles: 'sparkles-outline', Package: 'cube-outline', Phone: 'phone-portrait-outline',
    Tablet: 'tablet-portrait-outline', Laptop: 'laptop-outline', Watch: 'watch-outline',
    Battery: 'battery-full-outline', Wifi: 'wifi-outline', Bluetooth: 'bluetooth-outline',
    Camera: 'camera-outline', Headphones: 'headset-outline', Speaker: 'volume-high-outline',
    Tool: 'construct-outline', Settings: 'settings-outline', Shield: 'shield-outline',
    Star: 'star-outline', Heart: 'heart-outline', Home: 'home-outline',
  };
  if (!iconName) return 'phone-portrait-outline';
  return (map[iconName] ?? iconName?.includes('-outline') ? iconName : 'phone-portrait-outline') as any;
}

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data: banners, isLoading: bannersLoading, refetch: refetchBanners } = useListBanners();
  const { data: featuredProducts, isLoading: featuredLoading, refetch: refetchFeatured } = useGetFeaturedProducts();
  const { data: newArrivals, isLoading: newLoading, refetch: refetchNew } = useGetNewArrivals();
  const { data: promoProducts, isLoading: promoLoading, refetch: refetchPromo } = useGetPromotionProducts();
  const { data: categories, isLoading: categoriesLoading, refetch: refetchCats } = useListCategories();

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchBanners(), refetchFeatured(), refetchNew(), refetchPromo(), refetchCats()]);
    setRefreshing(false);
  }, [refetchBanners, refetchFeatured, refetchNew, refetchPromo, refetchCats]);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 12,
      paddingTop: Platform.OS === 'web' ? 67 + 8 : insets.top + 8,
      backgroundColor: colors.navy,
    },
    headerLogo: {
      fontSize: 18,
      fontWeight: '800' as const,
      color: '#ffffff',
      letterSpacing: -0.5,
    },
    headerSub: {
      fontSize: 11,
      color: 'rgba(255,255,255,0.7)',
      marginTop: 1,
    },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    section: { marginTop: 24 },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '700' as const,
      color: colors.foreground,
    },
    seeAll: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: '600' as const,
    },
    catGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 16,
      gap: 10,
    },
    catItem: {
      alignItems: 'center',
      justifyContent: 'center',
      width: (SCREEN_WIDTH - 32 - 30) / 4,
      height: 70,
      backgroundColor: colors.muted,
      borderRadius: 12,
      gap: 4,
    },
    catIcon: { fontSize: 22 },
    catName: { fontSize: 10, color: colors.foreground, fontWeight: '600' as const, textAlign: 'center' },
    productRow: {
      paddingLeft: 16,
      gap: 12,
    },
  });

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLogo}>BOUKHATEM TELECOM</Text>
          <Text style={styles.headerSub}>Votre boutique tech en Algérie</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable onPress={() => router.push('/profile')}>
            <Ionicons name={user ? 'person-circle' : 'person-circle-outline'} size={28} color="#ffffff" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 34 + 84 : 100 }}
      >
        {/* Banners */}
        <View style={{ marginTop: 16 }}>
          {bannersLoading ? (
            <BannerSkeleton />
          ) : banners && banners.length > 0 ? (
            <BannerCarousel banners={banners} />
          ) : null}
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Catégories</Text>
            <Pressable onPress={() => router.push('/(tabs)/categories')}>
              <Text style={styles.seeAll}>Voir tout</Text>
            </Pressable>
          </View>
          {categoriesLoading ? (
            <View style={styles.catGrid}>
              {Array(8).fill(0).map((_, i) => (
                <View key={i} style={[styles.catItem, { backgroundColor: colors.muted }]} />
              ))}
            </View>
          ) : (
            <View style={styles.catGrid}>
              {(categories ?? []).slice(0, 8).map((cat) => (
                <Pressable
                  key={cat.id}
                  style={({ pressed }) => [styles.catItem, { opacity: pressed ? 0.7 : 1 }]}
                  onPress={() => router.push(`/category/${cat.id}`)}
                >
                  <Ionicons
                    name={mapCategoryIcon(cat.iconName)}
                    size={22}
                    color={colors.primary}
                  />
                  <Text style={styles.catName} numberOfLines={1}>{cat.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Featured Products */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Populaires</Text>
            <Pressable onPress={() => router.push('/(tabs)/categories')}>
              <Text style={styles.seeAll}>Voir tout</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.productRow, { paddingRight: 16 }]}>
            {featuredLoading
              ? Array(4).fill(0).map((_, i) => <ProductCardSkeleton key={i} width={160} />)
              : (featuredProducts ?? []).map((p) => (
                  <ProductCard key={p.id} product={p} width={160} />
                ))}
          </ScrollView>
        </View>

        {/* New Arrivals */}
        {(newArrivals && newArrivals.length > 0) || newLoading ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Nouveautés</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.productRow, { paddingRight: 16 }]}>
              {newLoading
                ? Array(4).fill(0).map((_, i) => <ProductCardSkeleton key={i} width={160} />)
                : (newArrivals ?? []).map((p) => (
                    <ProductCard key={p.id} product={p} width={160} />
                  ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Promotions */}
        {(promoProducts && promoProducts.length > 0) || promoLoading ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.sectionTitle}>Promotions</Text>
                <View style={{ backgroundColor: colors.secondary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>HOT</Text>
                </View>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.productRow, { paddingRight: 16 }]}>
              {promoLoading
                ? Array(4).fill(0).map((_, i) => <ProductCardSkeleton key={i} width={160} />)
                : (promoProducts ?? []).map((p) => (
                    <ProductCard key={p.id} product={p} width={160} />
                  ))}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
