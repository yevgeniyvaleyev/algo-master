import type { Difficulty } from '@/content/types';

import { learningOrder } from '../learning-order';

const algo = (id: string, difficulty: Difficulty, topicOrder: number, sortOrder: number) => ({
  id,
  difficulty,
  topicOrder,
  sortOrder,
});

it('goes easy → medium → hard, interleaving topics within each difficulty', () => {
  const algos = [
    algo('t0-hard', 'hard', 0, 0),
    algo('t0-easy1', 'easy', 0, 1),
    algo('t0-easy2', 'easy', 0, 2),
    algo('t0-med', 'medium', 0, 3),
    algo('t1-easy1', 'easy', 1, 0),
    algo('t1-med1', 'medium', 1, 1),
    algo('t1-med2', 'medium', 1, 2),
    algo('t2-easy1', 'easy', 2, 0),
  ];
  expect(learningOrder(algos).map((a) => a.id)).toEqual([
    't0-easy1',
    't1-easy1',
    't2-easy1',
    't0-easy2',
    't0-med',
    't1-med1',
    't1-med2',
    't0-hard',
  ]);
});

it('does not mutate the input', () => {
  const algos = [algo('b', 'hard', 0, 0), algo('a', 'easy', 0, 1)];
  learningOrder(algos);
  expect(algos.map((a) => a.id)).toEqual(['b', 'a']);
});
