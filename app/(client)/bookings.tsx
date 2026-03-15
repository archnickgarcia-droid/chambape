import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Booking, BookingEstado } from '../../lib/types';
import { Colors, Spacing, Radius, Fonts, Shadow } from '../../constants/theme';
import { BottomNav } from './home';

const ESTADO_CONFIG: Record<BookingEstado, { color: string; bg: string; label: string; icon: string }> = {
  pendiente:    { color: '#D97706', bg: '#FEF3C7', label: 'Pendiente',    icon: '⏳' },
  aceptado:     { color: '#2563EB', bg: '#DBEAFE', label: 'Aceptado',     icon: '✅' },
  en_camino:    { color: '#7C3AED', bg: '#EDE9FE', label: 'En camino',    icon: '🚗' },
  en_progreso:  { color: Colors.red, bg: '#FFF5F3', label: 'En progreso', icon: '🔧' },
  completado:   { color: Colors.green, bg: '#D1FAE5', label: 'Completado', icon: '🎉' },
  cancelado:    { color: Colors.gray, bg: Colors.light, label: 'Cancelado', icon: '❌' },
};

const TABS: { key: BookingEstado | 'todos'; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'pendiente', label: 'Pendiente' },
  { key: 'en_progreso', label: 'Activos' },
  { key: 'completado', label: 'Completados' },
];

function BookingCard({ booking, onPress, onReview }: {
  booking: Booking;
  onPress: () => void;
  onReview?: () => void;
}) {
  const cfg = ESTADO_CONFIG[booking.estado];
  const worker = (booking as any).worker;
  const cat = (booking as any).categoria;

  return (
    <TouchableOpacity onPress={onPress} style={styles.card} activeOpacity={0.88}>
      <View style={styles.cardTop}>
        <View style={styles.cardAvatar}>
          <Text style={{ fontSize: 28 }}>{cat?.icono ?? '🔧'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardWorker}>{worker?.user?.nombre ?? 'Técnico'}</Text>
          <Text style={styles.cardJob}>{worker?.oficio ?? 'Servicio'}</Text>
          <Text style={styles.cardDate}>📅 {booking.fecha} · {booking.hora?.slice(0, 5)}</Text>
        </View>
        <View style={[styles.estadoBadge, { backgroundColor: cfg.bg }]}>
          <Text style={{ fontSize: 12 }}>{cfg.icon}</Text>
          <Text style={[styles.estadoText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardBottom}>
        <Text style={styles.cardAddr} numberOfLines={1}>📍 {booking.direccion}</Text>
        <Text style={styles.cardTotal}>S/{booking.precio_total.toFixed(2)}</Text>
      </View>

      {booking.estado === 'completado' && onReview && (
        <TouchableOpacity style={styles.reviewBtn} onPress={onReview}>
          <Text style={styles.reviewBtnText}>⭐ Dejar reseña</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

export default function BookingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tabActivo, setTabActivo] = useState<BookingEstado | 'todos'>('todos');

  const cargar = useCallback(async () => {
    if (!user) return;
    const query = supabase
      .from('bookings')
      .select('*, worker:workers(oficio, user:users(nombre)), categoria:categorias(nombre, icono)')
      .eq('cliente_id', user.id)
      .order('created_at', { ascending: false });

    const { data } = await query;
    if (data) setBookings(data as any);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => { cargar(); }, [cargar]);

  const bookingsFiltrados = tabActivo === 'todos'
    ? bookings
    : bookings.filter(b => b.estado === tabActivo);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Chambas</Text>
        <Text style={styles.headerSub}>{bookings.length} servicios en total</Text>
      </View>

      {/* TABS */}
      <View style={styles.tabs}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, tabActivo === tab.key && styles.tabActive]}
            onPress={() => setTabActivo(tab.key)}
          >
            <Text style={[styles.tabText, tabActivo === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.red} style={{ marginTop: 60 }} size="large" />
      ) : bookingsFiltrados.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 56 }}>📋</Text>
          <Text style={styles.emptyTitle}>Sin reservas</Text>
          <Text style={styles.emptySub}>Aún no tienes chambas {tabActivo !== 'todos' ? `en estado "${ESTADO_CONFIG[tabActivo as BookingEstado]?.label}"` : ''}.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(client)/search')}>
            <Text style={styles.emptyBtnText}>Buscar técnico →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={bookingsFiltrados}
          keyExtractor={b => b.id}
          contentContainerStyle={{ padding: Spacing.lg, gap: 14 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(); }} tintColor={Colors.red} />}
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onPress={() => router.push(`/(client)/booking-detail?bookingId=${item.id}`)}
              onReview={() => router.push(`/(client)/review?bookingId=${item.id}`)}
            />
          )}
        />
      )}

      <BottomNav active="bookings" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: { backgroundColor: 'white', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.light },
  headerTitle: { fontFamily: Fonts.headingExtraBold, fontSize: 26, color: Colors.dark },
  headerSub: { fontFamily: Fonts.body, fontSize: 14, color: Colors.gray, marginTop: 2 },
  tabs: { flexDirection: 'row', backgroundColor: 'white', paddingHorizontal: Spacing.lg, paddingBottom: 12, gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.light },
  tabActive: { backgroundColor: Colors.red },
  tabText: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: Colors.gray },
  tabTextActive: { color: 'white' },
  card: { backgroundColor: 'white', borderRadius: Radius.lg, padding: Spacing.md, ...Shadow.sm },
  cardTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  cardAvatar: {
    width: 52, height: 52, backgroundColor: Colors.cream, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cardWorker: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.dark },
  cardJob: { fontFamily: Fonts.body, fontSize: 13, color: Colors.gray, marginBottom: 4 },
  cardDate: { fontFamily: Fonts.body, fontSize: 12, color: Colors.gray },
  estadoBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  estadoText: { fontFamily: Fonts.heading, fontSize: 11 },
  cardDivider: { height: 1, backgroundColor: Colors.light, marginVertical: 12 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardAddr: { fontFamily: Fonts.body, fontSize: 13, color: Colors.gray, flex: 1 },
  cardTotal: { fontFamily: Fonts.headingExtraBold, fontSize: 16, color: Colors.dark },
  reviewBtn: { marginTop: 12, backgroundColor: Colors.yellow, borderRadius: Radius.md, paddingVertical: 10, alignItems: 'center' },
  reviewBtnText: { fontFamily: Fonts.heading, fontSize: 14, color: Colors.dark },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: Spacing.lg },
  emptyTitle: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.dark },
  emptySub: { fontFamily: Fonts.body, fontSize: 15, color: Colors.gray, textAlign: 'center' },
  emptyBtn: { backgroundColor: Colors.red, borderRadius: Radius.full, paddingHorizontal: 28, paddingVertical: 14 },
  emptyBtnText: { color: 'white', fontFamily: Fonts.heading, fontSize: 15 },
});
