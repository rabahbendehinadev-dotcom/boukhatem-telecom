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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetOrder } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string; step: number }> = {
  pending: { label: 'En attente', color: '#f59e0b', icon: 'time-outline', step: 0 },
  confirmed: { label: 'Confirmée', color: '#3b82f6', icon: 'checkmark-circle-outline', step: 1 },
  processing: { label: 'En traitement', color: '#8b5cf6', icon: 'cog-outline', step: 2 },
  shipped: { label: 'Expédiée', color: '#06b6d4', icon: 'car-outline', step: 3 },
  delivered: { label: 'Livrée', color: '#16a34a', icon: 'checkmark-done-outline', step: 4 },
  cancelled: { label: 'Annulée', color: '#ef4444', icon: 'close-circle-outline', step: -1 },
};

const STEPS = ['Confirmée', 'Traitement', 'Expédiée', 'Livrée'];

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: order, isLoading, isError } = useGetOrder(Number(id));

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
      gap: 12,
    },
    section: {
      margin: 16,
      marginBottom: 0,
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 10,
    },
    sectionTitle: { fontSize: 15, fontWeight: '700' as const, color: colors.foreground },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      alignSelf: 'flex-start',
    },
    statusText: { fontSize: 13, fontWeight: '700' as const },
    itemRow: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
      paddingVertical: 6,
    },
    itemImg: { width: 56, height: 56, borderRadius: 8, backgroundColor: colors.muted },
    itemName: { fontSize: 13, fontWeight: '600' as const, color: colors.foreground, flex: 1 },
    itemPrice: { fontSize: 13, fontWeight: '700' as const, color: colors.primary },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    label: { fontSize: 14, color: colors.mutedForeground },
    value: { fontSize: 14, fontWeight: '600' as const, color: colors.foreground },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
    totalLabel: { fontSize: 16, fontWeight: '700' as const, color: colors.foreground },
    totalValue: { fontSize: 18, fontWeight: '800' as const, color: colors.primary },
    addrText: { fontSize: 14, color: colors.foreground, lineHeight: 22 },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !order) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center', gap: 12 }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.mutedForeground} />
        <Text style={{ color: colors.foreground }}>Commande introuvable</Text>
        <Pressable onPress={() => router.back()} style={{ backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  const status = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
  const currentStep = status.step;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground }}>
          Commande #{order.id}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statut</Text>
          <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
            <Ionicons name={status.icon as any} size={16} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>

          {/* Progress bar for non-cancelled */}
          {currentStep >= 0 && (
            <View style={{ marginTop: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {STEPS.map((step, i) => (
                  <React.Fragment key={step}>
                    <View style={{ alignItems: 'center', flex: i < STEPS.length - 1 ? undefined : 1 }}>
                      <View style={{
                        width: 24, height: 24, borderRadius: 12,
                        backgroundColor: i <= currentStep - 1 ? colors.primary : colors.muted,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        {i <= currentStep - 1 && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>
                      <Text style={{ fontSize: 9, color: i <= currentStep - 1 ? colors.primary : colors.mutedForeground, marginTop: 3, textAlign: 'center' }}>
                        {step}
                      </Text>
                    </View>
                    {i < STEPS.length - 1 && (
                      <View style={{ flex: 1, height: 2, backgroundColor: i < currentStep - 1 ? colors.primary : colors.muted, marginBottom: 14 }} />
                    )}
                  </React.Fragment>
                ))}
              </View>
            </View>
          )}

          <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
            Commandé le {new Date(order.createdAt).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Articles ({(order.items ?? []).length})</Text>
          {(order.items ?? []).map((item, i) => (
            <View key={i} style={styles.itemRow}>
              {item.images?.[0] ? (
                <Image source={{ uri: item.images[0] }} style={styles.itemImg} resizeMode="cover" />
              ) : (
                <View style={[styles.itemImg, { alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="phone-portrait-outline" size={24} color={colors.mutedForeground} />
                </View>
              )}
              <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.itemPrice}>{(item.price * item.quantity).toLocaleString()} DA</Text>
                <Text style={{ fontSize: 11, color: colors.mutedForeground }}>x{item.quantity}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Récapitulatif</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Sous-total</Text>
            <Text style={styles.value}>{order.subtotal.toLocaleString()} DA</Text>
          </View>
          {(order.discount ?? 0) > 0 && (
            <View style={styles.row}>
              <Text style={[styles.label, { color: colors.secondary }]}>Remise</Text>
              <Text style={[styles.value, { color: colors.secondary }]}>-{(order.discount ?? 0).toLocaleString()} DA</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Livraison</Text>
            <Text style={styles.value}>{(order.shipping ?? 0) === 0 ? 'Gratuite' : `${(order.shipping ?? 0).toLocaleString()} DA`}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{order.total.toLocaleString()} DA</Text>
          </View>
        </View>

        {/* Shipping address */}
        {order.shippingAddress && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Adresse de livraison</Text>
            <Text style={styles.addrText}>
              {order.shippingAddress.fullName}{'\n'}
              {order.shippingAddress.phone}{'\n'}
              {order.shippingAddress.address}{'\n'}
              {order.shippingAddress.commune ? `${order.shippingAddress.commune}, ` : ''}{order.shippingAddress.wilaya}
            </Text>
          </View>
        )}

        {/* Notes */}
        {order.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={{ fontSize: 14, color: colors.mutedForeground }}>{order.notes}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
