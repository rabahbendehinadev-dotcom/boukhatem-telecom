import React from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useGetCart,
  useUpdateCartItem,
  useRemoveFromCart,
  useClearCart,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';

export default function CartScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cart, isLoading } = useGetCart({ query: { enabled: !!user } as any });
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveFromCart();
  const clearCart = useClearCart();

  const invalidateCart = () => queryClient.invalidateQueries({ queryKey: ['getCart'] });

  const handleQtyChange = (productId: number, qty: number) => {
    if (qty < 1) {
      handleRemove(productId);
      return;
    }
    updateItem.mutate({ productId, data: { quantity: qty } }, { onSuccess: invalidateCart });
  };

  const handleRemove = (productId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    removeItem.mutate({ productId }, { onSuccess: invalidateCart });
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitle: { fontSize: 22, fontWeight: '700' as const, color: colors.foreground },
    cartItem: {
      flexDirection: 'row',
      gap: 12,
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    itemImg: { width: 72, height: 72, borderRadius: 10, backgroundColor: colors.muted },
    itemInfo: { flex: 1, gap: 4 },
    itemName: { fontSize: 14, fontWeight: '600' as const, color: colors.foreground, lineHeight: 20 },
    itemPrice: { fontSize: 15, fontWeight: '700' as const, color: colors.primary },
    qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
    qtyBtn: {
      width: 28, height: 28, borderRadius: 8,
      borderWidth: 1, borderColor: colors.border,
      alignItems: 'center', justifyContent: 'center',
    },
    qtyText: { fontSize: 15, fontWeight: '600' as const, color: colors.foreground, minWidth: 20, textAlign: 'center' },
    summary: {
      margin: 16,
      padding: 16,
      backgroundColor: colors.muted,
      borderRadius: 12,
      gap: 8,
    },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
    summaryLabel: { fontSize: 14, color: colors.mutedForeground },
    summaryValue: { fontSize: 14, fontWeight: '600' as const, color: colors.foreground },
    totalRow: {
      flexDirection: 'row', justifyContent: 'space-between',
      borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 4,
    },
    totalLabel: { fontSize: 16, fontWeight: '700' as const, color: colors.foreground },
    totalValue: { fontSize: 18, fontWeight: '800' as const, color: colors.primary },
    checkoutBtn: {
      margin: 16,
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      marginBottom: Platform.OS === 'web' ? 84 + 34 + 16 : 100,
    },
    checkoutText: { color: '#fff', fontSize: 16, fontWeight: '700' as const },
  });

  if (!user) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center', gap: 16, paddingBottom: 80 }]}>
        <Ionicons name="cart-outline" size={64} color={colors.muted} />
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground }}>Votre panier</Text>
        <Text style={{ fontSize: 14, color: colors.mutedForeground, textAlign: 'center', paddingHorizontal: 40 }}>
          Connectez-vous pour gérer votre panier
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

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Panier</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  const items = cart?.items ?? [];
  const isEmpty = items.length === 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Panier {items.length > 0 ? `(${items.length})` : ''}
        </Text>
        {!isEmpty && (
          <Pressable onPress={() => clearCart.mutate(undefined, { onSuccess: invalidateCart })}>
            <Ionicons name="trash-outline" size={20} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {isEmpty ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 80 }}>
          <Ionicons name="cart-outline" size={56} color={colors.muted} />
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>Panier vide</Text>
          <Text style={{ fontSize: 13, color: colors.mutedForeground }}>Ajoutez des produits pour commencer</Text>
          <Pressable
            onPress={() => router.push('/(tabs)/categories')}
            style={{ backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }}
          >
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Explorer le catalogue</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView>
          {items.map((item) => (
            <View key={item.productId} style={styles.cartItem}>
              {item.images?.[0] ? (
                <Image source={{ uri: item.images[0] }} style={styles.itemImg} resizeMode="cover" />
              ) : (
                <View style={[styles.itemImg, { alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="phone-portrait-outline" size={28} color={colors.mutedForeground} />
                </View>
              )}
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.itemPrice}>{(item.price * item.quantity).toLocaleString()} DA</Text>
                <Text style={{ fontSize: 11, color: colors.mutedForeground }}>{item.price.toLocaleString()} DA / unité</Text>
                <View style={styles.qtyRow}>
                  <Pressable style={styles.qtyBtn} onPress={() => handleQtyChange(item.productId, item.quantity - 1)}>
                    <Ionicons name="remove" size={14} color={colors.foreground} />
                  </Pressable>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <Pressable
                    style={styles.qtyBtn}
                    onPress={() => handleQtyChange(item.productId, item.quantity + 1)}
                    disabled={item.quantity >= (item.stock ?? 99)}
                  >
                    <Ionicons name="add" size={14} color={item.quantity >= (item.stock ?? 99) ? colors.mutedForeground : colors.foreground} />
                  </Pressable>
                </View>
              </View>
              <Pressable onPress={() => handleRemove(item.productId)}>
                <Ionicons name="close-outline" size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>
          ))}

          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Sous-total</Text>
              <Text style={styles.summaryValue}>{(cart?.subtotal ?? 0).toLocaleString()} DA</Text>
            </View>
            {(cart?.discount ?? 0) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.secondary }]}>Remise</Text>
                <Text style={[styles.summaryValue, { color: colors.secondary }]}>-{(cart?.discount ?? 0).toLocaleString()} DA</Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Livraison</Text>
              <Text style={styles.summaryValue}>
                {cart?.shipping === 0 ? 'Gratuite' : `${(cart?.shipping ?? 0).toLocaleString()} DA`}
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{(cart?.total ?? 0).toLocaleString()} DA</Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.checkoutBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/checkout');
            }}
          >
            <Text style={styles.checkoutText}>Passer la commande →</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}
