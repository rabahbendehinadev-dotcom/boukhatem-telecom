import React from 'react';
import {
  ActivityIndicator,
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
import { useListMyOrders } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: 'En attente', color: '#f59e0b', icon: 'time-outline' },
  confirmed: { label: 'Confirmée', color: '#3b82f6', icon: 'checkmark-circle-outline' },
  processing: { label: 'En traitement', color: '#8b5cf6', icon: 'cog-outline' },
  shipped: { label: 'Expédiée', color: '#06b6d4', icon: 'car-outline' },
  delivered: { label: 'Livrée', color: '#16a34a', icon: 'checkmark-done-outline' },
  cancelled: { label: 'Annulée', color: '#ef4444', icon: 'close-circle-outline' },
};

export default function OrdersScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: orders, isLoading, isError, refetch } = useListMyOrders({ query: { enabled: !!user } as any });

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
    headerTitle: { fontSize: 20, fontWeight: '700' as const, color: colors.foreground },
    orderCard: {
      margin: 16,
      marginBottom: 0,
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    orderHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    orderId: { fontSize: 14, fontWeight: '700' as const, color: colors.foreground },
    orderDate: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
    },
    statusText: { fontSize: 11, fontWeight: '700' as const },
    orderBody: { padding: 14, gap: 6 },
    itemText: { fontSize: 13, color: colors.mutedForeground },
    orderTotal: { fontSize: 16, fontWeight: '800' as const, color: colors.primary },
  });

  if (!user) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center', gap: 16 }]}>
        <Ionicons name="receipt-outline" size={56} color={colors.muted} />
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>Connectez-vous</Text>
        <Pressable onPress={() => router.push('/auth/login')} style={{ backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>Se connecter</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>Mes commandes</Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
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
          data={orders ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingVertical: 16, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80, gap: 12 }}>
              <Ionicons name="receipt-outline" size={56} color={colors.muted} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>Aucune commande</Text>
              <Text style={{ fontSize: 13, color: colors.mutedForeground }}>Vous n'avez pas encore passé de commande</Text>
              <Pressable onPress={() => router.push('/(tabs)/categories')} style={{ backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }}>
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Explorer le catalogue</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => {
            const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
            return (
              <Pressable
                style={({ pressed }) => [styles.orderCard, { opacity: pressed ? 0.85 : 1 }]}
                onPress={() => router.push(`/orders/${item.id}`)}
              >
                <View style={styles.orderHeader}>
                  <View>
                    <Text style={styles.orderId}>Commande #{item.id}</Text>
                    <Text style={styles.orderDate}>
                      {new Date(item.createdAt).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                    <Ionicons name={status.icon as any} size={12} color={status.color} />
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>
                <View style={styles.orderBody}>
                  <Text style={styles.itemText}>
                    {(item.items ?? []).length} article{(item.items ?? []).length > 1 ? 's' : ''}
                    {item.items?.[0] ? ` · ${item.items[0].name}${(item.items?.length ?? 0) > 1 ? ` +${(item.items?.length ?? 1) - 1}` : ''}` : ''}
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.orderTotal}>{item.total.toLocaleString()} DA</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
