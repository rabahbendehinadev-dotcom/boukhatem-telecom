import React, { useState } from 'react';
import {
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useListProducts, useGetCategory } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SORT_OPTIONS = [
  { value: 'newest', label: 'Nouveautés' },
  { value: 'popular', label: 'Populaires' },
  { value: 'price_asc', label: 'Prix ↑' },
  { value: 'price_desc', label: 'Prix ↓' },
];

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sortBy, setSortBy] = useState('newest');

  const categoryId = Number(id);
  const { data: category } = useGetCategory(categoryId);
  const { data: productsData, isLoading, isError, refetch } = useListProducts({
    categoryId,
    sortBy: sortBy as any,
    limit: 30,
    page: 1,
  });

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: Platform.OS === 'web' ? 67 : insets.top + 8,
      paddingBottom: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '700' as const, color: colors.foreground },
    sortRow: {
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sortChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
    },
    sortChipText: { fontSize: 12, fontWeight: '600' as const },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {category?.name ?? 'Catégorie'}
        </Text>
        {productsData && (
          <Text style={{ fontSize: 13, color: colors.mutedForeground }}>{productsData.total}</Text>
        )}
      </View>

      {/* Sort pills */}
      <View style={styles.sortRow}>
        {SORT_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={[
              styles.sortChip,
              {
                backgroundColor: sortBy === opt.value ? colors.primary : 'transparent',
                borderColor: sortBy === opt.value ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setSortBy(opt.value)}
          >
            <Text style={[styles.sortChipText, { color: sortBy === opt.value ? '#fff' : colors.mutedForeground }]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12 }}>
          {Array(6).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)}
        </View>
      ) : isError ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.mutedForeground} />
          <Pressable onPress={() => refetch()} style={{ backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={productsData?.products ?? []}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: Platform.OS === 'web' ? 84 + 34 : 40 }}
          columnWrapperStyle={{ gap: 12 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80, gap: 8 }}>
              <Ionicons name="grid-outline" size={48} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground, fontSize: 15 }}>Aucun produit dans cette catégorie</Text>
            </View>
          }
          renderItem={({ item }) => <ProductCard product={item} />}
        />
      )}
    </View>
  );
}
