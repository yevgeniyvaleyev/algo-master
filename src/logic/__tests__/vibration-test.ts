import { alarmWaveform, channelId, VIBRATIONS, vibrationFor, vibrationOptions } from '../vibration';

describe('VIBRATIONS', () => {
  it('has wait-first patterns of positive durations', () => {
    for (const v of VIBRATIONS) {
      if (v.pattern == null || v.pattern.length === 0) continue;
      expect(v.pattern[0]).toBe(0);
      expect(v.pattern.slice(1).every((ms) => ms > 0)).toBe(true);
    }
  });

  it('keeps the alarm pattern used before the setting existed', () => {
    expect(vibrationFor('standard', 'alarm').pattern).toEqual([0, 800, 400, 800, 400]);
  });

  it('spells SOS as three short, three long, three short', () => {
    const on = vibrationFor('sos', 'alarm').pattern!.filter((_, i) => i % 2 === 1);
    expect(on).toEqual([150, 150, 150, 450, 450, 450, 150, 150, 150]);
  });
});

describe('vibrationFor', () => {
  it('falls back to the default of the kind', () => {
    expect(vibrationFor('nope', 'reminder').key).toBe('system');
    expect(vibrationFor('nope', 'alarm').key).toBe('standard');
    expect(vibrationFor('system', 'alarm').key).toBe('standard');
  });

  it('turns vibration off with an empty pattern', () => {
    expect(vibrationFor('off', 'reminder').pattern).toEqual([]);
  });
});

describe('vibrationOptions', () => {
  it('offers the system default only for reminders', () => {
    expect(vibrationOptions('reminder').some((v) => v.key === 'system')).toBe(true);
    expect(vibrationOptions('alarm').some((v) => v.key === 'system')).toBe(false);
  });
});

describe('channelId', () => {
  it('keeps the plain id for the system default', () => {
    expect(channelId('reminders', 'system')).toBe('reminders');
    expect(channelId('reminders', 'double')).toBe('reminders-double');
  });
});

describe('alarmWaveform', () => {
  const standard = [0, 800, 400, 800, 400];
  const short = [0, 250];

  it('plays the pattern once without looping', () => {
    expect(alarmWaveform(standard, 'once', 3)).toEqual({ timings: standard, repeat: -1 });
  });

  it('repeats a cycle a given number of times, clamped to 2–10', () => {
    expect(alarmWaveform(short, 'times', 3)).toEqual({ timings: [0, 250, 300, 250, 300, 250, 300], repeat: -1 });
    expect(alarmWaveform(short, 'times', 50).timings).toHaveLength(21);
    expect(alarmWaveform(short, 'times', 1).timings).toHaveLength(5);
  });

  it('keeps vibrations at odd positions across repeats', () => {
    const { timings } = alarmWaveform([0, 800, 400, 800, 400], 'times', 3);
    expect(timings.filter((_, i) => i % 2 === 1)).toEqual([800, 800, 800, 800, 800, 800]);
    expect(timings.filter((_, i) => i % 2 === 0)).toEqual([0, 400, 400, 400, 400, 400, 400]);
  });

  it('loops from the start, keeping a pattern’s own trailing wait', () => {
    expect(alarmWaveform(standard, 'loop', 3)).toEqual({ timings: standard, repeat: 0 });
    expect(alarmWaveform(short, 'loop', 3)).toEqual({ timings: [0, 250, 300], repeat: 0 });
  });

  it('pauses 5 s between repeats', () => {
    expect(alarmWaveform(standard, 'loopPause', 3)).toEqual({ timings: [0, 800, 400, 800, 5000], repeat: 0 });
    expect(alarmWaveform(short, 'loopPause', 3)).toEqual({ timings: [0, 250, 5000], repeat: 0 });
  });

  it('stays silent without a pattern', () => {
    expect(alarmWaveform([], 'loop', 3)).toEqual({ timings: [], repeat: -1 });
  });
});
