import { cardsWord, GATE_AWAY_MS, isAlgoLink, shouldGate } from '../card-gate';

describe('shouldGate', () => {
  it('gates a cold start and a long absence', () => {
    expect(shouldGate({ enabled: true, deckSize: 3, awayMs: Infinity })).toBe(true);
    expect(shouldGate({ enabled: true, deckSize: 3, awayMs: GATE_AWAY_MS })).toBe(true);
  });

  it('lets short app switches through', () => {
    expect(shouldGate({ enabled: true, deckSize: 3, awayMs: GATE_AWAY_MS - 1 })).toBe(false);
  });

  it('is off when disabled or there are no cards', () => {
    expect(shouldGate({ enabled: false, deckSize: 3, awayMs: Infinity })).toBe(false);
    expect(shouldGate({ enabled: true, deckSize: 0, awayMs: Infinity })).toBe(false);
  });
});

describe('isAlgoLink', () => {
  it('recognizes algorithm deep links', () => {
    expect(isAlgoLink('algomaster://algo/two-sum')).toBe(true);
    expect(isAlgoLink('algomaster:///algo/two-sum?x=1')).toBe(true);
  });

  it('ignores other links and none', () => {
    expect(isAlgoLink('algomaster://cards')).toBe(false);
    expect(isAlgoLink('algomaster://algo/')).toBe(false);
    expect(isAlgoLink(null)).toBe(false);
    expect(isAlgoLink('exp://192.168.1.2:8081')).toBe(false);
  });
});

it('declines «карточка» after a number', () => {
  expect([1, 2, 5, 11, 21, 22].map(cardsWord)).toEqual([
    'карточку',
    'карточки',
    'карточек',
    'карточек',
    'карточку',
    'карточки',
  ]);
});
