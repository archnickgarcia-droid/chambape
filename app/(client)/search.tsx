import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, FlatList, ActivityIndicator, Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { Worker, Categoria } from '../../lib/types';
import { Colors, Spacing, Radius, Fonts, Shadow } from '../../constants/theme';
import { BottomNav } from './home';

// ─── TIPOS DE FILTROS ────────────────────────────────────────
interface Filtros {
  categoriaId: string | null;
  soloDisponibles: boolean;
  tarifaMax: number;
  nivelMin: string | null;
  ordenar: 'calificacion' | 'precio_asc' | 'precio_desc' | 'trabajos';
}

const FILTROS_DEFAULT: Filtros = {
  categoriaId: null,
  soloDisponibles: false,
  tarifaMax: 200,
  nivelMin: null,
  ordenar: 'calificacion',
};

// ─── COMPONENTE: Worker en lista ─────────────────────────────
function WorkerRow({ worker, onPress }: { worker: Worker; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.workerRow} activeOpacity={0.85}>
      {/* Avatar */}
      <View style={styles.rowAvatar}>
        <Text style={{ fontSize: 34 }}>👷</Text>
        {worker.disponible && <View style={styles.rowOnline} />}
      </View>

      {/* Info */}
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.rowName}>{worker.user?.nombre ?? 'Técnico'}</Text>
          {worker.nivel === 'top' && <Text style={styles.topBadge}>🏅 TOP</Text>}
          {worker.nivel === 'pro' && <Text style={styles.proBadge}>PRO</Text>}
        </View>
        <Text style={styles.rowJob}>{worker.oficio} · {worker.anios_experiencia} años exp.</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={styles.rowRating}>
            ★ {worker.calificacion_promedio > 0
              ? worker.calificacion_promedio.toFixed(1)
              : 'Nuevo'} ({worker.total_trabajos})
          </Text>
          <Text style={styles.rowZone}>📍 {worker.distrito}</Text>
        </View>
        {worker.dni_verificado && (
          <Text style={styles.verified}>✅ DNI verificado</Text>
        )}
      </View>

      {/* Precio */}
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Text style={styles.rowPrice}>S/{worker.tarifa_hora}</Text>
        <Text style={styles.rowPriceSub}>/hora</Text>
        <TouchableOpacity onPress={onPress} style={styles.rowBtn}>
          <Text style={styles.rowBtnText}>Ver →</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── PANTALLA DE BÚSQUEDA ────────────────────────────────────
