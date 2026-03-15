import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors, Spacing, Radius, Fonts } from '../../constants/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!nombre || !email || !telefono || !password) {
      Alert.alert('Error', 'Completa todos los campos.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      // 1. Crear cuenta en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (authError) throw authError;

      // 2. Insertar perfil en tabla users
      const { error: profileError } = await supabase.from('users').insert({
        id: authData.user!.id,
        nombre,
        email,
        telefono,
        rol: 'cliente',
      });
      if (profileError) throw profileError;

      Alert.alert(
        '¡Bienvenido!',
        'Cuenta creada correctamente. Revisa tu email para confirmar.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.cream }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={{ color: 'white', fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Crear cuenta</Text>
          <Text style={styles.headerSub}>Como <Text style={{ color: Colors.yellow, fontFamily: Fonts.heading }}>Cliente</Text></Text>
        </View>

        <View style={styles.form}>
          {[
            { label: '👤 Nombre completo', value: nombre, setter: setNombre, placeholder: 'María García' },
            { label: '📧 Correo electrónico', value: email, setter: setEmail, placeholder: 'maria@gmail.com', keyboard: 'email-address' },
            { label: '📱 Teléfono (WhatsApp)', value: telefono, setter: setTelefono, placeholder: '+51 987 654 321', keyboard: 'phone-pad' },
            { label: '🔒 Contraseña', value: password, setter: setPassword, placeholder: 'Mínimo 6 caracteres', secure: true },
          ].map((field, i) => (
            <View key={i} style={styles.inputGroup}>
              <Text style={styles.label}>{field.label}</Text>
              <TextInput
                style={styles.input}
                placeholder={field.placeholder}
                placeholderTextColor="#999"
                value={field.value}
                onChangeText={field.setter}
                keyboardType={(field as any).keyboard || 'default'}
                autoCapitalize="none"
                secureTextEntry={(field as any).secure}
              />
            </View>
          ))}

          <Text style={styles.terms}>
            Al registrarte aceptas nuestros{' '}
            <Text style={{ color: Colors.red }}>Términos y condiciones</Text>
            {' '}y la{' '}
            <Text style={{ color: Colors.red }}>Política de privacidad</Text>.
          </Text>

          <TouchableOpacity
            style={[styles.btn, loading && { opacity: 0.7 }]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <Text style={styles.btnText}>Crear mi cuenta →</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            style={{ alignItems: 'center', marginTop: Spacing.sm }}
          >
            <Text style={{ color: Colors.gray, fontSize: 14 }}>
              ¿Ya tienes cuenta? <Text style={{ color: Colors.red, fontFamily: Fonts.bodySemiBold }}>Ingresar</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.dark,
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: Spacing.lg,
  },
  backBtn: {
    width: 38, height: 38,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  headerTitle: {
    fontFamily: Fonts.headingExtraBold,
    fontSize: 32,
    color: 'white',
  },
  headerSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    marginTop: 4,
    fontFamily: Fonts.body,
  },
  form: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  inputGroup: { gap: 6 },
  label: {
    fontSize: 13,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.gray,
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
  terms: {
    fontSize: 13,
    color: Colors.gray,
    lineHeight: 20,
    fontFamily: Fonts.body,
  },
  btn: {
    backgroundColor: Colors.red,
    borderRadius: Radius.md,
    padding: Spacing.md + 2,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  btnText: {
    color: 'white',
    fontFamily: Fonts.heading,
    fontSize: 16,
  },
});
