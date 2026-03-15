import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Colors, Spacing, Radius, Fonts, Shadow } from '../../constants/theme';

const ASPECTOS = [
  { key: 'puntual', icon: '⏱️', label: '¿Llegó puntual?' },
  { key: 'dejo_limpio', icon: '✨', label: '¿Dejó todo limpio?' },
  { key: 'cobro_acordado', icon: '💰', label: '¿Cobró lo acordado?' },
] as const;

export default function ReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { user } = useAuth();

  const [calificacion, setCalificacion] = useState(5);
  const [comentario, setComentario] = useState('');
  const [aspectos, setAspectos] = useState({ puntual: true, dejo_limpio: true, cobro_acordado: true });
  const [saving, setSaving] = useState(false);
  const [hovered, setHovered] = useState(0);

  const handleEnviar = async () => {
    if (!bookingId || !user) return;
    setSaving(true);
    try {
      // Obtener info del booking primero
      const { data: booking } = await supabase
        .from('bookings').select('worker_id').eq('id', bookingId).single();
      if (!booking) throw new Error('Reserva no encontrada');

      const { error } = await supabase.from('reviews').insert({
        booking_id: bookingId,
        cliente_id: user.id,
        worker_id: booking.worker_id,
        calificacion,
        comentario: comentario.trim(),
        ...aspectos,
      });
      if (error) throw error;

      Alert.alert('¡Gracias!', 'Tu reseña ayuda a otros usuarios a elegir mejor.', [
        { text: 'OK', onPress: () => router.replace('/(client)/bookings') },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const calLabels = ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', '¡Excelente!'];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dejar Reseña</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg }}>
        {/* ESTRELLAS */}
        <View style={styles.starsSection}>
          <Text style={styles.starsTitle}>¿Cómo calificarías el servicio?</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(n => (
              <TouchableOpacity
                key={n}
                onPress={() => setCalificacion(n)}
                activeOpacity={0.7}
              >
                <Text style={[styles.star, n <= calificacion && styles.starActive]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.calLabel}>{calLabels[calificacion]}</Text>
        </View>

        {/* ASPECTOS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aspectos del servicio</Text>
          {ASPECTOS.map(asp => (
            <TouchableOpacity
              key={asp.key}
              style={[styles.aspectoRow, aspectos[asp.key] && styles.aspectoRowActive]}
              onPress={() => setAspectos(a => ({ ...a, [asp.key]: !a[asp.key] }))}
            >
              <Text style={{ fontSize: 22 }}>{asp.icon}</Text>
              <Text style={styles.aspectoLabel}>{asp.label}</Text>
              <View style={[styles.check, aspectos[asp.key] && styles.checkActive]}>
                {aspectos[asp.key] && <Text style={{ color: 'white', fontSize: 12 }}>✓</Text>}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* COMENTARIO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Comentario (opcional)</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Cuéntanos cómo fue tu experiencia..."
            placeholderTextColor="#bbb"
            value={comentario}
            onChangeText={setComentario}
            multiline
            maxLength={400}
          />
          <Text style={styles.charCount}>{comentario.length}/400</Text>
        </View>

        {/* TIP */}
        <View style={styles.tip}>
          <Text style={{ fontSize: 18 }}>💡</Text>
          <Text style={styles.tipText}>
            Tu reseña es <Text style={{ fontFamily: Fonts.heading, color: Colors.dark }}>pública</Text> y ayuda a otros usuarios a elegir técnicos confiables.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.enviarBtn, saving && { opacity: 0.7 }]}
          onPress={handleEnviar}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="white" />
            : <Text style={styles.enviarBtnText}>Enviar reseña →</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={() => router.back()}>
          <Text style={styles.skipText}>Omitir por ahora</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.lg, backgroundColor: 'white',
    borderBottomWidth: 1, borderBottomColor: Colors.light,
  },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.dark },
  starsSection: { alignItems: 'center', gap: 12, backgroundColor: 'white', borderRadius: Radius.lg, padding: Spacing.lg, ...Shadow.sm },
  starsTitle: { fontFamily: Fonts.heading, fontSize: 16, color: Colors.dark },
  starsRow: { flexDirection: 'row', gap: 8 },
  star: { fontSize: 46, color: Colors.light },
  starActive: { color: Colors.yellow },
  calLabel: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.dark, height: 28 },
  section: { gap: 12 },
  sectionTitle: { fontFamily: Fonts.heading, fontSize: 16, color: Colors.dark },
  aspectoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'white', borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 2, borderColor: 'transparent', ...Shadow.sm,
  },
  aspectoRowActive: { borderColor: Colors.green, backgroundColor: '#F0FFF4' },
  aspectoLabel: { flex: 1, fontFamily: Fonts.bodyMedium, fontSize: 15, color: Colors.dark },
  check: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: Colors.light,
    alignItems: 'center', justifyContent: 'center',
  },
  checkActive: { backgroundColor: Colors.green, borderColor: Colors.green },
  textArea: {
    backgroundColor: 'white', borderRadius: Radius.md, padding: Spacing.md,
    fontFamily: Fonts.body, fontSize: 15, color: Colors.dark,
    height: 120, textAlignVertical: 'top', ...Shadow.sm,
  },
  charCount: { fontFamily: Fonts.body, fontSize: 12, color: Colors.gray, textAlign: 'right' },
  tip: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#FFFBEB', borderRadius: Radius.md, padding: Spacing.md,
    borderLeftWidth: 4, borderLeftColor: Colors.yellow,
  },
  tipText: { flex: 1, fontFamily: Fonts.body, fontSize: 13, color: Colors.gray, lineHeight: 20 },
  enviarBtn: { backgroundColor: Colors.red, borderRadius: Radius.md, paddingVertical: 18, alignItems: 'center' },
  enviarBtnText: { fontFamily: Fonts.heading, fontSize: 17, color: 'white' },
  skipBtn: { alignItems: 'center', paddingVertical: 8 },
  skipText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.gray },
});
