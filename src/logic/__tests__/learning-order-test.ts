import type { Difficulty } from '@/content/types';

import { learningOrder } from '../learning-order';

const algo = (id: string, difficulty: Difficulty, topicOrder: number, sortOrder: number) => ({
  id,
  difficulty,
  topicOrder,
  sortOrder,
});

const ids = (xs: { id: string }[]) => xs.map((a) => a.id);

const unlearned = [
  // A: easy ones already learned, only medium/hard left
  algo('a-hard', 'hard', 0, 0),
  algo('a-med', 'medium', 0, 1),
  // B
  algo('b-med', 'medium', 1, 0),
  algo('b-easy', 'easy', 1, 1),
  // C
  algo('c-easy1', 'easy', 2, 0),
  algo('c-easy2', 'easy', 2, 1),
];

it('takes the easiest remaining algorithm of each topic in turn', () => {
  expect(ids(learningOrder(unlearned))).toEqual(['a-med', 'b-easy', 'c-easy1', 'a-hard', 'b-med', 'c-easy2']);
});

it('starts with the topic after the most recently learned one', () => {
  expect(ids(learningOrder(unlearned, 0))).toEqual(['b-easy', 'c-easy1', 'a-med', 'b-med', 'c-easy2', 'a-hard']);
  // Wraps around after the last topic.
  expect(ids(learningOrder(unlearned, 2)).slice(0, 3)).toEqual(['a-med', 'b-easy', 'c-easy1']);
});

it('skips finished topics and handles a topic order that no longer has algorithms', () => {
  const rest = unlearned.filter((a) => a.topicOrder !== 1);
  expect(ids(learningOrder(rest, 1))).toEqual(['c-easy1', 'a-med', 'c-easy2', 'a-hard']);
});

it('does not mutate the input', () => {
  const input = [...unlearned];
  learningOrder(input, 1);
  expect(ids(input)).toEqual(ids(unlearned));
});
