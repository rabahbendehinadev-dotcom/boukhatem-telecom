import React, { useState, useRef } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCreateOrder, useGetCart } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';

// Algerian wilayas (top 15 for brevity)
const WILAYAS = [
  'Adrar', 'Chlef', 'Laghouat', 'Oum El Bouaghi', 'Batna', 'Béjaïa', 'Biskra',
  'Béchar', 'Blida', 'Bouira', 'Tamanrasset', 'Tébessa', 'Tlemcen', 'Tiaret',
  'Tizi Ouzou', 'Alger', 'Djelfa', 'Jijel', 'Sétif', 'Saïda', 'Skikda',
  'Sidi Bel Abbès', 'Annaba', 'Guelma', 'Constantine', 'Médéa', 'Mostaganem',
  'M\'Sila', 'Mascara', 'Ouargla', 'Oran', 'El Bayadh', 'Illizi',
  'Bordj Bou Arréridj', 'Boumerdès', 'El Tarf', 'Tindouf', 'Tissemsilt',
  'El Oued', 'Khenchela', 'Souk Ahras', 'Tipaza', 'Mila', 'Aïn Defla',
  'Naâma', 'Aïn Témouchent', 'Ghardaïa', 'Relizane',
];

export default function CheckoutScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cart } = useGetCart({ query: { enabled: !!user } as any });
  const createOrder = useCreateOrder();

  const [fullName, setFullName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [wilaya, setWilaya] = useState('Alger');
  const [commune, setCommune] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [showWilayaPicker, setShowWilayaPicker] = useState(false);
  const [focusedField, setFocusedField] = useState('');
  // Stable idempotency key per checkout session
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  const handlePlaceOrder = async () => {
    if (!fullName.trim() || !phone.trim() || !address.trim()) {
      Alert.alert('Informations manquantes', 'Veuillez remplir tous les champs obligatoires.');
      return;
    }

    try {
      const order = await createOrder.mutateAsync({
        data: {
          shippingAddress: {
            fullName: fullName.trim(),
            phone: phone.trim(),
            wilaya,
            commune: commune.trim(),
            address: address.trim(),
          },
          notes: notes.trim() || undefined,
          idempotencyKey: idempotencyKeyRef.current,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ['getCart'] });
      await queryClient.invalidateQueries({ queryKey: ['listMyOrders'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/orders/${order.id}`);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Impossible de passer la commande.');
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: Platform.OS === 'web' ? 67 : insets.top + 8,
      paddingBottom: 14,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.background,
    },
    headerTitle: { fontSize: 20, fontWeight: '700' as const, color: colors.foreground },
    section: {
      margin: 16,
      marginBottom: 0,
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 12,
    },
    sectionTitle: { fontSize: 15, fontWeight: '700' as const, color: colors.foreground },
    label: { fontSize: 13, fontWeight: '600' as const, color: colors.mutedForeground, marginBottom: 4 },
    input: {
      height: 46,
      borderWidth: 1.5,
      borderColor: colors.input,
      borderRadius: 10,
      paddingHorizontal: 14,
      fontSize: 15,
      color: colors.foreground,
      backgroundColor: colors.background,
    },
    wilayaBtn: {
      height: 46,
      borderWidth: 1.5,
      borderColor: colors.input,
      borderRadius: 10,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.background,
    },
    wilayaText: { fontSize: 15, color: colors.foreground },
    wilayaList: {
      position: 'absolute',
      left: 0,
      right: 0,
      backgroundColor: colors.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: 200,
      zIndex: 999,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 8,
    },
    wilayaItem: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    wilayaItemText: { fontSize: 14, color: colors.foreground },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
    summaryLabel: { fontSize: 14, color: colors.mutedForeground },
    summaryValue: { fontSize: 14, fontWeight: '600' as const, color: colors.foreground },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
    orderBtn: {
      margin: 16,
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      marginBottom: Platform.OS === 'web' ? 34 + 16 : insets.bottom + 16,
    },
    orderBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' as const },
  });

  const inputStyle = (field: string) => [styles.input, focusedField === field && { borderColor: colors.primary }];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>Finaliser la commande</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
          {/* Shipping address */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Adresse de livraison</Text>

            <View>
              <Text style={styles.label}>Nom complet *</Text>
              <TextInput style={inputStyle('name')} placeholder="Nom et prénom" placeholderTextColor={colors.mutedForeground}
                value={fullName} onChangeText={setFullName}
                onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField('')} />
            </View>

            <View>
              <Text style={styles.label}>Téléphone *</Text>
              <TextInput style={inputStyle('phone')} placeholder="0x xx xx xx xx" placeholderTextColor={colors.mutedForeground}
                value={phone} onChangeText={setPhone} keyboardType="phone-pad"
                onFocus={() => setFocusedField('phone')} onBlur={() => setFocusedField('')} />
            </View>

            <View style={{ zIndex: 10 }}>
              <Text style={styles.label}>Wilaya *</Text>
              <Pressable style={[styles.wilayaBtn, showWilayaPicker && { borderColor: colors.primary }]}
                onPress={() => setShowWilayaPicker(!showWilayaPicker)}>
                <Text style={styles.wilayaText}>{wilaya}</Text>
                <Ionicons name={showWilayaPicker ? 'chevron-up' : 'chevron-down'} size={16} color={colors.mutedForeground} />
              </Pressable>
              {showWilayaPicker && (
                <ScrollView style={styles.wilayaList} nestedScrollEnabled>
                  {WILAYAS.map((w) => (
                    <Pressable key={w} style={[styles.wilayaItem, w === wilaya && { backgroundColor: colors.primary + '15' }]}
                      onPress={() => { setWilaya(w); setShowWilayaPicker(false); }}>
                      <Text style={[styles.wilayaItemText, w === wilaya && { color: colors.primary, fontWeight: '700' }]}>{w}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>

            <View>
              <Text style={styles.label}>Commune</Text>
              <TextInput style={inputStyle('commune')} placeholder="Votre commune" placeholderTextColor={colors.mutedForeground}
                value={commune} onChangeText={setCommune}
                onFocus={() => setFocusedField('commune')} onBlur={() => setFocusedField('')} />
            </View>

            <View>
              <Text style={styles.label}>Adresse *</Text>
              <TextInput style={inputStyle('address')} placeholder="Rue, quartier, numéro..." placeholderTextColor={colors.mutedForeground}
                value={address} onChangeText={setAddress}
                onFocus={() => setFocusedField('address')} onBlur={() => setFocusedField('')} />
            </View>

            <View>
              <Text style={styles.label}>Notes (optionnel)</Text>
              <TextInput
                style={[inputStyle('notes'), { height: 80, paddingTop: 12, textAlignVertical: 'top' }]}
                placeholder="Instructions spéciales pour la livraison..."
                placeholderTextColor={colors.mutedForeground}
                value={notes} onChangeText={setNotes} multiline
                onFocus={() => setFocusedField('notes')} onBlur={() => setFocusedField('')}
              />
            </View>
          </View>

          {/* Order summary */}
          {cart && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Récapitulatif</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Sous-total</Text>
                <Text style={styles.summaryValue}>{cart.subtotal.toLocaleString()} DA</Text>
              </View>
              {(cart.discount ?? 0) > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.secondary }]}>Remise</Text>
                  <Text style={[styles.summaryValue, { color: colors.secondary }]}>-{(cart.discount ?? 0).toLocaleString()} DA</Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Livraison</Text>
                <Text style={styles.summaryValue}>{cart.shipping === 0 ? 'Gratuite' : `${cart.shipping.toLocaleString()} DA`}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>Total</Text>
                <Text style={{ fontSize: 20, fontWeight: '800', color: colors.primary }}>{cart.total.toLocaleString()} DA</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Pressable
        style={({ pressed }) => [styles.orderBtn, { opacity: pressed || createOrder.isPending ? 0.75 : 1 }]}
        onPress={handlePlaceOrder}
        disabled={createOrder.isPending}
      >
        <Text style={styles.orderBtnText}>
          {createOrder.isPending ? 'Traitement...' : `Confirmer la commande · ${(cart?.total ?? 0).toLocaleString()} DA`}
        </Text>
      </Pressable>
    </View>
  );
}
