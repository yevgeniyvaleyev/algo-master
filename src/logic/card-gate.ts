/**
 * Card gate («Карточки при входе», 0 = off, the default): before the app can be used, N flash cards must be answered
 * (✓ or ✗). It opens on
 * a cold start and when the app returns after GATE_AWAY_MS in the background; links that open an algorithm (the study
 * alarm's «Начать») skip it.
 */
export const GATE_AWAY_MS = 10 * 60_000;

export function shouldGate({
  count,
  deckSize,
  awayMs,
}: {
  /** «Карточки при входе»: cards to answer; 0 = off. */
  count: number;
  /** Learned algorithms (flash cards); without any there is nothing to answer. */
  deckSize: number;
  /** Time spent outside the app; Infinity on a cold start. */
  awayMs: number;
}): boolean {
  return count > 0 && deckSize > 0 && awayMs >= GATE_AWAY_MS;
}

/**
 * True for the study alarm's deep links: an algorithm screen (`algomaster://algo/two-sum`) or the «Карточки» tab
 * (`algomaster://cards`).
 */
export function isStudyLink(url: string | null | undefined): boolean {
  return url != null && /^[a-z][a-z0-9+.-]*:\/\/\/?(algo\/[^/?#]+|cards\/?(?:[?#]|$))/i.test(url);
}

/** «ответь на 1 карточку / 2 карточки / 5 карточек». */
export function cardsWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'карточку';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'карточки';
  return 'карточек';
}
