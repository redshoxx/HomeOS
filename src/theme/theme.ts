export const colors = {
  background: '#F4F5F1',
  surface: '#FFFFFF',
  surfaceMuted: '#EFF1EC',
  surfaceRaised: '#FAFBF9',
  text: '#0D1510',
  textMuted: '#687168',
  textSoft: '#939B94',
  border: '#E0E5DE',
  accent: '#123E2A',
  accentPressed: '#0B2D1D',
  accentSoft: '#E2EEE6',
  accentText: '#FFFFFF',
  danger: '#B42318',
  dangerSoft: '#FDEAE8',
  warning: '#936400',
  warningSoft: '#FFF2D2',
  success: '#237A4B',
  successSoft: '#E0F2E7',
} as const;

export const spacing = { xs: 6, sm: 10, md: 16, lg: 22, xl: 30, xxl: 40 } as const;
export const radius = { sm: 11, md: 16, lg: 22, xl: 28, pill: 999 } as const;
export const typography = {
  title: { fontSize: 32, lineHeight: 38, fontWeight: '800' as const, letterSpacing: -1 },
  h2: { fontSize: 20, lineHeight: 26, fontWeight: '700' as const, letterSpacing: -0.3 },
  body: { fontSize: 16, lineHeight: 23 },
  meta: { fontSize: 13, lineHeight: 18 },
} as const;
