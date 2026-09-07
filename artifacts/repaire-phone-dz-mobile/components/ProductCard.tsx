import React from 'react';
import {
  Dimensions,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';

export interface ProductCardData {
  id: number;
  name: string;
  price: number;
  comparePrice?: number | null;
  discountPercent?: number | null;
  images?: string[];
  isNew: boolean;
  hasDiscount?: boolean;
  averageRating?: number;
  reviewCount?: number;
  stock: number;
  brandName?: string | null;
}

interface ProductCardProps {
  product: ProductCardData;
  onWishlistToggle?: (id: number) => void;
  isWishlisted?: boolean;
  width?: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

export function ProductCard({
  product,
  onWishlistToggle,
  isWishlisted = false,
  width,
}: ProductCardProps) {
  const colors = useColors();
  const router = useRouter();
  const cardWidth = width ?? CARD_WIDTH;
  const imageUrl = product.images?.[0] ?? undefined;
  const outOfStock = product.stock === 0;

  const styles = StyleSheet.create({
    card: {
      width: cardWidth,
      backgroundColor: colors.card,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    imageContainer: {
      width: '100%',
      height: cardWidth * 0.85,
      backgroundColor: colors.muted,
      position: 'relative',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    imagePlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badges: {
      position: 'absolute',
      top: 8,
      left: 8,
      gap: 4,
    },
    badge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '700' as const,
      color: '#ffffff',
    },
    wishlistBtn: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    outOfStockOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    outOfStockText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '700' as const,
    },
    info: {
      padding: 10,
      gap: 3,
    },
    brand: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontWeight: '500' as const,
    },
    name: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: colors.foreground,
      lineHeight: 18,
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    ratingText: {
      fontSize: 11,
      color: colors.mutedForeground,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
    },
    price: {
      fontSize: 15,
      fontWeight: '700' as const,
      color: colors.primary,
    },
    comparePrice: {
      fontSize: 12,
      color: colors.mutedForeground,
      textDecorationLine: 'line-through' as const,
    },
  });

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/product/${product.id}`);
      }}
      testID={`product-card-${product.id}`}
    >
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="phone-portrait-outline" size={40} color={colors.mutedForeground} />
          </View>
        )}

        {/* Badges */}
        <View style={styles.badges}>
          {product.isNew && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>Nouveau</Text>
            </View>
          )}
          {product.hasDiscount && product.discountPercent && (
            <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
              <Text style={styles.badgeText}>-{product.discountPercent}%</Text>
            </View>
          )}
        </View>

        {/* Wishlist */}
        {onWishlistToggle && (
          <Pressable
            style={styles.wishlistBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onWishlistToggle(product.id);
            }}
          >
            <Ionicons
              name={isWishlisted ? 'heart' : 'heart-outline'}
              size={16}
              color={isWishlisted ? colors.secondary : colors.mutedForeground}
            />
          </Pressable>
        )}

        {outOfStock && (
          <View style={styles.outOfStockOverlay}>
            <Text style={styles.outOfStockText}>Rupture</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        {product.brandName && <Text style={styles.brand} numberOfLines={1}>{product.brandName}</Text>}
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        {(product.reviewCount ?? 0) > 0 && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={11} color="#f59e0b" />
            <Text style={styles.ratingText}>
              {(product.averageRating ?? 0).toFixed(1)} ({product.reviewCount})
            </Text>
          </View>
        )}
        <View style={styles.priceRow}>
          <Text style={styles.price}>{product.price.toLocaleString()} DA</Text>
          {product.comparePrice && (
            <Text style={styles.comparePrice}>{product.comparePrice.toLocaleString()} DA</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export function ProductCardSkeleton({ width }: { width?: number }) {
  const colors = useColors();
  const cardWidth = width ?? CARD_WIDTH;

  return (
    <View
      style={{
        width: cardWidth,
        backgroundColor: colors.card,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View style={{ width: '100%', height: cardWidth * 0.85, backgroundColor: colors.muted }} />
      <View style={{ padding: 10, gap: 6 }}>
        <View style={{ height: 10, width: '50%', backgroundColor: colors.muted, borderRadius: 4 }} />
        <View style={{ height: 12, width: '90%', backgroundColor: colors.muted, borderRadius: 4 }} />
        <View style={{ height: 12, width: '70%', backgroundColor: colors.muted, borderRadius: 4 }} />
        <View style={{ height: 16, width: '40%', backgroundColor: colors.muted, borderRadius: 4, marginTop: 4 }} />
      </View>
    </View>
  );
}
