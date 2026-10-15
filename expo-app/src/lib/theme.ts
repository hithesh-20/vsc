export const colors = {
  bg: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceAlt: '#F8FAFC',
  border: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#64748B',
  textFaint: '#94A3B8',

  primary: '#EA580C',
  primaryDark: '#C2410C',
  primarySoft: '#FFF1E7',

  green: '#16A34A',
  greenSoft: '#DCFCE7',
  red: '#DC2626',
  redSoft: '#FEE2E2',
  amber: '#D97706',
  amberSoft: '#FEF3C7',
  blue: '#2563EB',
  blueSoft: '#DBEAFE',
  purple: '#7C3AED',
  purpleSoft: '#EDE9FE',

  white: '#FFFFFF',
  overlay: 'rgba(15, 23, 42, 0.45)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const shadow = {
  card: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
} as const;
