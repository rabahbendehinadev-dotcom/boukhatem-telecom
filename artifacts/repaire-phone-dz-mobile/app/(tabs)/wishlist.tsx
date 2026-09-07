import React from 'react';
import {
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetWishlist, useRemoveFromWishlist } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function WishlistScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: wishlist, isLoading } = useGetWishlist({ query: { enabled: !!user } as any });
  const removeFromWishlist = useRemoveFromWishlist();

  const handleRemove = (productId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    removeFromWishlist.mutate(
      { productId },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['getWishlist'] }) }
    );
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: Platform.OS === 'web' ? 67 : insets.top + 8,
      paddingBottom: 16,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    headerTitle: { fontSize: 22, fontWeight: '700' as const, color: colors.foreground },
    count: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  });

  if (!user) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center', gap: 16, paddingBottom: 80 }]}>
        <Ionicons name="heart-outline" size={64} color={colors.muted} />
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground }}>
          Votre liste de favoris
        </Text>
        <Text style={{ fontSize: 14, color: colors.mutedForeground, textAlign: 'center', paddingHorizontal: 40 }}>
          Connectez-vous pour sauvegarder vos articles favoris
        </Text>
        <Pressable
          style={{ backgroundColor: colors.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24 }}
          onPress={() => router.push('/auth/login')}
        >
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Se connecter</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Favoris</Text>
        {wishlist && wishlist.length > 0 && (
          <Text style={styles.count}>{wishlist.length} article{wishlist.length > 1 ? 's' : ''}</Text>
        )}
      </View>

      {isLoading ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12 }}>
          {Array(4).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)}
        </View>
      ) : (
        <FlatList
          data={wishlist ?? []}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: Platform.OS === 'web' ? 84 + 34 : 100 }}
          columnWrapperStyle={{ gap: 12 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80, gap: 12 }}>
              <Ionicons name="heart-outline" size={56} color={colors.muted} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>
                Aucun favori
              </Text>
              <Text style={{ fontSize: 13, color: colors.mutedForeground, textAlign: 'center' }}>
                Ajoutez des articles à votre liste de favoris
              </Text>
              <Pressable
                onPress={() => router.push('/(tabs)/categories')}
                style={{ backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }}
              >
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Parcourir les produits</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              isWishlisted
              onWishlistToggle={handleRemove}
            />
          )}
        />
      )}
    </View>
  );
}
