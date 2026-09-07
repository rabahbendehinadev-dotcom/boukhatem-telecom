import React, { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useGetProduct,
  useGetRelatedProducts,
  useAddToCart,
  useAddToWishlist,
  useRemoveFromWishlist,
  useGetWishlist,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { ProductCard } from '@/components/ProductCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  const productId = Number(id);
  const { data: product, isLoading, isError } = useGetProduct(productId);
  const { data: related } = useGetRelatedProducts(productId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: wishlist } = useGetWishlist({ query: { enabled: !!user } as any });

  const addToCart = useAddToCart();
  const addToWishlist = useAddToWishlist();
  const removeFromWishlist = useRemoveFromWishlist();

  const isWishlisted = wishlist?.some((p) => p.id === productId) ?? false;

  const handleAddToCart = () => {
    if (!user) { router.push('/auth/login'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addToCart.mutate(
      { data: { productId, quantity } },
      {
        onSuccess: () => {
          setAddedToCart(true);
          queryClient.invalidateQueries({ queryKey: ['getCart'] });
          setTimeout(() => setAddedToCart(false), 2000);
        },
      }
    );
  };

  const handleWishlist = () => {
    if (!user) { router.push('/auth/login'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isWishlisted) {
      removeFromWishlist.mutate({ productId }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['getWishlist'] }) });
    } else {
      addToWishlist.mutate({ productId }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['getWishlist'] }) });
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    topBar: {
      position: 'absolute',
      top: Platform.OS === 'web' ? 67 : insets.top,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 8,
      zIndex: 10,
    },
    topBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.95)',
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15, shadowRadius: 3, elevation: 3,
    },
    imageContainer: {
      width: SCREEN_WIDTH,
      height: SCREEN_WIDTH * 0.85,
      backgroundColor: colors.muted,
    },
    mainImage: { width: '100%', height: '100%' },
    thumbnails: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    thumb: {
      width: 56, height: 56, borderRadius: 8,
      borderWidth: 2, overflow: 'hidden',
    },
    content: { padding: 16, gap: 10 },
    badges: { flexDirection: 'row', gap: 6 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    badgeText: { fontSize: 11, fontWeight: '700' as const, color: '#fff' },
    name: { fontSize: 20, fontWeight: '800' as const, color: colors.foreground, lineHeight: 26 },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    brandText: { fontSize: 13, color: colors.mutedForeground },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    ratingText: { fontSize: 13, color: colors.mutedForeground },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
    price: { fontSize: 26, fontWeight: '800' as const, color: colors.primary },
    comparePrice: { fontSize: 16, color: colors.mutedForeground, textDecorationLine: 'line-through' as const },
    discount: { fontSize: 13, fontWeight: '700' as const, color: colors.secondary },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
    sectionTitle: { fontSize: 15, fontWeight: '700' as const, color: colors.foreground },
    descText: { fontSize: 14, color: colors.mutedForeground, lineHeight: 22 },
    specRow: { flexDirection: 'row', paddingVertical: 6, gap: 8 },
    specKey: { flex: 1, fontSize: 13, color: colors.mutedForeground },
    specVal: { flex: 1.5, fontSize: 13, fontWeight: '600' as const, color: colors.foreground },
    qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    qtyBtn: {
      width: 36, height: 36, borderRadius: 10,
      borderWidth: 1, borderColor: colors.border,
      alignItems: 'center', justifyContent: 'center',
    },
    qtyText: { fontSize: 17, fontWeight: '700' as const, color: colors.foreground, minWidth: 28, textAlign: 'center' },
    bottomBar: {
      flexDirection: 'row',
      gap: 10,
      padding: 16,
      paddingBottom: Platform.OS === 'web' ? 34 + 16 : insets.bottom + 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    wishlistBtn: {
      width: 52, height: 52, borderRadius: 14,
      borderWidth: 1.5, borderColor: colors.border,
      alignItems: 'center', justifyContent: 'center',
    },
    addBtn: {
      flex: 1, height: 52, borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
    },
    addBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' as const },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !product) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center', gap: 12 }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.mutedForeground} />
        <Text style={{ color: colors.foreground, fontSize: 15 }}>Produit introuvable</Text>
        <Pressable onPress={() => router.back()} style={{ backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  const images = product.images ?? [];
  const specs = product.specifications ? Object.entries(product.specifications as Record<string, string>) : [];

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable style={styles.topBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={18} color={colors.foreground} />
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable style={styles.topBtn} onPress={handleWishlist}>
            <Ionicons name={isWishlisted ? 'heart' : 'heart-outline'} size={18} color={isWishlisted ? colors.secondary : colors.foreground} />
          </Pressable>
          <Pressable style={styles.topBtn} onPress={() => router.push('/(tabs)/cart')}>
            <Ionicons name="cart-outline" size={18} color={colors.foreground} />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Main image */}
        <View style={styles.imageContainer}>
          {images.length > 0 ? (
            <Image source={{ uri: images[selectedImage] }} style={styles.mainImage} resizeMode="contain" />
          ) : (
            <View style={[styles.imageContainer, { alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="phone-portrait-outline" size={80} color={colors.mutedForeground} />
            </View>
          )}
        </View>

        {/* Thumbnails */}
        {images.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnails}>
            {images.map((img, idx) => (
              <Pressable
                key={idx}
                style={[styles.thumb, { borderColor: idx === selectedImage ? colors.primary : colors.border }]}
                onPress={() => setSelectedImage(idx)}
              >
                <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              </Pressable>
            ))}
          </ScrollView>
        )}

        <View style={styles.content}>
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
            {product.stock === 0 && (
              <View style={[styles.badge, { backgroundColor: colors.destructive }]}>
                <Text style={styles.badgeText}>Rupture de stock</Text>
              </View>
            )}
          </View>

          {/* Name + brand */}
          <Text style={styles.name}>{product.name}</Text>
          {(product.brandName || product.categoryName) && (
            <View style={styles.brandRow}>
              {product.brandName && <Text style={styles.brandText}>{product.brandName}</Text>}
              {product.brandName && product.categoryName && <Text style={styles.brandText}>·</Text>}
              {product.categoryName && <Text style={styles.brandText}>{product.categoryName}</Text>}
            </View>
          )}

          {/* Rating */}
          {(product.reviewCount ?? 0) > 0 && (
            <View style={styles.ratingRow}>
              {Array(5).fill(0).map((_, i) => (
                <Ionicons key={i} name={i < Math.round(product.averageRating ?? 0) ? 'star' : 'star-outline'} size={14} color="#f59e0b" />
              ))}
              <Text style={styles.ratingText}>{(product.averageRating ?? 0).toFixed(1)} ({product.reviewCount} avis)</Text>
            </View>
          )}

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>{product.price.toLocaleString()} DA</Text>
            {product.comparePrice && <Text style={styles.comparePrice}>{product.comparePrice.toLocaleString()} DA</Text>}
            {product.discountPercent && <Text style={styles.discount}>(-{product.discountPercent}%)</Text>}
          </View>

          {/* Stock info */}
          {product.stock > 0 && product.stock <= 5 && (
            <Text style={{ fontSize: 12, color: colors.secondary, fontWeight: '600' }}>
              Plus que {product.stock} en stock !
            </Text>
          )}

          <View style={styles.divider} />

          {/* Quantity */}
          <View style={{ gap: 8 }}>
            <Text style={styles.sectionTitle}>Quantité</Text>
            <View style={styles.qtyRow}>
              <Pressable style={styles.qtyBtn} onPress={() => setQuantity(Math.max(1, quantity - 1))}>
                <Ionicons name="remove" size={16} color={colors.foreground} />
              </Pressable>
              <Text style={styles.qtyText}>{quantity}</Text>
              <Pressable
                style={styles.qtyBtn}
                onPress={() => setQuantity(Math.min(product.stock, quantity + 1))}
                disabled={quantity >= product.stock}
              >
                <Ionicons name="add" size={16} color={quantity >= product.stock ? colors.mutedForeground : colors.foreground} />
              </Pressable>
            </View>
          </View>

          {/* Description */}
          {product.description && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.descText}>{product.description}</Text>
            </>
          )}

          {/* Specs */}
          {specs.length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>Caractéristiques</Text>
              {specs.map(([k, v]) => (
                <View key={k} style={styles.specRow}>
                  <Text style={styles.specKey}>{k}</Text>
                  <Text style={styles.specVal}>{String(v)}</Text>
                </View>
              ))}
            </>
          )}

          {/* Warranty / Shipping */}
          {(product.warrantyInfo || product.shippingInfo) && (
            <>
              <View style={styles.divider} />
              {product.warrantyInfo && (
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
                  <Text style={{ fontSize: 13, color: colors.foreground }}>{product.warrantyInfo}</Text>
                </View>
              )}
              {product.shippingInfo && (
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <Ionicons name="car-outline" size={16} color={colors.primary} />
                  <Text style={{ fontSize: 13, color: colors.foreground }}>{product.shippingInfo}</Text>
                </View>
              )}
            </>
          )}

          {/* Related */}
          {related && related.length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>Produits similaires</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {related.map((p) => <ProductCard key={p.id} product={p} width={150} />)}
              </ScrollView>
            </>
          )}
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <Pressable style={styles.wishlistBtn} onPress={handleWishlist}>
          <Ionicons name={isWishlisted ? 'heart' : 'heart-outline'} size={22} color={isWishlisted ? colors.secondary : colors.mutedForeground} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.addBtn, { opacity: pressed || product.stock === 0 ? 0.7 : 1, backgroundColor: addedToCart ? '#16a34a' : colors.primary }]}
          onPress={handleAddToCart}
          disabled={product.stock === 0}
        >
          <Text style={styles.addBtnText}>
            {product.stock === 0 ? 'Rupture de stock' : addedToCart ? '✓ Ajouté au panier' : 'Ajouter au panier'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
