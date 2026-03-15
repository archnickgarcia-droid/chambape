import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { Colors, Spacing, Radius, Fonts, Shadow } from '../../constants/theme';
import { BottomNav } from './home';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const [notifPush, setNotifPush] = useState(true);

  const handleSignOut = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: signOut },
    ]);
  };

  const menuItems = [
    {
      section: 'Mi cuenta',
      items: [
        { icon: '👤', label: 'Editar perfil', action: () => {} },
        { icon: '🔒', label: 'Cambiar contraseña', action: () => {} },
        { icon: '📍', label: 'Mis direcciones', action: () => {} },
      ],
    },
    {
      section: 'Preferencias',
      items: [
        { icon: '🔔', label: 'Notificaciones push', toggle: true, value: notifPush, setter: setNotifPush },
        { icon: '💳', label: 'Métodos de pago', action: () => {} },
      ],
    },
    {
      section: 'Soporte',
      items: [
        { icon: '❓', label: 'Centro de ayuda', action: () => {} },
        { icon: '💬', label: 'Chatea con soporte', action: () => {} },
        { icon: '⭐', label: 'Califica la app', action: () => {} },
        { icon: '📄', label: 'Términos y privacidad', action: () => {} },
      ],
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={{ fontSize: 44 }}>👤</Text>
          </View>
          <Text style={styles.name}>{user?.nombre ?? 'Usuario'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <Text style={styles.phone}>{user?.telefono ?? 'Sin teléfono'}</Text>

          {/* Stats rápidos */}
          <View style={styles.statsRow}>
            {[
              { val: '0', label: 'Chambas' },
              { val: '0', label: 'Reseñas' },
              { val: '—', label: 'Rating dado' },
            ].map((s, i) => (
              <View key={i} style={[styles.statItem, i === 1 && styles.statItemBorder]}>
                <Text style={styles.statVal}>{s.val}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* MENU */}
        <View style={{ padding: Spacing.lg, gap: Spacing.lg }}>
          {menuItems.map(section => (
            <View key={section.section} style={styles.menuSection}>
              <Text style={styles.menuSectionTitle}>{section.section}</Text>
              <View style={styles.menuCard}>
                {section.items.map((item, i) => (
                  <TouchableOpacity
                    key={item.label}
                    style={[styles.menuItem, i > 0 && styles.menuItemBorder]}
                    onPress={(item as any).action}
                    disabled={!!(item as any).toggle}
                    activeOpacity={(item as any).toggle ? 1 : 0.7}
                  >
                    <Text style={{ fontSize: 20, width: 28 }}>{item.icon}</Text>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    {(item as any).toggle ? (
                      <Switch
                        value={(item as any).value}
                        onValueChange={(item as any).setter}
                        trackColor={{ false: Colors.light, true: '#FFC5BC' }}
                        thumbColor={(item as any).value ? Colors.red : Colors.gray}
                      />
                    ) : (
                      <Text style={{ color: Colors.gray }}>›</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {/* LOGOUT */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut}>
            <Text style={{ fontSize: 20 }}>🚪</Text>
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </TouchableOpacity>

          <Text style={styles.version}>ChambaPe v1.0.0 · Hecho en Perú 🇵🇪</Text>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      <BottomNav active="profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: {
    backgroundColor: Colors.dark, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl,
    alignItems: 'center', gap: 6,
  },
  avatar: {
    width: 90, height: 90, backgroundColor: Colors.red, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)',
  },
  name: { fontFamily: Fonts.headingExtraBold, fontSize: 24, color: 'white' },
  email: { fontFamily: Fonts.body, fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  phone: { fontFamily: Fonts.body, fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  statsRow: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: Radius.md, marginTop: 16, overflow: 'hidden', width: '100%',
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 2 },
  statItemBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  statVal: { fontFamily: Fonts.headingExtraBold, fontSize: 20, color: 'white' },
  statLabel: { fontFamily: Fonts.body, fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  menuSection: { gap: 8 },
  menuSectionTitle: { fontFamily: Fonts.heading, fontSize: 13, color: Colors.gray, textTransform: 'uppercase', letterSpacing: 0.5 },
  menuCard: { backgroundColor: 'white', borderRadius: Radius.lg, overflow: 'hidden', ...Shadow.sm },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: Spacing.md, paddingVertical: 16,
  },
  menuItemBorder: { borderTopWidth: 1, borderTopColor: Colors.light },
  menuLabel: { flex: 1, fontFamily: Fonts.bodyMedium, fontSize: 15, color: Colors.dark },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FFF5F3', borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1.5, borderColor: '#FFD5CF',
  },
  logoutText: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.red },
  version: { fontFamily: Fonts.body, fontSize: 12, color: Colors.gray, textAlign: 'center' },
});
