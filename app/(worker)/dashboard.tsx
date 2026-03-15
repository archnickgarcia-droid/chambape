import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Booking, Worker } from '../../lib/types';
import { Colors, Spacing, Radius, Fonts, Shadow } from '../../constants/theme';

function StatBox({ icon, value, label, color = Colors.dark }: {
  icon: string; value: string | number; label: string; color?: string;
}) {
  return (
    <View style={styles.statBox}>
      <Text style={{ fontSize: 22 }}>{icon}</Text>
      <Text style={[styles.statVal, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function RequestCard({ booking, onAceptar, onRechazar }: {
  booking: Booking;
  onAceptar: () => void;
  onRechazar: () => void;
}) {
  return (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.requestAvatar}>
          <Text style={{ fontSize: 24 }}>👤</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.requestName}>{(booking as any).cliente?.nombre ?? 'Cliente'}</Text>
          <Text style={styles.requestDate}>📅 {booking.fecha} · {booking.hora?.slice(0, 5)}</Text>
        </View>
        <View style={styles.requestPriceBadge}>
          <Text style={styles.requestPrice}>S/{booking.precio_total.toFixed(0)}</Text>
        </View>
      </View>

      <View style={styles.requestDivider} />

      <Text style={styles.requestAddr}>📍 {booking.direccion}</Text>
      {booking.descripcion ? (
        <Text style={styles.requestDesc} numberOfLines={2}>{booking.descripcion}</Text>
      ) : null}

      <View style={styles.requestActions}>
        <TouchableOpacity style={styles.rechazarBtn} onPress={onRechazar}>
          <Text style={styles.rechazarText}>✕ Rechazar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.aceptarBtn} onPress={onAceptar}>
          <Text style={styles.aceptarText}>✓ Aceptar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function WorkerDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();

  const [worker, setWorker] = useState<Worker | null>(null);
  const [pendientes, setPendientes] = useState<Booking[]>([]);
  const [recientes, setRecientes] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState(false);

  const cargar = useCallback(async () => {
    if (!user) return;
    try {
      // Buscar worker profile
      const { data: w } = await supabase
        .from('workers')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (w) setWorker(w as any);
      else { router.replace('/(auth)/register-worker'); return; }

      // Solicitudes pendientes
      const { data: pend } = await supabase
        .from('bookings')
        .select('*, cliente:users(nombre), categoria:categorias(nombre, icono)')
        .eq('worker_id', w!.id)
        .eq('estado', 'pendiente')
        .order('created_at', { ascending: false });
      if (pend) setPendientes(pend as any);

      // Trabajos recientes
      const { data: rec } = await supabase
        .from('bookings')
        .select('*, cliente:users(nombre)')
        .eq('worker_id', w!.id)
        .neq('estado', 'pendiente')
        .order('created_at', { ascending: false })
        .limit(5);
      if (rec) setRecientes(rec as any);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { cargar(); }, [cargar]);

  const toggleDisponible = async () => {
    if (!worker) return;
    setToggling(true);
    const { error } = await supabase
      .from('workers')
      .update({ disponible: !worker.disponible })
      .eq('id', worker.id);
    if (!error) setWorker(w => w ? { ...w, disponible: !w.disponible } : w);
    setToggling(false);
  };

  const handleAceptar = async (booking: Booking) => {
    const { error } = await supabase
      .from('bookings')
      .update({ estado: 'aceptado' })
      .eq('id', booking.id);
    if (!error) {
      setPendientes(p => p.filter(b => b.id !== booking.id));
      Alert.alert('✅ Aceptado', `Has aceptado el servicio del ${booking.fecha}.`);
    }
  };

  const handleRechazar = (booking: Booking) => {
    Alert.alert('Rechazar solicitud', '¿Estás seguro de rechazar esta solicitud?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Rechazar', style: 'destructive', onPress: async () => {
          await supabase.from('bookings').update({ estado: 'cancelado' }).eq('id', booking.id);
          setPendientes(p => p.filter(b => b.id !== booking.id));
        },
      },
    ]);
  };

  const ingresos = recientes
    .filter(b => b.estado === 'completado')
    .reduce((sum, b) => sum + (b.precio_base ?? 0), 0);

  if (loading) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={Colors.red} size="large" />
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(); }} tintColor={Colors.red} />}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Panel del técnico</Text>
            <Text style={styles.name}>{user?.nombre?.split(' ')[0]} 👋</Text>
          </View>
          <TouchableOpacity onPress={signOut} style={styles.logoutBtn}>
            <Text style={{ fontSize: 18 }}>🚪</Text>
          </TouchableOpacity>
        </View>

        {/* DISPONIBILIDAD */}
        <View style={styles.availCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.availTitle}>
              {worker?.disponible ? '🟢 Estás disponible' : '🔴 No disponible'}
            </Text>
            <Text style={styles.availSub}>
              {worker?.disponible
                ? 'Los clientes pueden encontrarte y reservarte.'
                : 'Activa para recibir solicitudes de servicio.'}
            </Text>
          </View>
          {toggling
            ? <ActivityIndicator color={Colors.red} />
            : <Switch
                value={worker?.disponible ?? false}
                onValueChange={toggleDisponible}
                trackColor={{ false: Colors.light, true: '#FFC5BC' }}
                thumbColor={worker?.disponible ? Colors.red : Colors.gray}
              />
          }
        </View>

        {/* STATS */}
        <View style={styles.statsRow}>
          <StatBox icon="⭐" value={worker?.calificacion_promedio?.toFixed(1) ?? '—'} label="Rating" color={Colors.red} />
          <StatBox icon="🔨" value={worker?.total_trabajos ?? 0} label="Trabajos" />
          <StatBox icon="💰" value={`S/${ingresos.toFixed(0)}`} label="Este mes" color={Colors.green} />
          <StatBox icon="📩" value={pendientes.length} label="Pendientes" color={pendientes.length > 0 ? '#D97706' : Colors.gray} />
        </View>

        {/* SOLICITUDES PENDIENTES */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              📩 Solicitudes pendientes
              {pendientes.length > 0 && (
                <Text style={{ color: Colors.red }}> ({pendientes.length})</Text>
              )}
            </Text>
          </View>

          {pendientes.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 40 }}>📭</Text>
              <Text style={styles.emptyText}>Sin solicitudes nuevas.</Text>
              <Text style={styles.emptySubText}>Activa tu disponibilidad para recibir más chamadas.</Text>
            </View>
          ) : (
            pendientes.map(b => (
              <RequestCard
                key={b.id}
                booking={b}
                onAceptar={() => handleAceptar(b)}
                onRechazar={() => handleRechazar(b)}
              />
            ))
          )}
        </View>

        {/* RECIENTES */}
        {recientes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🕐 Trabajos recientes</Text>
            {recientes.map(b => (
              <View key={b.id} style={styles.recentRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recentName}>{(b as any).cliente?.nombre ?? 'Cliente'}</Text>
                  <Text style={styles.recentDate}>{b.fecha} · {b.hora?.slice(0, 5)}</Text>
                </View>
                <View style={[styles.recentBadge, b.estado === 'completado' && { backgroundColor: '#D1FAE5' }]}>
                  <Text style={[styles.recentBadgeText, b.estado === 'completado' && { color: Colors.green }]}>
                    {b.estado === 'completado' ? '✅ Completado' : b.estado}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ACCIONES RÁPIDAS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acciones rápidas</Text>
          <View style={{ gap: 10 }}>
            {[
              { icon: '✏️', label: 'Editar mi perfil y tarifas', route: '/(worker)/profile-edit' },
              { icon: '📸', label: 'Subir fotos de trabajos', route: '/(worker)/portfolio' },
              { icon: '📊', label: 'Ver mis estadísticas', route: '/(worker)/stats' },
              { icon: '💬', label: 'Mensajes pendientes', route: '/(worker)/chats' },
            ].map(item => (
              <TouchableOpacity
                key={item.label}
                style={styles.quickAction}
                onPress={() => router.push(item.route as any)}
              >
                <Text style={{ fontSize: 22 }}>{item.icon}</Text>
                <Text style={styles.quickActionText}>{item.label}</Text>
                <Text style={{ color: Colors.gray }}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: {
    backgroundColor: Colors.dark, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  greeting: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontFamily: Fonts.body },
  name: { color: 'white', fontFamily: Fonts.headingExtraBold, fontSize: 24 },
  logoutBtn: {
    width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 13, alignItems: 'center', justifyContent: 'center',
  },
  availCard: {
    margin: Spacing.lg, backgroundColor: 'white', borderRadius: Radius.lg,
    padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: 14, ...Shadow.md,
  },
  availTitle: { fontFamily: Fonts.heading, fontSize: 16, color: Colors.dark, marginBottom: 4 },
  availSub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.gray },
  statsRow: {
    flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: Spacing.lg,
    backgroundColor: 'white', borderRadius: Radius.lg, ...Shadow.sm, overflow: 'hidden',
  },
  statBox: {
    flex: 1, alignItems: 'center', paddingVertical: 16, gap: 4,
    borderRightWidth: 1, borderRightColor: Colors.light,
  },
  statVal: { fontFamily: Fonts.headingExtraBold, fontSize: 20, color: Colors.dark },
  statLabel: { fontFamily: Fonts.body, fontSize: 11, color: Colors.gray },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg, gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontFamily: Fonts.heading, fontSize: 17, color: Colors.dark },
  requestCard: { backgroundColor: 'white', borderRadius: Radius.lg, padding: Spacing.md, ...Shadow.sm },
  requestHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  requestAvatar: {
    width: 46, height: 46, backgroundColor: Colors.cream, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  requestName: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.dark },
  requestDate: { fontFamily: Fonts.body, fontSize: 13, color: Colors.gray },
  requestPriceBadge: { backgroundColor: '#D1FAE5', borderRadius: Radius.md, paddingHorizontal: 10, paddingVertical: 6 },
  requestPrice: { fontFamily: Fonts.headingExtraBold, fontSize: 16, color: Colors.green },
  requestDivider: { height: 1, backgroundColor: Colors.light, marginBottom: 10 },
  requestAddr: { fontFamily: Fonts.body, fontSize: 13, color: Colors.gray, marginBottom: 4 },
  requestDesc: { fontFamily: Fonts.body, fontSize: 14, color: Colors.dark, marginBottom: 14 },
  requestActions: { flexDirection: 'row', gap: 10 },
  rechazarBtn: { flex: 1, borderRadius: Radius.md, padding: 12, alignItems: 'center', backgroundColor: Colors.light },
  rechazarText: { fontFamily: Fonts.heading, fontSize: 14, color: Colors.gray },
  aceptarBtn: { flex: 2, borderRadius: Radius.md, padding: 12, alignItems: 'center', backgroundColor: Colors.red },
  aceptarText: { fontFamily: Fonts.heading, fontSize: 14, color: 'white' },
  emptyState: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  emptyText: { fontFamily: Fonts.heading, fontSize: 16, color: Colors.dark },
  emptySubText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.gray, textAlign: 'center' },
  recentRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
    borderRadius: Radius.md, padding: Spacing.md, gap: 12, ...Shadow.sm,
  },
  recentName: { fontFamily: Fonts.bodyMedium, fontSize: 14, color: Colors.dark },
  recentDate: { fontFamily: Fonts.body, fontSize: 12, color: Colors.gray },
  recentBadge: { backgroundColor: Colors.light, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 5 },
  recentBadgeText: { fontFamily: Fonts.heading, fontSize: 11, color: Colors.gray },
  quickAction: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'white', borderRadius: Radius.md, padding: Spacing.md, ...Shadow.sm,
  },
  quickActionText: { flex: 1, fontFamily: Fonts.bodyMedium, fontSize: 15, color: Colors.dark },
});
