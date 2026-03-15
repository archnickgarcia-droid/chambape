// ─── COLORES CHAMBAPE ────────────────────────────────────────────────────────
export const Colors = {
  red: '#E8321A',
  redDark: '#C02210',
  yellow: '#F5C518',
  cream: '#FAF7F2',
  dark: '#111110',
  gray: '#7A7873',
  light: '#EDEAE4',
  white: '#FFFFFF',
  green: '#1DB954',
  card: '#FFFFFF',
};

// ─── TIPOGRAFÍA ──────────────────────────────────────────────────────────────
export const Fonts = {
  heading: 'Syne-Bold',
  headingExtraBold: 'Syne-ExtraBold',
  body: 'DMSans-Regular',
  bodyMedium: 'DMSans-Medium',
  bodySemiBold: 'DMSans-SemiBold',
};

// ─── ESPACIADO ───────────────────────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// ─── BORDES ──────────────────────────────────────────────────────────────────
export const Radius = {
  sm: 10,
  md: 16,
  lg: 20,
  xl: 28,
  full: 999,
};

// ─── SOMBRAS ─────────────────────────────────────────────────────────────────
export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 12,
  },
};

// ─── TARIFAS / COMISIÓN ───────────────────────────────────────────────────────
export const Config = {
  comisionPorcentaje: 0.10,   // 10% de comisión a ChambaPe
  horasMinimas: 2,             // Mínimo 2 horas por servicio
  radioKm: 10,                 // Radio de búsqueda por defecto en km
};
