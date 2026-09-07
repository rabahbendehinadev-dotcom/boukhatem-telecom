import React from 'react';
import {
  Alert,
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
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnecter',
        style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await logout();
        },
      },
    ]);
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: Platform.OS === 'web' ? 67 : insets.top + 8,
      paddingBottom: 16,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: '700' as const, color: colors.foreground },
    avatar: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: colors.primary + '20',
      alignItems: 'center', justifyContent: 'center',
      alignSelf: 'center',
      marginTop: 28,
    },
    userName: { fontSize: 20, fontWeight: '700' as const, color: colors.foreground, textAlign: 'center', marginTop: 12 },
    userEmail: { fontSize: 14, color: colors.mutedForeground, textAlign: 'center', marginTop: 2 },
    section: {
      marginTop: 28,
      marginHorizontal: 16,
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    menuItemLast: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 16,
    },
    menuIcon: {
      width: 36, height: 36, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    menuLabel: { flex: 1, fontSize: 15, fontWeight: '600' as const, color: colors.foreground },
    loginCard: {
      margin: 24,
      backgroundColor: colors.muted,
      borderRadius: 20,
      padding: 28,
      alignItems: 'center',
      gap: 12,
    },
    loginTitle: { fontSize: 18, fontWeight: '700' as const, color: colors.foreground },
    loginSub: { fontSize: 14, color: colors.mutedForeground, textAlign: 'center' },
    loginBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 32, paddingVertical: 14,
      borderRadius: 24, width: '100%',
      alignItems: 'center',
    },
    loginBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' as const },
  });

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={styles.headerTitle}>Profil</Text>
        </View>
        <View style={[{ flex: 1, alignItems: 'center', justifyContent: 'center' }]}>
          <View style={styles.loginCard}>
            <Ionicons name="person-circle-outline" size={64} color={colors.mutedForeground} />
            <Text style={styles.loginTitle}>Mon compte</Text>
            <Text style={styles.loginSub}>Connectez-vous pour accéder à votre profil et gérer vos commandes</Text>
            <Pressable style={styles.loginBtn} onPress={() => router.push('/auth/login')}>
              <Text style={styles.loginBtnText}>Se connecter</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/auth/register')}>
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>Créer un compte</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>Mon profil</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Avatar */}
        <View style={styles.avatar}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: colors.primary }}>{initials}</Text>
        </View>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>

        {/* Menu */}
        <View style={styles.section}>
          <Pressable
            style={({ pressed }) => [styles.menuItem, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => router.push('/orders')}
          >
            <View style={[styles.menuIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="receipt-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.menuLabel}>Mes commandes</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.menuItem, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => router.push('/(tabs)/wishlist')}
          >
            <View style={[styles.menuIcon, { backgroundColor: colors.secondary + '20' }]}>
              <Ionicons name="heart-outline" size={18} color={colors.secondary} />
            </View>
            <Text style={styles.menuLabel}>Mes favoris</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.menuItemLast, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => router.push('/(tabs)/cart')}
          >
            <View style={[styles.menuIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="cart-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.menuLabel}>Mon panier</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {/* Account info */}
        <View style={styles.section}>
          {user.phone && (
            <View style={styles.menuItem}>
              <View style={[styles.menuIcon, { backgroundColor: colors.muted }]}>
                <Ionicons name="call-outline" size={18} color={colors.mutedForeground} />
              </View>
              <Text style={styles.menuLabel}>{user.phone}</Text>
            </View>
          )}
          <View style={styles.menuItemLast}>
            <View style={[styles.menuIcon, { backgroundColor: colors.muted }]}>
              <Ionicons name="calendar-outline" size={18} color={colors.mutedForeground} />
            </View>
            <Text style={{ fontSize: 13, color: colors.mutedForeground }}>
              Membre depuis {new Date(user.createdAt ?? '').toLocaleDateString('fr-DZ', { month: 'long', year: 'numeric' })}
            </Text>
          </View>
        </View>

        {/* Logout */}
        <View style={[styles.section, { marginTop: 16 }]}>
          <Pressable
            style={({ pressed }) => [styles.menuItemLast, { opacity: pressed ? 0.7 : 1 }]}
            onPress={handleLogout}
          >
            <View style={[styles.menuIcon, { backgroundColor: colors.destructive + '15' }]}>
              <Ionicons name="log-out-outline" size={18} color={colors.destructive} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.destructive }]}>Se déconnecter</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