export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ categoria?: string; urgente?: string }>();

  const [busqueda, setBusqueda] = useState('');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState<Filtros>({
    ...FILTROS_DEFAULT,
    categoriaId: params.categoria ?? null,
    soloDisponibles: params.urgente === 'true',
  });
  const [showFiltros, setShowFiltros] = useState(false);
  const [filtrosTemp, setFiltrosTemp] = useState<Filtros>(filtros);

  useEffect(() => {
    supabase.from('categorias').select('*').eq('activa', true).then(({ data }) => {
      if (data) setCategorias(data);
    });
  }, []);

  const buscar = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('workers')
        .select(`*, user:users(id, nombre, avatar_url), categoria:categorias(nombre, icono)`)
        .lte('tarifa_hora', filtros.tarifaMax);

      if (filtros.categoriaId) query = query.eq('categoria_id', filtros.categoriaId);
      if (filtros.soloDisponibles) query = query.eq('disponible', true);
      if (filtros.nivelMin) {
        const niveles = ['nuevo', 'activo', 'pro', 'top'];
        const idx = niveles.indexOf(filtros.nivelMin);
        query = query.in('nivel', niveles.slice(idx));
      }
      if (busqueda) {
        query = query.ilike('oficio', `%${busqueda}%`);
      }

      // Ordenar
      switch (filtros.ordenar) {
        case 'calificacion':
          query = query.order('calificacion_promedio', { ascending: false }); break;
        case 'precio_asc':
          query = query.order('tarifa_hora', { ascending: true }); break;
        case 'precio_desc':
          query = query.order('tarifa_hora', { ascending: false }); break;
        case 'trabajos':
          query = query.order('total_trabajos', { ascending: false }); break;
      }

      const { data } = await query.limit(40);
      if (data) setWorkers(data as any);
    } finally {
      setLoading(false);
    }
  }, [filtros, busqueda]);

  useEffect(() => { buscar(); }, [buscar]);

  const aplicarFiltros = () => {
    setFiltros(filtrosTemp);
    setShowFiltros(false);
  };

  const countFiltrosActivos = () => {
    let n = 0;
    if (filtros.categoriaId) n++;
    if (filtros.soloDisponibles) n++;
    if (filtros.tarifaMax < 200) n++;
    if (filtros.nivelMin) n++;
    if (filtros.ordenar !== 'calificacion') n++;
    return n;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={{ color: Colors.dark, fontSize: 20 }}>←</Text>
          </TouchableOpacity>

          <View style={styles.searchBar}>
            <Text>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Oficio o nombre del técnico..."
              placeholderTextColor="#999"
              value={busqueda}
              onChangeText={setBusqueda}
              returnKeyType="search"
              onSubmitEditing={buscar}
              autoFocus
            />
          </View>

          <TouchableOpacity
            onPress={() => { setFiltrosTemp(filtros); setShowFiltros(true); }}
            style={[styles.filterBtn, countFiltrosActivos() > 0 && styles.filterBtnActive]}
          >
            <Text style={{ fontSize: 18 }}>⚙️</Text>
            {countFiltrosActivos() > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{countFiltrosActivos()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Chips de categoría rápida */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 10 }}>
          <TouchableOpacity
            style={[styles.catQuick, !filtros.categoriaId && styles.catQuickSelected]}
            onPress={() => setFiltros(f => ({ ...f, categoriaId: null }))}
          >
            <Text style={{ fontFamily: Fonts.bodyMedium, fontSize: 13, color: !filtros.categoriaId ? Colors.red : Colors.gray }}>
              Todos
            </Text>
          </TouchableOpacity>
          {categorias.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.catQuick, filtros.categoriaId === cat.id && styles.catQuickSelected]}
              onPress={() => setFiltros(f => ({
                ...f,
                categoriaId: f.categoriaId === cat.id ? null : cat.id,
              }))}
            >
              <Text>{cat.icono} </Text>
              <Text style={{
                fontFamily: Fonts.bodyMedium, fontSize: 13,
                color: filtros.categoriaId === cat.id ? Colors.red : Colors.gray,
              }}>
                {cat.nombre}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── RESULTADO ── */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {loading ? 'Buscando...' : `${workers.length} técnicos encontrados`}
        </Text>
        {filtros.soloDisponibles && (
          <View style={styles.onlineChip}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Solo disponibles</Text>
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.red} style={{ marginTop: 60 }} size="large" />
      ) : workers.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 56 }}>🔍</Text>
          <Text style={styles.emptyTitle}>Sin resultados</Text>
          <Text style={styles.emptySub}>Intenta con otros filtros o revisa más tarde.</Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => { setFiltros(FILTROS_DEFAULT); setBusqueda(''); }}
          >
            <Text style={styles.emptyBtnText}>Limpiar filtros</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={workers}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: Spacing.lg, gap: 12 }}
          renderItem={({ item }) => (
            <WorkerRow
              worker={item}
              onPress={() => router.push(`/(client)/worker/${item.id}`)}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── MODAL FILTROS ── */}
      <Modal visible={showFiltros} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtros</Text>
            <TouchableOpacity onPress={() => setShowFiltros(false)}>
              <Text style={{ fontSize: 18, color: Colors.gray }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg }}>

            {/* Disponibilidad */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Disponibilidad</Text>
              <TouchableOpacity
                style={[styles.toggleRow, filtrosTemp.soloDisponibles && styles.toggleActive]}
                onPress={() => setFiltrosTemp(f => ({ ...f, soloDisponibles: !f.soloDisponibles }))}
              >
                <Text style={styles.toggleText}>Solo técnicos disponibles ahora</Text>
                <View style={[styles.toggle, filtrosTemp.soloDisponibles && styles.toggleOn]}>
                  <View style={styles.toggleKnob} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Tarifa máxima */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Tarifa máxima: S/{filtrosTemp.tarifaMax}/h</Text>
              <View style={styles.tarifaOptions}>
                {[50, 80, 100, 150, 200].map(val => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.tarifaChip, filtrosTemp.tarifaMax === val && styles.tarifaChipSelected]}
                    onPress={() => setFiltrosTemp(f => ({ ...f, tarifaMax: val }))}
                  >
                    <Text style={[
                      styles.tarifaChipText,
                      filtrosTemp.tarifaMax === val && { color: Colors.red },
                    ]}>
                      {val === 200 ? 'Todos' : `S/${val}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Nivel mínimo */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Nivel del técnico</Text>
              <View style={styles.levelOptions}>
                {[
                  { key: null, label: 'Cualquier nivel' },
                  { key: 'activo', label: '⚡ Activo+' },
                  { key: 'pro', label: '🔵 Pro+' },
                  { key: 'top', label: '🏅 Solo Top' },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.key ?? 'all'}
                    style={[styles.levelChip, filtrosTemp.nivelMin === opt.key && styles.levelChipSelected]}
                    onPress={() => setFiltrosTemp(f => ({ ...f, nivelMin: opt.key }))}
                  >
                    <Text style={[
                      styles.levelChipText,
                      filtrosTemp.nivelMin === opt.key && { color: Colors.red },
                    ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Ordenar */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Ordenar por</Text>
              {[
                { key: 'calificacion', label: '⭐ Mejor calificados' },
                { key: 'precio_asc',   label: '💰 Precio: menor a mayor' },
                { key: 'precio_desc',  label: '💰 Precio: mayor a menor' },
                { key: 'trabajos',     label: '🔨 Más trabajos realizados' },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.orderOption, filtrosTemp.ordenar === opt.key && styles.orderOptionSelected]}
                  onPress={() => setFiltrosTemp(f => ({ ...f, ordenar: opt.key as any }))}
                >
                  <Text style={[
                    styles.orderOptionText,
                    filtrosTemp.ordenar === opt.key && { color: Colors.red, fontFamily: Fonts.heading },
                  ]}>
                    {opt.label}
                  </Text>
                  {filtrosTemp.ordenar === opt.key && <Text style={{ color: Colors.red }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Botones */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => setFiltrosTemp(FILTROS_DEFAULT)}
            >
              <Text style={styles.resetBtnText}>Limpiar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={aplicarFiltros}>
              <Text style={styles.applyBtnText}>Aplicar filtros</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <BottomNav active="search" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },

  header: { backgroundColor: 'white', paddingHorizontal: Spacing.lg, paddingTop: 8, paddingBottom: 0, borderBottomWidth: 1, borderBottomColor: Colors.light },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cream,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: { flex: 1, fontFamily: Fonts.body, fontSize: 15, color: Colors.dark },
  filterBtn: {
    width: 44, height: 44,
    backgroundColor: Colors.cream,
    borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  filterBtnActive: { backgroundColor: '#FFE8E3' },
  filterBadge: {
    position: 'absolute', top: 6, right: 6,
    width: 16, height: 16,
    backgroundColor: Colors.red,
    borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeText: { color: 'white', fontSize: 9, fontFamily: Fonts.heading },
  catQuick: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6, paddingHorizontal: 14,
    borderRadius: Radius.full,
    marginRight: 8,
    borderWidth: 1.5, borderColor: Colors.light,
    backgroundColor: 'white',
  },
  catQuickSelected: { borderColor: Colors.red, backgroundColor: '#FFF5F3' },

  // Results
  resultsHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: 12,
  },
  resultsCount: { fontFamily: Fonts.bodySemiBold, fontSize: 14, color: Colors.gray },
  onlineChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E8F8EE', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.green },
  onlineText: { fontSize: 12, fontFamily: Fonts.bodyMedium, color: Colors.green },

  // Worker row
  workerRow: {
    backgroundColor: 'white',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    ...Shadow.sm,
  },
  rowAvatar: {
    width: 70, height: 70,
    backgroundColor: '#FFE8E3',
    borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
    flexShrink: 0,
  },
  rowOnline: {
    position: 'absolute', bottom: 4, right: 4,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: Colors.green, borderWidth: 2, borderColor: 'white',
  },
  rowName: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.dark },
  topBadge: { fontSize: 10, backgroundColor: Colors.yellow, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, fontFamily: Fonts.heading, color: Colors.dark },
  proBadge: { fontSize: 10, backgroundColor: '#DBEAFE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, fontFamily: Fonts.heading, color: '#1D4ED8' },
  rowJob: { fontFamily: Fonts.body, fontSize: 13, color: Colors.gray },
  rowRating: { fontFamily: Fonts.bodyMedium, fontSize: 12, color: Colors.dark },
  rowZone: { fontFamily: Fonts.body, fontSize: 12, color: Colors.gray },
  verified: { fontFamily: Fonts.body, fontSize: 11, color: Colors.green },
  rowPrice: { fontFamily: Fonts.headingExtraBold, fontSize: 18, color: Colors.red },
  rowPriceSub: { fontFamily: Fonts.body, fontSize: 11, color: Colors.gray, marginTop: -4 },
  rowBtn: { backgroundColor: Colors.red, borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 6 },
  rowBtnText: { color: 'white', fontFamily: Fonts.heading, fontSize: 13 },

  // Empty
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.dark },
  emptySub: { fontFamily: Fonts.body, fontSize: 15, color: Colors.gray, textAlign: 'center' },
  emptyBtn: { backgroundColor: Colors.red, borderRadius: Radius.full, paddingHorizontal: 28, paddingVertical: 14 },
  emptyBtnText: { color: 'white', fontFamily: Fonts.heading, fontSize: 15 },

  // Modal filtros
  modalContainer: { flex: 1, backgroundColor: Colors.cream },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.light, backgroundColor: 'white' },
  modalTitle: { fontFamily: Fonts.headingExtraBold, fontSize: 22, color: Colors.dark },
  filterSection: { gap: 10 },
  filterLabel: { fontFamily: Fonts.heading, fontSize: 16, color: Colors.dark },
  toggleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: Radius.md, padding: Spacing.md, gap: 12 },
  toggleActive: { backgroundColor: '#FFF5F3' },
  toggleText: { flex: 1, fontFamily: Fonts.body, fontSize: 15, color: Colors.dark },
  toggle: { width: 44, height: 26, borderRadius: 13, backgroundColor: Colors.light, padding: 3 },
  toggleOn: { backgroundColor: Colors.red },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'white' },
  tarifaOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tarifaChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.full, backgroundColor: 'white', borderWidth: 1.5, borderColor: Colors.light },
  tarifaChipSelected: { borderColor: Colors.red, backgroundColor: '#FFF5F3' },
  tarifaChipText: { fontFamily: Fonts.bodyMedium, fontSize: 14, color: Colors.gray },
  levelOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  levelChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.full, backgroundColor: 'white', borderWidth: 1.5, borderColor: Colors.light },
  levelChipSelected: { borderColor: Colors.red, backgroundColor: '#FFF5F3' },
  levelChipText: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: Colors.gray },
  orderOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1.5, borderColor: Colors.light },
  orderOptionSelected: { borderColor: Colors.red, backgroundColor: '#FFF5F3' },
  orderOptionText: { fontFamily: Fonts.body, fontSize: 15, color: Colors.dark },
  modalFooter: { flexDirection: 'row', gap: 12, padding: Spacing.lg, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: Colors.light },
  resetBtn: { flex: 1, borderRadius: Radius.md, padding: 16, alignItems: 'center', backgroundColor: Colors.light },
  resetBtnText: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.dark },
  applyBtn: { flex: 2, borderRadius: Radius.md, padding: 16, alignItems: 'center', backgroundColor: Colors.red },
  applyBtnText: { fontFamily: Fonts.heading, fontSize: 15, color: 'white' },
});
