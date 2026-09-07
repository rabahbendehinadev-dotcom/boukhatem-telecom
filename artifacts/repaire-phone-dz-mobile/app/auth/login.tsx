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
import { useLogin } from '@workspace/api-client-react';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const loginMutation = useLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    setError('');
    try {
      const result = await loginMutation.mutateAsync({ data: { email: email.trim(), password } });
      await login(result.token, result.user);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      setError(e?.message ?? 'Email ou mot de passe incorrect');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    topBar: {
      paddingTop: Platform.OS === 'web' ? 67 : insets.top,
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    logo: {
      alignItems: 'center',
      marginBottom: 36,
    },
    logoText: { fontSize: 26, fontWeight: '800' as const, color: colors.primary, letterSpacing: -0.5 },
    logoSub: { fontSize: 13, color: colors.mutedForeground, marginTop: 4 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 24,
      gap: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
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
    inputFocused: { borderColor: colors.primary },
    passwordRow: {
      height: 48,
      borderWidth: 1.5,
      borderColor: colors.input,
      borderRadius: 10,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    errorText: {
      fontSize: 13,
      color: colors.destructive,
      backgroundColor: colors.destructive + '15',
      padding: 10,
      borderRadius: 8,
      textAlign: 'center',
    },
    loginBtn: {
      backgroundColor: colors.primary,
      height: 52,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' as const },
    orRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    divLine: { flex: 1, height: 1, backgroundColor: colors.border },
    orText: { fontSize: 12, color: colors.mutedForeground },
    registerBtn: {
      height: 52, borderRadius: 12,
      borderWidth: 1.5, borderColor: colors.border,
      alignItems: 'center', justifyContent: 'center',
    },
    registerText: { fontSize: 15, fontWeight: '600' as const, color: colors.foreground },
  });

  const [focusedField, setFocusedField] = useState('');

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
            <Text style={styles.logoText}>BOUKHATEM TELECOM</Text>
            <Text style={styles.logoSub}>Votre boutique tech en Algérie</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Connexion</Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, focusedField === 'email' && styles.inputFocused]}
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
              <Text style={styles.label}>Mot de passe</Text>
              <View style={[styles.passwordRow, focusedField === 'password' && { borderColor: colors.primary }]}>
                <TextInput
                  style={{ flex: 1, fontSize: 15, color: colors.foreground }}
                  placeholder="••••••••"
                  placeholderTextColor={colors.mutedForeground}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField('')}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.mutedForeground} />
                </Pressable>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [styles.loginBtn, { opacity: pressed || loginMutation.isPending ? 0.75 : 1 }]}
              onPress={handleLogin}
              disabled={loginMutation.isPending}
            >
              <Text style={styles.loginBtnText}>
                {loginMutation.isPending ? 'Connexion...' : 'Se connecter'}
              </Text>
            </Pressable>

            <View style={styles.orRow}>
              <View style={styles.divLine} />
              <Text style={styles.orText}>ou</Text>
              <View style={styles.divLine} />
            </View>

            <Pressable
              style={({ pressed }) => [styles.registerBtn, { opacity: pressed ? 0.7 : 1 }]}
              onPress={() => router.push('/auth/register')}
            >
              <Text style={styles.registerText}>Créer un compte</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
