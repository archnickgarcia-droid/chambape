import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, FlatList, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Worker, Categoria } from '../../lib/types';
import { Colors, Spacing, Radius, Fonts, Shadow } from '../../constants/theme';

// ─── COMPONENTE: Chip de categoría ──────────────────────────
function CategoriaChip({
  cat, selected, onPress,
}: { cat: Categoria; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.catChip, selected && styles.catChipSelected]}
      activeOpacity={0.75}
    >
      <Text style={styles.catIcon}>{cat.icono}</Text>
      <Text style={[styles.catLabel, selected && styles.catLabelSelected]}>
        {cat.nombre}
      </Text>
    </TouchableOpacity>
  );
}

// ─── COMPONENTE: Tarjeta de worker ──────────────────────────
function WorkerCard({ worker, onPress }: { worker: Worker; onPress: () => void }) {
  const levelColor = {
    nuevo: Colors.gray,
    activo: Colors.green,
    pro: '#3B82F6',
    top: Colors.yellow,
  }[worker.nivel];

  const levelLabel = {
    nuevo: 'NUEVO',
    activo: 'ACTIVO',
    pro: 'PRO',
    top: '🏅 TOP',
  }[worker.nivel];

  return (
    <TouchableOpacity onPress={onPress} style={styles.workerCard} activeOpacity={0.85}>
      {/* Avatar */}
      <View style={styles.workerAvatarBox}>
        <Text style={styles.workerAvatarEmoji}>👷</Text>
        <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
          <Text style={styles.levelText}>{levelLabel}</Text>
        </View>
        {worker.disponible && (
          <View style={styles.onlineDot} />
        )}
      </View>

      {/* Info */}
      <View style={styles.workerInfo}>
        <Text style={styles.workerName} numberOfLines={1}>
          {worker.user?.nombre ?? 'Técnico'}
        </Text>
        <Text style={styles.workerJob} numberOfLines={1}>
          {worker.oficio} · {worker.anios_experiencia} años
        </Text>

        {/* Rating y precio */}
        <View style={styles.workerBottom}>
          <View style={styles.ratingRow}>
            <Text style={styles.star}>★</Text>
            <Text style={styles.ratingVal}>
              {worker.calificacion_promedio > 0
                ? worker.calificacion_promedio.toFixed(1)
                : 'Nuevo'}
            </Text>
            <Text style={styles.ratingCount}>({worker.total_trabajos})</Text>
          </View>
          <Text style={styles.workerRate}>S/{worker.tarifa_hora}/h</Text>
        </View>

        {/* Distancia */}
        <Text style={styles.workerZone} numberOfLines={1}>
          📍 {worker.distrito}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── PANTALLA PRINCIPAL ─────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [catSeleccionada, setCatSeleccionada] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cargarDatos = useCallback(async () => {
    try {
      // Cargar categorías
      const { data: cats } = await supabase
        .from('categorias')
        .select('*')
        .eq('activa', true)
        .order('nombre');
      if (cats) setCategorias(cats);

      // Cargar workers con su usuario
      let query = supabase
        .from('workers')
        .select(`
          *,
          user:users(id, nombre, avatar_url),
          categoria:categorias(nombre, icono)
        `)
        .eq('disponible', true)
        .order('calificacion_promedio', { ascending: false })
        .limit(20);

      if (catSeleccionada) {
        query = query.eq('categoria_id', catSeleccionada);
      }

      const { data: ws } = await query;
      if (ws) setWorkers(ws as any);
    } catch (e) {
      console.error('Error cargando datos:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [catSeleccionada]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const onRefresh = () => { setRefreshing(true); cargarDatos(); };

  const workersFiltrados = workers.filter(w =>
    busqueda === '' ||
    w.oficio.toLowerCase().includes(busqueda.toLowerCase()) ||
    w.user?.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── HEADER ROJO ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{saludo},</Text>
            <Text style={styles.greetingName}>
              {user?.nombre?.split(' ')[0] ?? 'bienvenido'} 👋
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push('/(client)/notifications')}
            >
              <Text style={{ fontSize: 20 }}>🔔</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={signOut}
            >
              <Text style={{ fontSize: 18 }}>👤</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.locationRow}>📍 {user ? 'Miraflores, Lima' : 'Lima'}</Text>

        {/* Barra de búsqueda */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="¿Qué necesitas arreglar hoy?"
            placeholderTextColor="#999"
            value={busqueda}
            onChangeText={setBusqueda}
            returnKeyType="search"
          />
          {busqueda.length > 0 && (
            <TouchableOpacity onPress={() => setBusqueda('')}>
              <Text style={{ color: '#999', fontSize: 16, paddingHorizontal: 8 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.red} />}
      >
        {/* ── BANNER EMERGENCIA ── */}
        <TouchableOpacity
          style={styles.urgentBanner}
          onPress={() => router.push('/(client)/search?urgente=true')}
          activeOpacity={0.9}
        >
          <Text style={{ fontSize: 36 }}>⚡</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.urgentTitle}>¿Emergencia ahora?</Text>
            <Text style={styles.urgentSub}>Técnicos disponibles en tu zona</Text>
          </View>
          <Text style={{ color: Colors.red, fontSize: 20 }}>→</Text>
        </TouchableOpacity>

        {/* ── CATEGORÍAS ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categorías</Text>
            <TouchableOpacity onPress={() => setCatSeleccionada(null)}>
              <Text style={styles.verTodo}>
                {catSeleccionada ? 'Ver todas' : ''}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catsRow}>
            {categorias.map(cat => (
              <CategoriaChip
                key={cat.id}
                cat={cat}
                selected={catSeleccionada === cat.id}
                onPress={() => setCatSeleccionada(
                  catSeleccionada === cat.id ? null : cat.id
                )}
              />
            ))}
          </ScrollView>
        </View>

        {/* ── TÉCNICOS ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {catSeleccionada
                ? categorias.find(c => c.id === catSeleccionada)?.nombre
                : '⭐ Mejor calificados'}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(client)/search')}>
              <Text style={styles.verTodo}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={Colors.red} style={{ marginTop: 40 }} />
          ) : workersFiltrados.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 48 }}>😔</Text>
              <Text style={styles.emptyText}>
                No hay técnicos disponibles{busqueda ? ` para "${busqueda}"` : ''} ahora.
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => { setBusqueda(''); setCatSeleccionada(null); }}
              >
                <Text style={styles.emptyBtnText}>Ver todos</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={workersFiltrados}
              keyExtractor={item => item.id}
              numColumns={2}
              columnWrapperStyle={{ gap: 12 }}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <WorkerCard
                  worker={item}
                  onPress={() => router.push(`/(client)/worker/${item.id}`)}
                />
              )}
            />
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── BOTTOM NAV ── */}
      <BottomNav active="home" />
    </View>
  );
}

// ─── BOTTOM NAVIGATION ───────────────────────────────────────
export function BottomNav({ active }: { active: 'home' | 'search' | 'bookings' | 'chat' | 'profile' }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const items = [
    { key: 'home',     icon: '🏠', label: 'Inicio',    route: '/(client)/home' },
    { key: 'search',   icon: '🔍', label: 'Buscar',    route: '/(client)/search' },
    { key: 'bookings', icon: '📋', label: 'Chambas',   route: '/(client)/bookings' },
    { key: 'chat',     icon: '💬', label: 'Mensajes',  route: '/(client)/chat' },
    { key: 'profile',  icon: '👤', label: 'Perfil',    route: '/(client)/profile' },
  ] as const;

  return (
    <View style={[styles.bottomNav, { paddingBottom: insets.bottom || 12 }]}>
      {items.map(item => (
        <TouchableOpacity
          key={item.key}
          style={[styles.navItem, active === item.key && styles.navItemActive]}
          onPress={() => router.push(item.route as any)}
        >
          <Text style={{ fontSize: 22 }}>{item.icon}</Text>
          <Text style={[styles.navLabel, active === item.key && styles.navLabelActive]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },

  // Header
  header: { backgroundColor: Colors.red, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 40, height: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  greeting: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontFamily: Fonts.body },
  greetingName: { color: 'white', fontFamily: Fonts.headingExtraBold, fontSize: 22 },
  locationRow: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: Spacing.md, fontFamily: Fonts.body },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    gap: 8,
    ...Shadow.md,
  },
  searchIcon: { fontSize: 18 },
  searchInput: { flex: 1, fontFamily: Fonts.body, fontSize: 15, color: Colors.dark },

  // Urgent banner
  urgentBanner: {
    margin: Spacing.lg,
    backgroundColor: Colors.dark,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    ...Shadow.md,
  },
  urgentTitle: { color: 'white', fontFamily: Fonts.heading, fontSize: 16, marginBottom: 2 },
  urgentSub: { color: Colors.gray, fontSize: 13, fontFamily: Fonts.body },

  // Sections
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.dark },
  verTodo: { color: Colors.red, fontSize: 13, fontFamily: Fonts.bodyMedium },

  // Categories
  catsRow: { marginHorizontal: -4 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'white',
    borderRadius: Radius.full,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadow.sm,
  },
  catChipSelected: { borderColor: Colors.red, backgroundColor: '#FFF5F3' },
  catIcon: { fontSize: 18 },
  catLabel: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: Colors.dark },
  catLabelSelected: { color: Colors.red },

  // Worker card
  workerCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadow.md,
  },
  workerAvatarBox: {
    height: 110,
    backgroundColor: '#FFE8E3',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  workerAvatarEmoji: { fontSize: 52 },
  levelBadge: {
    position: 'absolute',
    top: 8, right: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radius.full,
  },
  levelText: { fontSize: 9, fontFamily: Fonts.heading, color: Colors.dark },
  onlineDot: {
    position: 'absolute',
    bottom: 10, right: 10,
    width: 12, height: 12,
    borderRadius: 6,
    backgroundColor: Colors.green,
    borderWidth: 2, borderColor: 'white',
  },
  workerInfo: { padding: 12, gap: 4 },
  workerName: { fontFamily: Fonts.heading, fontSize: 14, color: Colors.dark },
  workerJob: { fontFamily: Fonts.body, fontSize: 12, color: Colors.gray },
  workerBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  star: { color: Colors.yellow, fontSize: 13 },
  ratingVal: { fontFamily: Fonts.heading, fontSize: 13, color: Colors.dark },
  ratingCount: { fontFamily: Fonts.body, fontSize: 11, color: Colors.gray },
  workerRate: { fontFamily: Fonts.heading, fontSize: 13, color: Colors.red },
  workerZone: { fontFamily: Fonts.body, fontSize: 11, color: Colors.gray },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { fontFamily: Fonts.body, fontSize: 15, color: Colors.gray, textAlign: 'center' },
  emptyBtn: { backgroundColor: Colors.red, borderRadius: Radius.full, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { color: 'white', fontFamily: Fonts.heading, fontSize: 14 },

  // Bottom nav
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: Colors.light,
    paddingTop: 10,
  },
  navItem: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 4, borderRadius: 14 },
  navItemActive: { },
  navLabel: { fontSize: 10, fontFamily: Fonts.bodyMedium, color: '#999' },
  navLabelActive: { color: Colors.red },
});
