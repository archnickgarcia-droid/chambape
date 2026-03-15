import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Message } from '../../lib/types';
import { Colors, Spacing, Radius, Fonts } from '../../constants/theme';

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { user } = useAuth();
  const flatRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [texto, setTexto] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [booking, setBooking] = useState<any>(null);

  useEffect(() => {
    if (!bookingId) return;

    // Cargar booking info
    supabase
      .from('bookings')
      .select('*, worker:workers(user:users(nombre)), categoria:categorias(nombre)')
      .eq('id', bookingId)
      .single()
      .then(({ data }) => setBooking(data));

    // Cargar mensajes iniciales
    supabase
      .from('messages')
      .select('*, sender:users(nombre)')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setMessages(data as any); setLoading(false); });

    // Suscripción en tiempo real
    const channel = supabase
      .channel(`chat-${bookingId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `booking_id=eq.${bookingId}`,
      }, async (payload) => {
        // Fetch con sender
        const { data } = await supabase
          .from('messages')
          .select('*, sender:users(nombre)')
          .eq('id', payload.new.id)
          .single();
        if (data) setMessages(prev => [...prev, data as any]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [bookingId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const handleEnviar = async () => {
    if (!texto.trim() || !user || !bookingId) return;
    setSending(true);
    const txt = texto.trim();
    setTexto('');
    await supabase.from('messages').insert({
      booking_id: bookingId,
      sender_id: user.id,
      texto: txt,
    });
    setSending(false);
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const mia = item.sender_id === user?.id;
    const showAvatar = !mia && (index === 0 || messages[index - 1]?.sender_id !== item.sender_id);

    return (
      <View style={[styles.msgRow, mia && styles.msgRowMia]}>
        {!mia && (
          <View style={[styles.msgAvatar, { opacity: showAvatar ? 1 : 0 }]}>
            <Text style={{ fontSize: 16 }}>👷</Text>
          </View>
        )}
        <View style={[styles.bubble, mia ? styles.bubbleMia : styles.bubbleEllos]}>
          {!mia && showAvatar && (
            <Text style={styles.bubbleSender}>{item.sender?.nombre?.split(' ')[0]}</Text>
          )}
          <Text style={[styles.bubbleText, mia && styles.bubbleTextMia]}>{item.texto}</Text>
          <Text style={[styles.bubbleTime, mia && { color: 'rgba(255,255,255,0.6)' }]}>
            {formatTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{booking?.worker?.user?.nombre ?? 'Técnico'}</Text>
          <Text style={styles.headerSub}>{booking?.categoria?.nombre ?? 'Servicio'}</Text>
        </View>
        <View style={styles.onlineIndicator}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>Online</Text>
        </View>
      </View>

      {/* MENSAJES */}
      {loading ? (
        <ActivityIndicator color={Colors.red} style={{ flex: 1 }} />
      ) : (
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={{ padding: Spacing.lg, gap: 6, flexGrow: 1 }}
          renderItem={renderMessage}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={{ fontSize: 48 }}>💬</Text>
              <Text style={styles.emptyChatText}>Inicia la conversación con el técnico.</Text>
              <View style={styles.quickMsgs}>
                {['Hola, ¿ya está en camino?', '¿Cuánto tardará?', 'Ya estoy en casa'].map(msg => (
                  <TouchableOpacity key={msg} style={styles.quickMsg} onPress={() => setTexto(msg)}>
                    <Text style={styles.quickMsgText}>{msg}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
        />
      )}

      {/* INPUT */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom || 12 }]}>
        <TouchableOpacity style={styles.attachBtn}>
          <Text style={{ fontSize: 22 }}>📎</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Escribe un mensaje..."
          placeholderTextColor="#bbb"
          value={texto}
          onChangeText={setTexto}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={handleEnviar}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!texto.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleEnviar}
          disabled={!texto.trim() || sending}
        >
          <Text style={{ fontSize: 20 }}>{sending ? '⏳' : '➤'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'white', padding: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.light,
  },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1 },
  headerName: { fontFamily: Fonts.heading, fontSize: 16, color: Colors.dark },
  headerSub: { fontFamily: Fonts.body, fontSize: 12, color: Colors.gray },
  onlineIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.green },
  onlineText: { fontFamily: Fonts.bodyMedium, fontSize: 12, color: Colors.green },
  msgRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginBottom: 4 },
  msgRowMia: { justifyContent: 'flex-end' },
  msgAvatar: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#FFE8E3', alignItems: 'center', justifyContent: 'center',
  },
  bubble: {
    maxWidth: '75%', borderRadius: 18, padding: 12, gap: 4,
  },
  bubbleMia: { backgroundColor: Colors.red, borderBottomRightRadius: 4 },
  bubbleEllos: { backgroundColor: 'white', borderBottomLeftRadius: 4 },
  bubbleSender: { fontFamily: Fonts.heading, fontSize: 11, color: Colors.red },
  bubbleText: { fontFamily: Fonts.body, fontSize: 15, color: Colors.dark, lineHeight: 21 },
  bubbleTextMia: { color: 'white' },
  bubbleTime: { fontFamily: Fonts.body, fontSize: 10, color: Colors.gray, alignSelf: 'flex-end' },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
  emptyChatText: { fontFamily: Fonts.body, fontSize: 15, color: Colors.gray, textAlign: 'center' },
  quickMsgs: { gap: 8, marginTop: 8, width: '100%', paddingHorizontal: Spacing.lg },
  quickMsg: {
    backgroundColor: 'white', borderRadius: Radius.full, paddingHorizontal: 18, paddingVertical: 10,
    borderWidth: 1.5, borderColor: Colors.light, alignSelf: 'center',
  },
  quickMsgText: { fontFamily: Fonts.bodyMedium, fontSize: 14, color: Colors.dark },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    backgroundColor: 'white', paddingHorizontal: Spacing.md, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: Colors.light,
  },
  attachBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1, backgroundColor: Colors.cream, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    fontFamily: Fonts.body, fontSize: 15, color: Colors.dark, maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, backgroundColor: Colors.red,
    borderRadius: 22, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.light },
});
