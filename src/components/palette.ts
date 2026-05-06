export const P = {
  bg: '#F4EFE6',
  surface: '#FBF8F1',
  ink: '#1F2A22',
  inkSoft: '#5C6A5E',
  inkMute: '#8C9389',
  line: '#E2DBCB',
  primary: '#2F5742',
  primaryInk: '#F4EFE6',
  accent: '#C2683C',
  ok: '#5B7A4F',
  warn: '#C28A2A',
  danger: '#B14B3A',
} as const

export type Palette = typeof P
