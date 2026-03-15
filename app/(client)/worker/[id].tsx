import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Share, Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { Worker, Review } from '../../lib/types';
import { Colors, Spacing, Radius, Fonts, Shadow, Config } from '../../constants/theme';

// ─── COMPONENTE: Estrella de rating ─────────────────────────
function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Text key={i} style={{ fontSize: size, color: i <= value ? Colors.yellow : Colors.light }}>
          ★
        </Text>
      ))}
    </View>
  );
}

// ─── COMPONENTE: Tarjeta de reseña ──────────────────────────
function ReviewCard({ review }: { review: Review }) {
  const fecha = new Date(review.created_at).toLocaleDateString('es-PE', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewTop}>
        <View style={styles.reviewAvatar}>
          <Text style={{ fontSize: 20 }}>👤</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.reviewUser}>{review.cliente?.nombre ?? 'Cliente'}</Text>
          <Text style={styles.reviewDate}>{fecha}</Text>
        </View>
        <Stars value={review.calificacion} size={14} />
      </View>
      {review.comentario ? (
        <Text style={styles.reviewText}>{review.comentario}</Text>
      ) : null}
      <View style={styles.reviewChips}>
        {review.puntual && <View style={styles.chip}><Text style={styles.chipText}>⏱️ Puntual</Text></View>}
        {review.dejo_limpio && <View style={styles.chip}><Text style={styles.chipText}>✨ Dejó limpio</Text></View>}
        {review.cobro_acordado && <View style={styles.chip}><Text style={styles.chipText}>💰 Cobró lo acordado</Text></View>}
      </View>
    </View>
  );
}

