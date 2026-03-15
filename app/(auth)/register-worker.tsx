import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Categoria } from '../../lib/types';
import { Colors, Spacing, Radius, Fonts, Shadow } from '../../constants/theme';

const ZONAS_LIMA = [
  'Miraflores', 'San Isidro', 'Surco', 'San Borja', 'La Molina',
  'Barranco', 'Jesús María', 'Lince', 'Pueblo Libre', 'Magdalena',
  'Ate', 'San Juan de Lurigancho', 'Los Olivos', 'Comas', 'Villa El Salvador',
];

export default function RegisterWorkerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  // Datos del form
  const [nombre, setNombre] = useState(user?.nombre ?? '');
  const [telefono, setTelefono] = useState(user?.telefono ?? '');
  const [categoriaId, setCategoriaId] = useState('');
  const [oficio, setOficio] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [anios, setAnios] = useState('1');
  const [tarifa, setTarifa] = useState('40');
  const [zonasSeleccionadas, setZonasSeleccionadas] = useState<string[]>([]);

  useEffect(() => {
    supabase.from('categorias').select('*').eq('activa', true).then(({ data }) => {
      if (data) setCategorias(data);
    });
  }, []);

  const toggleZona = (zona: string) => {
    setZonasSeleccionadas(z =>
      z.includes(zona) ? z.filter(x => x !== zona) : [...z, zona]
    );
  };

  const handleRegistrar = async () => {
    if (!user) return;
    if (!categoriaId || !oficio || !tarifa) {
      Alert.alert('Faltan datos', 'Por favor completa todos los campos obligatorios.');
      return;
    }
    if (zonasSeleccionadas.length === 0) {
      Alert.alert('Selecciona zonas', 'Elige al menos una zona donde ofrecer tus servicios.');
      return;
    }

    setSaving(true);
    try {
      // Si el usuario no existe en la tabla, crearlo
      await supabase.from('users').upsert({
        id: user.id,
        nombre,
        email: user.email,
        telefono,
        rol: 'worker',
      });

      // Crear perfil de worker
      const { error } = await supabase.from('workers').insert({
        user_id: user.id,
        categoria_id: categoriaId,
        oficio: oficio.trim(),
        descripcion: descripcion.trim(),
        anios_experiencia: parseInt(anios) || 1,
        tarifa_hora: parseFloat(tarifa) || 40,
        zonas_atencion: zonasSeleccionadas,
        distrito: zonasSeleccionadas[0] ?? 'Lima',
        disponible: false,
        nivel: 'nuevo',
      });
      if (error) throw error;

      Alert.alert(
        '¡Bienvenido a ChambaPe!',
        'Tu perfil fue creado. Ahora activa tu disponibilidad para empezar a recibir solicitudes.',
        [{ text: 'Empezar', onPress: () => router.replace('/(worker)/dashboard') }]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const stepLabels = ['Datos', 'Oficio', 'Zonas'];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* HEADER */}
      <View style={styles.header}>
        {step > 1 && (
          <TouchableOpacity onPress={() => setStep(s => s - 1)} style={styles.backBtn}>
            <Text style={{ color: 'white', fontSize: 20 }}>←</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Registro como Técnico</Text>
          <Text style={styles.headerSub}>Paso {step} de 3: {stepLabels[step - 1]}</Text>
        </View>
      </View>

      {/* PROGRESS BAR */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg }}>

        {/* STEP 1: Datos personales */}
        {step === 1 && (
          <>
            <Text style={styles.stepTitle}>👤 Tus datos personales</Text>
            {[
              { label: 'Nombre completo *', value: nombre, setter: setNombre, placeholder: 'Carlos Ríos García' },
              { label: 'Teléfono (WhatsApp) *', value: telefono, setter: setTelefono, placeholder: '+51 987 654 321', keyboard: 'phone-pad' },
            ].map((f, i) => (
              <View key={i} style={styles.formGroup}>
                <Text style={styles.label}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={f.placeholder}
                  placeholderTextColor="#bbb"
                  value={f.value}
                  onChangeText={f.setter}
                  keyboardType={(f as any).keyboard ?? 'default'}
                />
              </View>
            ))}

            <View style={styles.infoBox}>
              <Text style={{ fontSize: 18 }}>🔒</Text>
              <Text style={styles.infoText}>
                Tu número de teléfono solo se comparte con clientes que ya confirmaron una reserva contigo.
              </Text>
            </View>
          </>
        )}

        {/* STEP 2: Oficio */}
        {step === 2 && (
          <>
            <Text style={styles.stepTitle}>🔧 Tu especialidad</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Categoría principal *</Text>
              <View style={styles.catsGrid}>
                {categorias.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.catOpt, categoriaId === cat.id && styles.catOptSelected]}
                    onPress={() => { setCategoriaId(cat.id); setOficio(cat.nombre); }}
                  >
                    <Text style={{ fontSize: 26 }}>{cat.icono}</Text>
                    <Text style={[styles.catOptLabel, categoriaId === cat.id && { color: Colors.red }]}>
                      {cat.nombre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Título de tu oficio *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Gasfitero profesional, Electricista técnico"
                placeholderTextColor="#bbb"
                value={oficio}
                onChangeText={setOficio}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Descripción (opcional)</Text>
              <TextInput
                style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
                placeholder="Cuéntanos sobre tu experiencia y en qué eres especialista..."
                placeholderTextColor="#bbb"
                value={descripcion}
                onChangeText={setDescripcion}
                multiline
              />
            </View>

            <View style={styles.rowGroup}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Años de exp. *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="5"
                  placeholderTextColor="#bbb"
                  value={anios}
                  onChangeText={setAnios}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Tarifa (S//hora) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="45"
                  placeholderTextColor="#bbb"
                  value={tarifa}
                  onChangeText={setTarifa}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </>
        )}

        {/* STEP 3: Zonas */}
        {step === 3 && (
          <>
            <Text style={styles.stepTitle}>📍 Zonas donde atiendes</Text>
            <Text style={styles.stepSub}>Selecciona todos los distritos de Lima donde puedes ofrecer tus servicios.</Text>

            <View style={styles.zonasGrid}>
              {ZONAS_LIMA.map(zona => (
                <TouchableOpacity
                  key={zona}
                  style={[styles.zonaChip, zonasSeleccionadas.includes(zona) && styles.zonaChipSelected]}
                  onPress={() => toggleZona(zona)}
                >
                  <Text style={[styles.zonaText, zonasSeleccionadas.includes(zona) && { color: Colors.red }]}>
                    {zona}
                  </Text>
                  {zonasSeleccionadas.includes(zona) && <Text style={{ color: Colors.red, fontSize: 12 }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>

            {zonasSeleccionadas.length > 0 && (
              <View style={styles.selectedZonas}>
                <Text style={styles.selectedLabel}>{zonasSeleccionadas.length} zona(s) seleccionada(s)</Text>
                <Text style={styles.selectedList}>{zonasSeleccionadas.join(', ')}</Text>
              </View>
            )}
          </>
        )}

        {/* BOTONES */}
        {step < 3 ? (
          <TouchableOpacity
            style={styles.nextBtn}
            onPress={() => setStep(s => s + 1)}
          >
            <Text style={styles.nextBtnText}>Continuar →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextBtn, saving && { opacity: 0.7 }]}
            onPress={handleRegistrar}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="white" />
              : <Text style={styles.nextBtnText}>✅ Crear mi perfil</Text>
            }
          </TouchableOpacity>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: {
    backgroundColor: Colors.dark, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: {
    width: 38, height: 38, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: 'white', fontFamily: Fonts.headingExtraBold, fontSize: 20 },
  headerSub: { color: 'rgba(255,255,255,0.5)', fontFamily: Fonts.body, fontSize: 13 },
  progressBar: { height: 4, backgroundColor: Colors.light },
  progressFill: { height: 4, backgroundColor: Colors.red },
  stepTitle: { fontFamily: Fonts.headingExtraBold, fontSize: 22, color: Colors.dark },
  stepSub: { fontFamily: Fonts.body, fontSize: 15, color: Colors.gray, marginTop: -12 },
  formGroup: { gap: 6 },
  rowGroup: { flexDirection: 'row', gap: 12 },
  label: { fontFamily: Fonts.bodySemiBold, fontSize: 13, color: Colors.gray, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: 'white', borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    fontFamily: Fonts.body, fontSize: 15, color: Colors.dark,
    borderWidth: 2, borderColor: 'transparent', ...Shadow.sm,
  },
  infoBox: {
    flexDirection: 'row', gap: 10, backgroundColor: '#EFF6FF', borderRadius: Radius.md,
    padding: Spacing.md, borderLeftWidth: 4, borderLeftColor: '#3B82F6',
  },
  infoText: { flex: 1, fontFamily: Fonts.body, fontSize: 13, color: '#1E40AF', lineHeight: 20 },
  catsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catOpt: {
    width: '30%', backgroundColor: 'white', borderRadius: Radius.md, padding: 14,
    alignItems: 'center', gap: 6, borderWidth: 2, borderColor: 'transparent', ...Shadow.sm,
  },
  catOptSelected: { borderColor: Colors.red, backgroundColor: '#FFF5F3' },
  catOptLabel: { fontFamily: Fonts.bodyMedium, fontSize: 11, color: Colors.gray, textAlign: 'center' },
  zonasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  zonaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'white', borderRadius: Radius.full,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1.5, borderColor: Colors.light, ...Shadow.sm,
  },
  zonaChipSelected: { borderColor: Colors.red, backgroundColor: '#FFF5F3' },
  zonaText: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: Colors.gray },
  selectedZonas: { backgroundColor: '#D1FAE5', borderRadius: Radius.md, padding: Spacing.md },
  selectedLabel: { fontFamily: Fonts.heading, fontSize: 14, color: Colors.green, marginBottom: 4 },
  selectedList: { fontFamily: Fonts.body, fontSize: 13, color: Colors.dark },
  nextBtn: { backgroundColor: Colors.red, borderRadius: Radius.md, paddingVertical: 18, alignItems: 'center' },
  nextBtnText: { fontFamily: Fonts.heading, fontSize: 17, color: 'white' },
});
