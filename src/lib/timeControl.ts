// Time controls for games against bots ("" = no clock)
export const TIME_CONTROLS = [
  { id: '', label: 'Ohne Uhr' },
  { id: '5+3', label: '5+3' },
  { id: '10+0', label: '10 Min' },
  { id: '15+10', label: '15+10' },
  { id: '30+0', label: '30 Min' },
]

export function parseTc(tc?: string) {
  if (!tc) return null
  const [base, inc] = tc.split('+').map(Number)
  if (!base) return null
  return { base: base * 60, inc: inc || 0 }
}
