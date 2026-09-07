import React, { useState } from 'react';
import {
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
import { useRegister } from '@workspace/api-client-react';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const registerMutation = useRegister();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState('');

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }
    if (password !== confirmPwd) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    setError('');
    try {
      const result = await registerMutation.mutateAsync({
        data: { name: name.trim(), email: email.trim(), password, phone: phone.trim() || undefined },
      });
      await login(result.token, result.user);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      setError(e?.message ?? 'Erreur lors de la création du compte');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    topBar: {
      paddingTop: Platform.OS === 'web' ? 67 : insets.top,
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    scroll: { flexGrow: 1, padding: 24 },
    logo: { marginBottom: 28, marginTop: 8 },
    logoText: { fontSize: 22, fontWeight: '800' as const, color: colors.primary },
    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 24,
      gap: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: { fontSize: 22, fontWeight: '800' as const, color: colors.foreground },
    label: { fontSize: 13, fontWeight: '600' as const, color: colors.mutedForeground, marginBottom: 4 },
    input: {
      height: 48,
      borderWidth: 1.5,
      borderColor: colors.input,
      borderRadius: 10,
      paddingHorizontal: 14,
      fontSize: 15,
      color: colors.foreground,
      backgroundColor: colors.background,
    },
    passwordRow: {
      height: 48, borderWidth: 1.5, borderColor: colors.input, borderRadius: 10,
      paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.background,
    },
    errorText: {
      fontSize: 13, color: colors.destructive,
      backgroundColor: colors.destructive + '15',
      padding: 10, borderRadius: 8, textAlign: 'center',
    },
    registerBtn: {
      backgroundColor: colors.primary,
      height: 52, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center',
    },
    registerBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' as const },
    loginLink: { flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: 4 },
    loginLinkText: { fontSize: 14, color: colors.mutedForeground },
    loginLinkBold: { fontSize: 14, color: colors.primary, fontWeight: '700' as const },
  });

  const inputStyle = (field: string) => [
    styles.input,
    focusedField === field && { borderColor: colors.primary },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logo}>
            <Text style={styles.logoText}>Créer un compte</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Inscription</Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View>
              <Text style={styles.label}>Nom complet *</Text>
              <TextInput
                style={inputStyle('name')}
                placeholder="Votre nom"
                placeholderTextColor={colors.mutedForeground}
                value={name}
                onChangeText={setName}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField('')}
              />
            </View>

            <View>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={inputStyle('email')}
                placeholder="votre@email.com"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField('')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View>
              <Text style={styles.label}>Téléphone</Text>
              <TextInput
                style={inputStyle('phone')}
                placeholder="05xx xx xx xx"
                placeholderTextColor={colors.mutedForeground}
                value={phone}
                onChangeText={setPhone}
                onFocus={() => setFocusedField('phone')}
                onBlur={() => setFocusedField('')}
                keyboardType="phone-pad"
              />
            </View>

            <View>
              <Text style={styles.label}>Mot de passe *</Text>
              <View style={[styles.passwordRow, focusedField === 'password' && { borderColor: colors.primary }]}>
                <TextInput
                  style={{ flex: 1, fontSize: 15, color: colors.foreground }}
                  placeholder="Au moins 6 caractères"
                  placeholderTextColor={colors.mutedForeground}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField('')}
                  secureTextEntry={!showPassword}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.mutedForeground} />
                </Pressable>
              </View>
            </View>

            <View>
              <Text style={styles.label}>Confirmer le mot de passe *</Text>
              <TextInput
                style={inputStyle('confirm')}
                placeholder="••••••••"
                placeholderTextColor={colors.mutedForeground}
                value={confirmPwd}
                onChangeText={setConfirmPwd}
                onFocus={() => setFocusedField('confirm')}
                onBlur={() => setFocusedField('')}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
            </View>

            <Pressable
              style={({ pressed }) => [styles.registerBtn, { opacity: pressed || registerMutation.isPending ? 0.75 : 1 }]}
              onPress={handleRegister}
              disabled={registerMutation.isPending}
            >
              <Text style={styles.registerBtnText}>
                {registerMutation.isPending ? 'Création...' : "Créer mon compte"}
              </Text>
            </Pressable>

            <View style={styles.loginLink}>
              <Text style={styles.loginLinkText}>Déjà un compte ?</Text>
              <Pressable onPress={() => router.push('/auth/login')}>
                <Text style={styles.loginLinkBold}>Se connecter</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
