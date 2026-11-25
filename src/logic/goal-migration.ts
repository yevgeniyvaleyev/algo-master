/**
 * One-time migrations of the saved settings blob (pure, tested).
 *
 * Settings saved before the single daily goal kept two: `dailyGoal` (new algorithms) and `cardDailyGoal` (cards ✓).
 * The single «Цель в день» starts at their sum; `goalVersion: 2` marks a blob already migrated. Pure, tested.
 */
export const GOAL_VERSION = 2;
const OLD_ALGO_GOAL = 3;
const OLD_CARD_GOAL = 5;

export function migrateGoal<T extends Record<string, unknown>>(
  stored: T,
): T & { dailyGoal?: number; goalVersion: number } {
  if (stored.goalVersion === GOAL_VERSION) return stored as T & { goalVersion: number };
  // A fresh install (nothing stored) takes the default; only saved old values are added together.
  const hadOld = 'dailyGoal' in stored || 'cardDailyGoal' in stored;
  const {
    cardDailyGoal,
    cardAheadCount: _ahead,
    ...rest
  } = stored as T & { cardDailyGoal?: unknown; cardAheadCount?: unknown };
  if (!hadOld) return { ...(rest as T), goalVersion: GOAL_VERSION };
  const algos = typeof stored.dailyGoal === 'number' ? stored.dailyGoal : OLD_ALGO_GOAL;
  const cards = typeof cardDailyGoal === 'number' ? cardDailyGoal : OLD_CARD_GOAL;
  return { ...(rest as T), dailyGoal: Math.max(1, algos + cards), goalVersion: GOAL_VERSION };
}

/**
 * The card gate used to be a switch (`cardGateEnabled`) plus a count; now the count alone (0 = off), and since the day
 * runs on flash cards anyway it starts off: every saved blob gets `cardGateCount: 0` once (`gateVersion: 2`).
 */
export const GATE_VERSION = 2;

export function migrateGate<T extends Record<string, unknown>>(stored: T): T & { gateVersion: number } {
  if (stored.gateVersion === GATE_VERSION) return stored as T & { gateVersion: number };
  const { cardGateEnabled: _enabled, ...rest } = stored as T & { cardGateEnabled?: unknown };
  return { ...(rest as T), cardGateCount: 0, gateVersion: GATE_VERSION };
}

/** Every migration, in order. */
export function migrateSettings<T extends Record<string, unknown>>(stored: T) {
  return migrateGate(migrateGoal(stored));
}
