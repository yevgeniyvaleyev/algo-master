import { cardsWord, GATE_AWAY_MS, isStudyLink, shouldGate } from '../card-gate';

describe('shouldGate', () => {
  it('gates a cold start and a long absence', () => {
    expect(shouldGate({ count: 2, deckSize: 3, awayMs: Infinity })).toBe(true);
    expect(shouldGate({ count: 2, deckSize: 3, awayMs: GATE_AWAY_MS })).toBe(true);
  });

  it('lets short app switches through', () => {
    expect(shouldGate({ count: 2, deckSize: 3, awayMs: GATE_AWAY_MS - 1 })).toBe(false);
  });

  it('is off at 0 cards or without any cards', () => {
    expect(shouldGate({ count: 0, deckSize: 3, awayMs: Infinity })).toBe(false);
    expect(shouldGate({ count: 2, deckSize: 0, awayMs: Infinity })).toBe(false);
  });
});

describe('isStudyLink', () => {
  it('recognizes algorithm and card deep links', () => {
    expect(isStudyLink('algomaster://algo/two-sum')).toBe(true);
    expect(isStudyLink('algomaster:///algo/two-sum?x=1')).toBe(true);
    expect(isStudyLink('algomaster://cards')).toBe(true);
    expect(isStudyLink('algomaster:///cards/')).toBe(true);
  });

  it('ignores other links and none', () => {
    expect(isStudyLink('algomaster://cardsx')).toBe(false);
    expect(isStudyLink('algomaster://history')).toBe(false);
    expect(isStudyLink('algomaster://algo/')).toBe(false);
    expect(isStudyLink(null)).toBe(false);
    expect(isStudyLink('exp://192.168.1.2:8081')).toBe(false);
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
