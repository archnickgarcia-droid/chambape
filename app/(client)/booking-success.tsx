import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { Booking } from '../../lib/types';
import { Colors, Spacing, Radius, Fonts } from '../../constants/theme';

export default function BookingSuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const scaleAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }).start();
    if (!bookingId) return;
    supabase
      .from('bookings')
      .select('*, worker:workers(*, user:users(nombre)), categoria:categorias(nombre, icono)')
      .eq('id', bookingId)
      .single()
      .then(({ data }) => { if (data) setBooking(data as any); });
  }, [bookingId]);

  const steps = [
    { label: 'Pago confirmado', done: true, time: 'Ahora' },
    { label: 'Técnico notificado', done: true, time: 'Ahora' },
    { label: 'Esperando confirmación', active: true, time: '~5 min' },
    { label: 'Servicio en camino', pending: true, time: booking?.fecha ?? '—' },
    { label: 'Trabajo completado', pending: true, time: '—' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>

      {/* CÍRCULO ANIMADO */}
      <Animated.View style={[styles.successCircle, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={{ fontSize: 56 }}>✅</Text>
      </Animated.View>

      <Text style={styles.title}>¡Chamba confirmada!</Text>
      <Text style={styles.subtitle}>
        {booking
          ? `${(booking as any).worker?.user?.nombre?.split(' ')[0]} estará listo el ${booking.fecha} a las ${booking.hora.slice(0, 5)}`
          : 'Tu reserva fue registrada exitosamente.'}
      </Text>

      {/* TRACKING */}
      <View style={styles.trackingCard}>
        <Text style={styles.trackingTitle}>Estado del servicio</Text>
        {steps.map((step, i) => (
          <View key={i} style={styles.trackStep}>
            <View style={[
              styles.trackDot,
              step.done && styles.trackDotDone,
              step.active && styles.trackDotActive,
              step.pending && styles.trackDotPending,
            ]} />
            {i < steps.length - 1 && (
              <View style={[styles.trackLine, step.done && styles.trackLineDone]} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.trackLabel, (step.pending) && styles.trackLabelPending]}>
                {step.label}
              </Text>
            </View>
            <Text style={styles.trackTime}>{step.time}</Text>
          </View>
        ))}
      </View>

      {/* TOTAL */}
      {booking && (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total pagado</Text>
          <Text style={styles.totalVal}>S/{booking.precio_total.toFixed(2)}</Text>
        </View>
      )}

      {/* ACCIONES */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.chatBtn}
          onPress={() => router.push(`/(client)/chat?bookingId=${bookingId}`)}
        >
          <Text style={{ fontSize: 20 }}>💬</Text>
          <Text style={styles.chatBtnText}>Chat con técnico</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/(client)/home')}>
          <Text style={styles.homeBtnText}>← Volver al inicio</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: Colors.dark,
    alignItems: 'center', justifyContent: 'center', padding: Spacing.lg, gap: Spacing.md,
  },
  successCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: Colors.red,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
    shadowColor: Colors.red, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 40, elevation: 20,
  },
  title: { fontFamily: Fonts.headingExtraBold, fontSize: 30, color: 'white', textAlign: 'center' },
  subtitle: { fontFamily: Fonts.body, fontSize: 15, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 22 },

  trackingCard: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: Radius.lg,
    padding: Spacing.lg, width: '100%',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  trackingTitle: {
    fontFamily: Fonts.body, fontSize: 11, color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16,
  },
  trackStep: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18, position: 'relative' },
  trackDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.2)', flexShrink: 0 },
  trackDotDone: { backgroundColor: Colors.green },
  trackDotActive: { backgroundColor: Colors.yellow },
  trackDotPending: { backgroundColor: 'rgba(255,255,255,0.15)' },
  trackLine: {
    position: 'absolute', left: 6, top: 14, width: 2, height: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  trackLineDone: { backgroundColor: Colors.green },
  trackLabel: { fontFamily: Fonts.bodyMedium, fontSize: 14, color: 'white' },
  trackLabelPending: { color: 'rgba(255,255,255,0.35)' },
  trackTime: { fontFamily: Fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.35)' },

  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    width: '100%', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: Radius.md, padding: Spacing.md,
  },
  totalLabel: { fontFamily: Fonts.body, fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  totalVal: { fontFamily: Fonts.headingExtraBold, fontSize: 22, color: Colors.yellow },

  actions: { width: '100%', gap: 10, marginTop: 8 },
  chatBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: Radius.md,
    padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  chatBtnText: { fontFamily: Fonts.heading, fontSize: 15, color: 'white' },
  homeBtn: { backgroundColor: Colors.red, borderRadius: Radius.md, padding: 16, alignItems: 'center' },
  homeBtnText: { fontFamily: Fonts.heading, fontSize: 16, color: 'white' },
});
