// ─── TIPOS PRINCIPALES DE CHAMBAPE ──────────────────────────────────────────

export type UserRole = 'cliente' | 'worker';

export type WorkerLevel = 'nuevo' | 'activo' | 'pro' | 'top';

export interface User {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  avatar_url?: string;
  rol: UserRole;
  created_at: string;
}

export interface Categoria {
  id: string;
  nombre: string;
  icono: string;
  descripcion: string;
}

export interface Worker {
  id: string;
  user_id: string;
  user?: User;
  oficio: string;
  categoria_id: string;
  categoria?: Categoria;
  descripcion: string;
  tarifa_hora: number;
  anios_experiencia: number;
  lat?: number;
  lng?: number;
  distrito: string;
  zonas_atencion: string[];   // ej: ['Miraflores', 'San Borja']
  disponible: boolean;
  nivel: WorkerLevel;
  dni_verificado: boolean;
  antecedentes_ok: boolean;
  calificacion_promedio: number;
  total_trabajos: number;
  tiempo_respuesta_min: number;
  portfolio_urls: string[];
  created_at: string;
}

export type BookingEstado =
  | 'pendiente'
  | 'aceptado'
  | 'en_camino'
  | 'en_progreso'
  | 'completado'
  | 'cancelado';

export type PagoMetodo = 'yape' | 'plin' | 'efectivo' | 'tarjeta';

export interface Booking {
  id: string;
  cliente_id: string;
  cliente?: User;
  worker_id: string;
  worker?: Worker;
  categoria_id: string;
  categoria?: Categoria;
  fecha: string;           // 'YYYY-MM-DD'
  hora: string;            // 'HH:MM'
  direccion: string;
  descripcion: string;
  precio_base: number;
  comision: number;
  precio_total: number;
  pago_metodo: PagoMetodo;
  pago_id?: string;
  estado: BookingEstado;
  created_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  booking?: Booking;
  cliente_id: string;
  cliente?: User;
  worker_id: string;
  calificacion: number;    // 1-5
  comentario: string;
  puntual: boolean;
  dejo_limpio: boolean;
  cobro_acordado: boolean;
  foto_url?: string;
  created_at: string;
}

export interface Message {
  id: string;
  booking_id: string;
  sender_id: string;
  sender?: User;
  texto: string;
  leido: boolean;
  created_at: string;
}

// ─── TIPOS PARA NAVEGACIÓN ──────────────────────────────────────────────────
export type RootStackParamList = {
  '(auth)/login': undefined;
  '(auth)/register': undefined;
  '(auth)/register-worker': undefined;
  '(client)/home': undefined;
  '(client)/search': { categoria?: string };
  '(client)/worker/[id]': { id: string };
  '(client)/booking/[workerId]': { workerId: string };
  '(client)/booking-success': { bookingId: string };
  '(worker)/dashboard': undefined;
  '(worker)/requests': undefined;
  '(worker)/profile-edit': undefined;
};
