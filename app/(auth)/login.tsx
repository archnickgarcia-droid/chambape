import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors, Spacing, Radius, Fonts } from '../../constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Completa todos los campos.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Error al ingresar', error.message);
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.logoBox}>
          <Text style={styles.logoIcon}>🔨</Text>
        </View>
        <Text style={styles.logo}>
          Chamb<Text style={{ color: Colors.yellow }}>a</Text>Pe
        </Text>
        <Text style={styles.subtitle}>Tu chamba, ahora</Text>
      </View>

      {/* FORM */}
      <View style={styles.form}>
        <Text style={styles.formTitle}>Ingresa a tu cuenta</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput
            style={styles.input}
            placeholder="tucorreo@gmail.com"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={styles.forgotBtn}>
          <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.loginBtn, loading && { opacity: 0.7 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="white" />
            : <Text style={styles.loginBtnText}>Entrar →</Text>
          }
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>o</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.registerBtn}
          onPress={() => router.push('/(auth)/register')}
        >
          <Text style={styles.registerBtnText}>Crear cuenta como Cliente</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.workerBtn}
          onPress={() => router.push('/(auth)/register-worker')}
        >
          <Text style={styles.workerBtnText}>🔧 Registrarme como Técnico</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  header: {
    backgroundColor: Colors.red,
    paddingTop: 80,
    paddingBottom: 40,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logoBox: {
    width: 72,
    height: 72,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  logoIcon: { fontSize: 36 },
  logo: {
    fontFamily: Fonts.headingExtraBold,
    fontSize: 40,
    color: 'white',
    letterSpacing: -1,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  form: {
    flex: 1,
    backgroundColor: Colors.cream,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: Spacing.lg,
    marginTop: -20,
    gap: Spacing.md,
  },
  formTitle: {
    fontFamily: Fonts.heading,
    fontSize: 22,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  inputGroup: { gap: 6 },
  label: {
    fontSize: 13,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: 15,
    color: Colors.dark,
    fontFamily: Fonts.body,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  forgotBtn: { alignSelf: 'flex-end' },
  forgotText: { color: Colors.red, fontSize: 13, fontFamily: Fonts.bodyMedium },
  loginBtn: {
    backgroundColor: Colors.red,
    borderRadius: Radius.md,
    padding: Spacing.md + 2,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  loginBtnText: {
    color: 'white',
    fontFamily: Fonts.heading,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.light },
  dividerText: { color: Colors.gray, fontSize: 13 },
  registerBtn: {
    backgroundColor: Colors.light,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  registerBtnText: {
    color: Colors.dark,
    fontFamily: Fonts.heading,
    fontSize: 15,
  },
  workerBtn: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.red,
  },
  workerBtnText: {
    color: Colors.red,
    fontFamily: Fonts.heading,
    fontSize: 15,
  },
});