// ─── PANTALLA PERFIL DEL TRABAJADOR ─────────────────────────
export default function WorkerProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [worker, setWorker] = useState<Worker | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedFav, setSavedFav] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      // Cargar worker
      supabase
        .from('workers')
        .select(`*, user:users(id, nombre, telefono, avatar_url), categoria:categorias(nombre, icono)`)
        .eq('id', id)
        .single()
        .then(({ data }) => { if (data) setWorker(data as any); }),

      // Cargar reviews
      supabase
        .from('reviews')
        .select(`*, cliente:users(nombre)`)
        .eq('worker_id', id)
        .order('created_at', { ascending: false })
        .limit(10)
        .then(({ data }) => { if (data) setReviews(data as any); }),
    ]).finally(() => setLoading(false));
  }, [id]);

  const handleShare = async () => {
    if (!worker) return;
    await Share.share({
      message: `Encontré a ${worker.user?.nombre} en ChambaPe, ${worker.oficio} con ${worker.calificacion_promedio.toFixed(1)} ★. ¡Muy recomendado!`,
    });
  };

  const handleWhatsApp = () => {
    if (!worker?.user?.telefono) return;
    const telefono = worker.user.telefono.replace(/\D/g, '');
    const msg = encodeURIComponent(`Hola ${worker.user.nombre?.split(' ')[0]}, te encontré en ChambaPe y me gustaría contratar tus servicios.`);
    Linking.openURL(`https://wa.me/51${telefono}?text=${msg}`);
  };

  const precioBase = worker ? worker.tarifa_hora * Config.horasMinimas : 0;

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.cream }}>
        <ActivityIndicator color={Colors.red} size="large" />
      </View>
    );
  }

  if (!worker) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: Fonts.body, color: Colors.gray }}>Técnico no encontrado.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>

        {/* ── HEADER OSCURO ── */}
        <View style={styles.header}>
          {/* Barra de acciones */}
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
              <Text style={{ color: 'white', fontSize: 20 }}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Perfil del técnico</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={() => setSavedFav(v => !v)} style={styles.headerBtn}>
                <Text style={{ fontSize: 20 }}>{savedFav ? '❤️' : '🤍'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleShare} style={styles.headerBtn}>
                <Text style={{ fontSize: 20 }}>⬆️</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Info principal */}
          <View style={styles.profileMain}>
            <View style={styles.avatarBox}>
              <Text style={{ fontSize: 52 }}>👷</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.workerName}>{worker.user?.nombre ?? 'Técnico'}</Text>
              <Text style={styles.workerJob}>
                {worker.oficio} · {worker.anios_experiencia} años de experiencia
              </Text>

              {/* Badges */}
              <View style={styles.badges}>
                {worker.nivel === 'top' && (
                  <View style={[styles.badge, { backgroundColor: Colors.yellow }]}>
                    <Text style={[styles.badgeText, { color: Colors.dark }]}>🏅 TOP</Text>
                  </View>
                )}
                {worker.nivel === 'pro' && (
                  <View style={[styles.badge, { backgroundColor: '#DBEAFE' }]}>
                    <Text style={[styles.badgeText, { color: '#1D4ED8' }]}>⭐ PRO</Text>
                  </View>
                )}
                {worker.dni_verificado && (
                  <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                    <Text style={styles.badgeText}>✅ DNI OK</Text>
                  </View>
                )}
                {worker.antecedentes_ok && (
                  <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                    <Text style={styles.badgeText}>🔍 Sin antecedentes</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Disponibilidad */}
          <View style={styles.availRow}>
            <View style={[styles.availChip, { backgroundColor: worker.disponible ? 'rgba(29,185,84,0.15)' : 'rgba(255,255,255,0.1)' }]}>
              <View style={[styles.availDot, { backgroundColor: worker.disponible ? Colors.green : Colors.gray }]} />
              <Text style={[styles.availText, { color: worker.disponible ? Colors.green : Colors.gray }]}>
                {worker.disponible ? 'Disponible ahora' : 'No disponible hoy'}
              </Text>
            </View>
            <Text style={styles.responseTime}>
              ⏱️ Responde en ~{worker.tiempo_respuesta_min} min
            </Text>
          </View>
        </View>

        {/* ── ESTADÍSTICAS ── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statVal, { color: Colors.red }]}>
              {worker.calificacion_promedio > 0 ? worker.calificacion_promedio.toFixed(1) : '—'}
            </Text>
            <Stars value={Math.round(worker.calificacion_promedio)} size={12} />
            <Text style={styles.statLabel}>Calificación</Text>
          </View>
          <View style={[styles.statCard, styles.statCardBorder]}>
            <Text style={styles.statVal}>{worker.total_trabajos}</Text>
            <Text style={styles.statLabel}>Trabajos</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{worker.anios_experiencia}</Text>
            <Text style={styles.statLabel}>Años exp.</Text>
          </View>
        </View>

        {/* ── DESCRIPCIÓN ── */}
        {worker.descripcion ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sobre mí</Text>
            <Text style={styles.description}>{worker.descripcion}</Text>
          </View>
        ) : null}

        {/* ── INFO ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información</Text>
          <View style={styles.infoCard}>
            {[
              { icon: '💰', label: 'Tarifa', value: `S/${worker.tarifa_hora}/hora · Mínimo ${Config.horasMinimas}h` },
              { icon: '📍', label: 'Atiende en', value: worker.zonas_atencion?.join(', ') || worker.distrito },
              { icon: '🏷️', label: 'Especialidad', value: worker.categoria?.nombre ?? worker.oficio },
            ].map((item, i) => (
              <View key={i} style={[styles.infoRow, i > 0 && styles.infoRowBorder]}>
                <Text style={{ fontSize: 20, width: 28 }}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValue}>{item.value}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── PORTAFOLIO ── */}
        {(worker.portfolio_urls?.length ?? 0) > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Portafolio ({worker.portfolio_urls.length} fotos)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {worker.portfolio_urls.map((url, i) => (
                  <View key={i} style={styles.portfolioItem}>
                    <Text style={{ fontSize: 36 }}>🔧</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Portafolio</Text>
            <View style={styles.emptyPortfolio}>
              <Text style={{ color: Colors.gray, fontSize: 14, fontFamily: Fonts.body }}>
                Este técnico aún no ha subido fotos de sus trabajos.
              </Text>
            </View>
          </View>
        )}

        {/* ── RESEÑAS ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Reseñas ({reviews.length})</Text>
            {worker.calificacion_promedio > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontFamily: Fonts.headingExtraBold, fontSize: 18, color: Colors.dark }}>
                  {worker.calificacion_promedio.toFixed(1)}
                </Text>
                <Stars value={Math.round(worker.calificacion_promedio)} size={14} />
              </View>
            )}
          </View>

          {reviews.length === 0 ? (
            <View style={styles.emptyReviews}>
              <Text style={{ fontSize: 36 }}>⭐</Text>
              <Text style={{ fontFamily: Fonts.body, color: Colors.gray, textAlign: 'center' }}>
                Aún no tiene reseñas. ¡Sé el primero en contratarlo!
              </Text>
            </View>
          ) : (
            reviews.map(r => <ReviewCard key={r.id} review={r} />)
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── FOOTER DE RESERVA ── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom || 16 }]}>
        <View>
          <Text style={styles.footerPriceLabel}>Desde</Text>
          <Text style={styles.footerPrice}>
            S/{precioBase}{' '}
            <Text style={styles.footerPriceSub}>/{Config.horasMinimas}h mín.</Text>
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            style={styles.whatsappBtn}
            onPress={handleWhatsApp}
          >
            <Text style={{ fontSize: 20 }}>💬</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bookBtn}
            onPress={() => router.push(`/(client)/booking/${worker.id}`)}
          >
            <Text style={styles.bookBtnText}>Reservar →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },

  // Header
  header: { backgroundColor: Colors.dark, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  headerActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  headerBtn: {
    width: 38, height: 38,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: Fonts.heading, fontSize: 16, color: 'white' },
  profileMain: { flexDirection: 'row', gap: 16, marginBottom: 14 },
  avatarBox: {
    width: 88, height: 88,
    backgroundColor: '#E8321A',
    borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)',
    flexShrink: 0,
  },
  workerName: { fontFamily: Fonts.headingExtraBold, fontSize: 22, color: 'white', marginBottom: 4 },
  workerJob: { fontFamily: Fonts.body, fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 10 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full },
  badgeText: { fontFamily: Fonts.heading, fontSize: 10, color: 'white' },
  availRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  availChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  availDot: { width: 8, height: 8, borderRadius: 4 },
  availText: { fontFamily: Fonts.bodyMedium, fontSize: 13 },
  responseTime: { fontFamily: Fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.5)' },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: Radius.lg,
    ...Shadow.md,
    overflow: 'hidden',
  },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 4 },
  statCardBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: Colors.light },
  statVal: { fontFamily: Fonts.headingExtraBold, fontSize: 24, color: Colors.dark },
  statLabel: { fontFamily: Fonts.body, fontSize: 12, color: Colors.gray },

  // Sections
  section: { padding: Spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.dark, marginBottom: 14 },
  description: { fontFamily: Fonts.body, fontSize: 15, color: Colors.gray, lineHeight: 24 },

  // Info card
  infoCard: { backgroundColor: 'white', borderRadius: Radius.lg, ...Shadow.sm, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: Spacing.md },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: Colors.light },
  infoLabel: { fontFamily: Fonts.body, fontSize: 12, color: Colors.gray, marginBottom: 2 },
  infoValue: { fontFamily: Fonts.bodyMedium, fontSize: 15, color: Colors.dark },

  // Portfolio
  portfolioItem: {
    width: 110, height: 110,
    backgroundColor: Colors.light,
    borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyPortfolio: { backgroundColor: 'white', borderRadius: Radius.md, padding: Spacing.lg, alignItems: 'center' },

  // Reviews
  emptyReviews: { alignItems: 'center', gap: 10, padding: Spacing.lg, backgroundColor: 'white', borderRadius: Radius.md },
  reviewCard: { backgroundColor: 'white', borderRadius: Radius.md, padding: Spacing.md, marginBottom: 10, ...Shadow.sm },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  reviewAvatar: {
    width: 38, height: 38,
    backgroundColor: Colors.light,
    borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  reviewUser: { fontFamily: Fonts.heading, fontSize: 14, color: Colors.dark },
  reviewDate: { fontFamily: Fonts.body, fontSize: 12, color: Colors.gray },
  reviewText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.dark, lineHeight: 22, marginBottom: 10 },
  reviewChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: Colors.cream, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontFamily: Fonts.body, fontSize: 12, color: Colors.gray },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: Spacing.lg,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light,
    ...Shadow.lg,
  },
  footerPriceLabel: { fontFamily: Fonts.body, fontSize: 12, color: Colors.gray },
  footerPrice: { fontFamily: Fonts.headingExtraBold, fontSize: 24, color: Colors.dark },
  footerPriceSub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.gray },
  whatsappBtn: {
    width: 52, height: 52,
    backgroundColor: Colors.light,
    borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  bookBtn: {
    backgroundColor: Colors.red,
    borderRadius: 16,
    paddingHorizontal: 28, paddingVertical: 14,
  },
  bookBtnText: { fontFamily: Fonts.heading, fontSize: 16, color: 'white' },
});
