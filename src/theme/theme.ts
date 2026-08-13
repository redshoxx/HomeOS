export const colors = {
  background: '#F6F7F4',
  surface: '#FFFFFF',
  surfaceMuted: '#F0F2ED',
  text: '#101712',
  textMuted: '#6D776F',
  border: '#E4E8E2',
  accent: '#173C2B',
  accentPressed: '#0F2E20',
  accentSoft: '#E3EEE7',
  accentText: '#FFFFFF',
  danger: '#B42318',
  dangerSoft: '#FDE9E7',
  warning: '#9A6700',
  warningSoft: '#FFF3D6',
  success: '#237A4B',
  successSoft: '#E1F2E8',
} as const;

export const spacing = { xs: 6, sm: 10, md: 16, lg: 22, xl: 30, xxl: 40 } as const;
export const radius = { sm: 12, md: 18, lg: 26, xl: 32, pill: 999 } as const;
export const typography = {
  title: { fontSize: 34, lineHeight: 40, fontWeight: '800' as const, letterSpacing: -1.1 },
  h2: { fontSize: 21, lineHeight: 27, fontWeight: '750' as const, letterSpacing: -0.35 },
  body: { fontSize: 16, lineHeight: 23 },
  meta: { fontSize: 13, lineHeight: 18 },
} as const;
