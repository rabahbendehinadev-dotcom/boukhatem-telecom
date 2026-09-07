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
import { useListCategories } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';

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
  };
  if (!iconName) return 'phone-portrait-outline';
  return (map[iconName] ?? iconName?.includes('-outline') ? iconName : 'phone-portrait-outline') as any;
}

export default function CategoriesScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: categories, isLoading, isError, refetch } = useListCategories();

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: Platform.OS === 'web' ? 67 : insets.top + 8,
      paddingBottom: 16,
      paddingHorizontal: 16,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: 22, fontWeight: '700' as const, color: colors.foreground },
    catItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
    },
    iconBox: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: colors.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    catName: { flex: 1, fontSize: 15, fontWeight: '600' as const, color: colors.foreground },
    catCount: { fontSize: 13, color: colors.mutedForeground },
    skeleton: {
      height: 72,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
    },
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Catégories</Text>
        </View>
        {Array(10).fill(0).map((_, i) => (
          <View key={i} style={styles.skeleton}>
            <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: colors.muted }} />
            <View style={{ flex: 1, height: 14, backgroundColor: colors.muted, borderRadius: 4 }} />
          </View>
        ))}
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center', gap: 12 }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.mutedForeground} />
        <Text style={{ color: colors.foreground, fontSize: 15 }}>Erreur de chargement</Text>
        <Pressable
          onPress={() => refetch()}
          style={{ backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Catégories</Text>
      </View>
      <FlatList
        data={categories ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 84 + 34 : 100 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 8 }}>
            <Ionicons name="grid-outline" size={48} color={colors.mutedForeground} />
            <Text style={{ color: colors.mutedForeground, fontSize: 15 }}>Aucune catégorie</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.catItem, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => router.push(`/category/${item.id}`)}
          >
            <View style={styles.iconBox}>
              <Ionicons
                name={mapCategoryIcon(item.iconName)}
                size={22}
                color={colors.primary}
              />
            </View>
            <Text style={styles.catName}>{item.name}</Text>
            {item.productCount !== undefined && item.productCount > 0 && (
              <Text style={styles.catCount}>{item.productCount} produits</Text>
            )}
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
      />
    </View>
  );
}
