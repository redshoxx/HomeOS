export const colors = {
  background: '#F4F5F2',
  surface: '#FFFFFF',
  surfaceMuted: '#ECEFEA',
  text: '#171A17',
  textMuted: '#667067',
  border: '#DCE1DA',
  accent: '#26382B',
  accentSoft: '#DDE7DF',
  danger: '#9E2A2B',
  warning: '#8A6116',
  success: '#2F6B45',
} as const;

export const spacing = { xs: 6, sm: 10, md: 16, lg: 22, xl: 30 } as const;
export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;
export const typography = {
  title: { fontSize: 30, fontWeight: '700' as const, letterSpacing: -0.7 },
  h2: { fontSize: 21, fontWeight: '700' as const, letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 22 },
  meta: { fontSize: 13, lineHeight: 18 },
} as const;
