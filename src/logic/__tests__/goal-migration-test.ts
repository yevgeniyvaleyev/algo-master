import { GATE_VERSION, GOAL_VERSION, migrateGate, migrateGoal, migrateSettings } from '../goal-migration';

describe('migrateGoal', () => {
  it('adds the old algorithm and card goals together once', () => {
    const out = migrateGoal({ dailyGoal: 2, cardDailyGoal: 6, cardAheadCount: 2, theme: 'dark' });
    expect(out).toEqual({ dailyGoal: 8, goalVersion: GOAL_VERSION, theme: 'dark' });
    expect(migrateGoal(out)).toEqual(out);
  });

  it('uses the old defaults for a missing half', () => {
    expect(migrateGoal({ dailyGoal: 4 }).dailyGoal).toBe(9);
    expect(migrateGoal({ cardDailyGoal: 0 }).dailyGoal).toBe(3);
  });

  it('leaves a fresh install on the new default', () => {
    expect(migrateGoal({})).toEqual({ goalVersion: GOAL_VERSION });
    expect(migrateSettings({})).toEqual({ goalVersion: GOAL_VERSION, cardGateCount: 0, gateVersion: GATE_VERSION });
  });
});

describe('migrateGate', () => {
  it('turns the gate off once and drops the old switch', () => {
    const out = migrateGate({ cardGateEnabled: true, cardGateCount: 2 });
    expect(out).toEqual({ cardGateCount: 0, gateVersion: GATE_VERSION });
  });

  it('keeps a count set after the migration', () => {
    expect(migrateGate({ cardGateCount: 3, gateVersion: GATE_VERSION }).cardGateCount).toBe(3);
  });

  it('runs together with the goal migration', () => {
    expect(migrateSettings({ dailyGoal: 3, cardDailyGoal: 5, cardGateEnabled: true, cardGateCount: 2 })).toEqual({
      dailyGoal: 8,
      goalVersion: GOAL_VERSION,
      cardGateCount: 0,
      gateVersion: GATE_VERSION,
    });
  });
});
