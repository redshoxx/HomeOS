export const colors = {
  background: '#F5F7F3',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF2EC',
  surfaceRaised: '#FAFBF9',
  text: '#101712',
  textMuted: '#6B756D',
  textSoft: '#929A94',
  border: '#E1E7E0',
  accent: '#163C2A',
  accentPressed: '#0F2E20',
  accentSoft: '#E1EEE6',
  accentText: '#FFFFFF',
  danger: '#B42318',
  dangerSoft: '#FDEAE8',
  warning: '#936400',
  warningSoft: '#FFF2D2',
  success: '#237A4B',
  successSoft: '#E0F2E7',
} as const;

export const spacing = { xs: 6, sm: 10, md: 16, lg: 22, xl: 30, xxl: 40 } as const;
export const radius = { sm: 12, md: 18, lg: 26, xl: 32, pill: 999 } as const;
export const typography = {
  title: { fontSize: 34, lineHeight: 40, fontWeight: '800' as const, letterSpacing: -1.1 },
  h2: { fontSize: 21, lineHeight: 27, fontWeight: '700' as const, letterSpacing: -0.35 },
  body: { fontSize: 16, lineHeight: 23 },
  meta: { fontSize: 13, lineHeight: 18 },
} as const;
