import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Worker } from '../../lib/types';
import { Colors, Spacing, Radius, Fonts, Shadow, Config } from '../../constants/theme';
import { addDays, format, isToday, isTomorrow } from 'date-fns';
import { es } from 'date-fns/locale';

const HORAS = ['8:00', '9:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
const HORAS_OCUPADAS = ['8:00', '9:00']; // Simula horas no disponibles

type PagoMetodo = 'yape' | 'plin' | 'efectivo';

export default function BookingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { workerId } = useLocalSearchParams<{ workerId: string }>();
  const { user } = useAuth();

  const [worker, setWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Formulario
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date>(addDays(new Date(), 1));
  const [horaSeleccionada, setHoraSeleccionada] = useState<string | null>(null);
  const [direccion, setDireccion] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [pago, setPago] = useState<PagoMetodo>('yape');
  const [horas, setHoras] = useState(2);

  // Generar próximos 7 días
  const diasDisponibles = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i + 1));

  useEffect(() => {
    if (!workerId) return;
    supabase
      .from('workers')
      .select('*, user:users(nombre, avatar_url)')
      .eq('id', workerId)
      .single()
      .then(({ data }) => { if (data) setWorker(data as any); })
      .finally(() => setLoading(false));
  }, [workerId]);

  const precioBase = worker ? worker.tarifa_hora * horas : 0;
  const comision = precioBase * Config.comisionPorcentaje;
  const total = precioBase + comision;

  const handleConfirmar = async () => {
    if (!horaSeleccionada) { Alert.alert('Falta la hora', 'Por favor selecciona una hora.'); return; }
    if (!direccion.trim()) { Alert.alert('Falta la dirección', 'Ingresa la dirección del servicio.'); return; }
    if (!worker || !user) return;

    setSaving(true);
    try {
      const { data, error } = await supabase.from('bookings').insert({
        cliente_id: user.id,
        worker_id: worker.id,
        categoria_id: worker.categoria_id,
        fecha: format(fechaSeleccionada, 'yyyy-MM-dd'),
        hora: `${horaSeleccionada}:00`,
        direccion: direccion.trim(),
        descripcion: descripcion.trim(),
        precio_base: precioBase,
        comision,
        precio_total: total,
        pago_metodo: pago,
        estado: 'pendiente',
      }).select().single();

      if (error) throw error;
      router.replace(`/(client)/booking-success?bookingId=${data.id}`);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo crear la reserva.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={Colors.red} size="large" />
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ fontSize: 20, color: Colors.dark }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reservar Chamba</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg }}>

        {/* WORKER MINI CARD */}
        {worker && (
          <View style={styles.workerMini}>
            <View style={styles.workerMiniAvatar}><Text style={{ fontSize: 30 }}>👷</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.workerMiniName}>{worker.user?.nombre ?? 'Técnico'}</Text>
              <Text style={styles.workerMiniJob}>{worker.oficio} · ★ {worker.calificacion_promedio > 0 ? worker.calificacion_promedio.toFixed(1) : 'Nuevo'}</Text>
            </View>
            <Text style={styles.workerMiniRate}>S/{worker.tarifa_hora}/h</Text>
          </View>
        )}

        {/* FECHA */}
        <View style={styles.formSection}>
          <Text style={styles.formLabel}>📅 Selecciona la fecha</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {diasDisponibles.map((dia, i) => {
                const selected = format(dia, 'yyyy-MM-dd') === format(fechaSeleccionada, 'yyyy-MM-dd');
                const label = isToday(dia) ? 'Hoy' : isTomorrow(dia) ? 'Mañana' : format(dia, 'EEE', { locale: es });
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.diaChip, selected && styles.diaChipSelected]}
                    onPress={() => setFechaSeleccionada(dia)}
                  >
                    <Text style={[styles.diaDia, selected && styles.diaTextSelected]}>{label}</Text>
                    <Text style={[styles.diaNum, selected && styles.diaTextSelected]}>{format(dia, 'd')}</Text>
                    <Text style={[styles.diaMes, selected && { color: Colors.red }]}>{format(dia, 'MMM', { locale: es })}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* HORA */}
        <View style={styles.formSection}>
          <Text style={styles.formLabel}>⏰ Selecciona la hora</Text>
          <View style={styles.horasGrid}>
            {HORAS.map(hora => {
              const ocupada = HORAS_OCUPADAS.includes(hora);
              const selected = horaSeleccionada === hora;
              return (
                <TouchableOpacity
                  key={hora}
                  style={[styles.horaChip, selected && styles.horaChipSelected, ocupada && styles.horaChipOcupada]}
                  onPress={() => !ocupada && setHoraSeleccionada(hora)}
                  disabled={ocupada}
                >
                  <Text style={[styles.horaText, selected && { color: Colors.red }, ocupada && { color: '#ccc' }]}>
                    {hora} {parseInt(hora) < 12 ? 'am' : 'pm'}
                  </Text>
                  {ocupada && <Text style={{ fontSize: 9, color: '#ccc' }}>ocupado</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* DURACIÓN */}
        <View style={styles.formSection}>
          <Text style={styles.formLabel}>⌛ Duración estimada</Text>
          <View style={styles.durationRow}>
            <TouchableOpacity
              style={styles.durationBtn}
              onPress={() => setHoras(h => Math.max(2, h - 1))}
            >
              <Text style={{ fontSize: 20, color: Colors.dark }}>−</Text>
            </TouchableOpacity>
            <Text style={styles.durationVal}>{horas} horas</Text>
            <TouchableOpacity
              style={styles.durationBtn}
              onPress={() => setHoras(h => Math.min(8, h + 1))}
            >
              <Text style={{ fontSize: 20, color: Colors.dark }}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.durationNote}>Mínimo {Config.horasMinimas} horas · Puedes ajustar con el técnico al llegar</Text>
        </View>

        {/* DIRECCIÓN */}
        <View style={styles.formSection}>
          <Text style={styles.formLabel}>📍 Dirección del servicio</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Av. Larco 345, Miraflores"
            placeholderTextColor="#bbb"
            value={direccion}
            onChangeText={setDireccion}
          />
        </View>

        {/* DESCRIPCIÓN */}
        <View style={styles.formSection}>
          <Text style={styles.formLabel}>📝 Describe el problema</Text>
          <TextInput
            style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
            placeholder="Ej: Se rompió la tubería del baño y hay fuga de agua desde ayer..."
            placeholderTextColor="#bbb"
            value={descripcion}
            onChangeText={setDescripcion}
            multiline
          />
        </View>

        {/* MÉTODO DE PAGO */}
        <View style={styles.formSection}>
          <Text style={styles.formLabel}>💳 Método de pago</Text>
          <View style={{ gap: 10 }}>
            {([
              { key: 'yape', icon: '📱', name: 'Yape', desc: 'Pago seguro dentro de la app' },
              { key: 'plin', icon: '💜', name: 'Plin', desc: 'Sin comisión adicional' },
              { key: 'efectivo', icon: '💵', name: 'Efectivo', desc: 'Pagas al técnico al terminar' },
            ] as const).map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.pagoOpt, pago === opt.key && styles.pagoOptSelected]}
                onPress={() => setPago(opt.key)}
              >
                <Text style={{ fontSize: 26 }}>{opt.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pagoName}>{opt.name}</Text>
                  <Text style={styles.pagoDesc}>{opt.desc}</Text>
                </View>
                <View style={[styles.radioCircle, pago === opt.key && styles.radioSelected]}>
                  {pago === opt.key && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* RESUMEN */}
        <View style={styles.summary}>
          <Text style={[styles.formLabel, { color: 'rgba(255,255,255,0.6)', marginBottom: 14 }]}>Resumen del pedido</Text>
          {[
            { label: `Servicio (${horas}h × S/${worker?.tarifa_hora ?? 0})`, val: `S/${precioBase.toFixed(2)}` },
            { label: 'Comisión ChambaPe (10%)', val: `S/${comision.toFixed(2)}` },
            { label: 'Garantía de calidad', val: 'Gratis ✅' },
          ].map((row, i) => (
            <View key={i} style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{row.label}</Text>
              <Text style={styles.summaryVal}>{row.val}</Text>
            </View>
          ))}
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotal}>Total a pagar</Text>
            <Text style={styles.summaryTotalVal}>S/{total.toFixed(2)}</Text>
          </View>
        </View>

        {/* GARANTÍA */}
        <View style={styles.guarantee}>
          <Text style={{ fontSize: 20 }}>🛡️</Text>
          <Text style={styles.guaranteeText}>
            <Text style={{ fontFamily: Fonts.heading, color: Colors.dark }}>Garantía ChambaPe: </Text>
            Si el trabajo no es satisfactorio, te devolvemos el dinero en 24 horas.
          </Text>
        </View>

        {/* BOTÓN CONFIRMAR */}
        <TouchableOpacity
          style={[styles.confirmBtn, saving && { opacity: 0.7 }]}
          onPress={handleConfirmar}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="white" />
            : <Text style={styles.confirmBtnText}>✅ Confirmar y Reservar</Text>
          }
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: 12,
    backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: Colors.light,
  },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.dark },

  workerMini: {
    backgroundColor: 'white', borderRadius: Radius.lg, padding: Spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: 14, ...Shadow.sm,
  },
  workerMiniAvatar: {
    width: 52, height: 52, backgroundColor: '#FFE8E3',
    borderRadius: 16, alignItems: 'center', justifyContent: 'center',
  },
  workerMiniName: { fontFamily: Fonts.heading, fontSize: 16, color: Colors.dark },
  workerMiniJob: { fontFamily: Fonts.body, fontSize: 13, color: Colors.gray },
  workerMiniRate: { fontFamily: Fonts.headingExtraBold, fontSize: 16, color: Colors.red },

  formSection: { gap: 10 },
  formLabel: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.dark },

  diaChip: {
    width: 68, paddingVertical: 12, borderRadius: Radius.md,
    backgroundColor: 'white', alignItems: 'center', gap: 2,
    borderWidth: 2, borderColor: 'transparent', ...Shadow.sm,
  },
  diaChipSelected: { borderColor: Colors.red, backgroundColor: '#FFF5F3' },
  diaDia: { fontFamily: Fonts.body, fontSize: 11, color: Colors.gray, textTransform: 'capitalize' },
  diaNum: { fontFamily: Fonts.headingExtraBold, fontSize: 22, color: Colors.dark },
  diaMes: { fontFamily: Fonts.body, fontSize: 11, color: Colors.gray, textTransform: 'capitalize' },
  diaTextSelected: { color: Colors.red },

  horasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  horaChip: {
    width: '30%', paddingVertical: 14, borderRadius: Radius.md,
    backgroundColor: 'white', alignItems: 'center',
    borderWidth: 2, borderColor: 'transparent', ...Shadow.sm,
  },
  horaChipSelected: { borderColor: Colors.red, backgroundColor: '#FFF5F3' },
  horaChipOcupada: { backgroundColor: Colors.light },
  horaText: { fontFamily: Fonts.bodyMedium, fontSize: 14, color: Colors.dark },

  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  durationBtn: {
    width: 44, height: 44, backgroundColor: 'white', borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', ...Shadow.sm,
  },
  durationVal: { fontFamily: Fonts.headingExtraBold, fontSize: 22, color: Colors.dark, flex: 1, textAlign: 'center' },
  durationNote: { fontFamily: Fonts.body, fontSize: 12, color: Colors.gray },

  input: {
    backgroundColor: 'white', borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    fontFamily: Fonts.body, fontSize: 15, color: Colors.dark,
    borderWidth: 2, borderColor: 'transparent', ...Shadow.sm,
  },

  pagoOpt: {
    backgroundColor: 'white', borderRadius: Radius.md, padding: Spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 2, borderColor: 'transparent', ...Shadow.sm,
  },
  pagoOptSelected: { borderColor: Colors.red, backgroundColor: '#FFF5F3' },
  pagoName: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.dark },
  pagoDesc: { fontFamily: Fonts.body, fontSize: 12, color: Colors.gray },
  radioCircle: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: Colors.light,
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: Colors.red },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.red },

  summary: { backgroundColor: Colors.dark, borderRadius: Radius.lg, padding: Spacing.lg, gap: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontFamily: Fonts.body, fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  summaryVal: { fontFamily: Fonts.bodyMedium, fontSize: 14, color: 'white' },
  summaryDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 4 },
  summaryTotal: { fontFamily: Fonts.heading, fontSize: 16, color: 'white' },
  summaryTotalVal: { fontFamily: Fonts.headingExtraBold, fontSize: 20, color: Colors.yellow },

  guarantee: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: '#F0FFF4', borderRadius: Radius.md, padding: Spacing.md,
    borderLeftWidth: 4, borderLeftColor: Colors.green,
  },
  guaranteeText: { flex: 1, fontFamily: Fonts.body, fontSize: 13, color: Colors.gray, lineHeight: 20 },

  confirmBtn: {
    backgroundColor: Colors.red, borderRadius: Radius.md,
    paddingVertical: 18, alignItems: 'center',
  },
  confirmBtnText: { fontFamily: Fonts.heading, fontSize: 17, color: 'white' },
});
