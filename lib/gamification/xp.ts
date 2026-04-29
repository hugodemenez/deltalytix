/**
 * XP / Level maths
 * Level thresholds follow a quadratic curve:
 *   xpForLevel(n) = 100 * n^1.8
 * So level 1→2 = 100 XP, 10→11 ≈ 6 310 XP, 50→51 ≈ 135 k XP.
 */

export const XP_PER_TRADE_WIN  = 20
export const XP_PER_TRADE_LOSS = 5
export const XP_LOGIN_STREAK   = 10   // per day in active streak

/** XP needed to reach `level` from 0 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0
  return Math.floor(100 * Math.pow(level - 1, 1.8))
}

/** Total XP → current level */
export function levelFromXP(xp: number): number {
  let level = 1
  while (xpForLevel(level + 1) <= xp) level++
  return level
}

/** XP needed for the *next* level */
export function xpToNextLevel(xp: number): number {
  const level = levelFromXP(xp)
  return xpForLevel(level + 1) - xp
}

/** Progress within current level: 0..1 */
export function levelProgress(xp: number): number {
  const level = levelFromXP(xp)
  const base  = xpForLevel(level)
  const next  = xpForLevel(level + 1)
  return (xp - base) / (next - base)
}

/** Human-readable level title */
const TITLES = [
  'Rookie', 'Apprentice', 'Trader', 'Skilled Trader', 'Veteran',
  'Expert', 'Master', 'Grandmaster', 'Elite', 'Legend'
]
export function levelTitle(level: number): string {
  const idx = Math.min(Math.floor((level - 1) / 5), TITLES.length - 1)
  return TITLES[idx]
}
