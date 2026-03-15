import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import 'react-native-url-polyfill/auto';

// ─── CONFIGURA AQUÍ TUS CREDENCIALES DE SUPABASE ───────────────────────────
// 1. Ve a https://supabase.com y crea un proyecto gratis
// 2. En tu proyecto: Settings → API → copia Project URL y anon key
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'TU_SUPABASE_URL';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'TU_SUPABASE_ANON_KEY';
// ────────────────────────────────────────────────────────────────────────────

// Adapter para guardar sesión de forma segura en el dispositivo
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
