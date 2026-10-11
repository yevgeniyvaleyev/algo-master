// One-off generator for the hand-written mock algorithm (phase 1).
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');

const algo = {
  slug: 'merge-sorted-array',
  leetcodeId: 88,
  title: 'Merge Sorted Array',
  difficulty: 'easy',
  group: 'Array / String',
  leetcodeUrl: 'https://leetcode.com/problems/merge-sorted-array/',
  conditionMd: `You are given two integer arrays \`nums1\` and \`nums2\`, sorted in **non-decreasing order**, and two integers \`m\` and \`n\`, representing the number of elements in \`nums1\` and \`nums2\` respectively.

**Merge** \`nums1\` and \`nums2\` into a single array sorted in **non-decreasing order**.

The final sorted array should not be returned by the function, but instead be *stored inside the array* \`nums1\`. To accommodate this, \`nums1\` has a length of \`m + n\`, where the first \`m\` elements denote the elements that should be merged, and the last \`n\` elements are set to \`0\` and should be ignored. \`nums2\` has a length of \`n\`.

**Example 1:**

\`\`\`
Input: nums1 = [1,2,3,0,0,0], m = 3, nums2 = [2,5,6], n = 3
Output: [1,2,2,3,5,6]
Explanation: The arrays we are merging are [1,2,3] and [2,5,6].
The result of the merge is [1,2,2,3,5,6] with the underlined elements coming from nums1.
\`\`\`

**Example 2:**

\`\`\`
Input: nums1 = [1], m = 1, nums2 = [], n = 0
Output: [1]
Explanation: The arrays we are merging are [1] and [].
The result of the merge is [1].
\`\`\`

**Example 3:**

\`\`\`
Input: nums1 = [0], m = 0, nums2 = [1], n = 1
Output: [1]
Explanation: The arrays we are merging are [] and [1].
The result of the merge is [1].
Note that because m = 0, there are no elements in nums1. The 0 is only there to ensure the merge result can fit in nums1.
\`\`\`

**Constraints:**

- \`nums1.length == m + n\`
- \`nums2.length == n\`
- \`0 <= m, n <= 200\`
- \`1 <= m + n <= 200\`
- \`-10^9 <= nums1[i], nums2[j] <= 10^9\`

**Follow up:** Can you come up with an algorithm that runs in \`O(m + n)\` time?`,
  descriptionRuMd: `Даны два целочисленных массива \`nums1\` и \`nums2\`, отсортированных по **неубыванию**, и два целых числа \`m\` и \`n\` — количество элементов в \`nums1\` и \`nums2\` соответственно.

**Слейте** \`nums1\` и \`nums2\` в один массив, отсортированный по **неубыванию**.

Итоговый массив не нужно возвращать из функции — его нужно *сохранить внутри массива* \`nums1\`. Для этого длина \`nums1\` равна \`m + n\`: первые \`m\` элементов — это данные для слияния, а последние \`n\` элементов равны \`0\` и должны игнорироваться. Длина \`nums2\` равна \`n\`.

**Пример 1:**

\`\`\`
Вход: nums1 = [1,2,3,0,0,0], m = 3, nums2 = [2,5,6], n = 3
Выход: [1,2,2,3,5,6]
Пояснение: сливаем массивы [1,2,3] и [2,5,6].
\`\`\`

**Пример 2:**

\`\`\`
Вход: nums1 = [1], m = 1, nums2 = [], n = 0
Выход: [1]
\`\`\`

**Пример 3:**

\`\`\`
Вход: nums1 = [0], m = 0, nums2 = [1], n = 1
Выход: [1]
Пояснение: m = 0, поэтому в nums1 нет элементов. 0 нужен лишь для того, чтобы результат поместился в nums1.
\`\`\`

**Ограничения:**

- \`nums1.length == m + n\`
- \`nums2.length == n\`
- \`0 <= m, n <= 200\`
- \`1 <= m + n <= 200\`
- \`-10^9 <= nums1[i], nums2[j] <= 10^9\`

**Дополнительно:** можно ли решить задачу за \`O(m + n)\`?`,
  solutionTs: `/**
 Do not return anything, modify nums1 in-place instead.
 */
function merge(nums1: number[], m: number, nums2: number[], n: number): void {
  // Три указателя: конец полезной части nums1, конец nums2 и позиция записи
  let i = m - 1;
  let j = n - 1;
  let write = m + n - 1;

  // Идём с конца: самый большой элемент сразу встаёт на своё место,
  // поэтому мы никогда не затираем ещё не обработанные элементы nums1
  while (j >= 0) {
    if (i >= 0 && nums1[i] > nums2[j]) {
      // Элемент из nums1 больше — переносим его в конец
      nums1[write] = nums1[i];
      i--;
    } else {
      // Иначе берём элемент из nums2 (при равенстве тоже из nums2 — порядок не важен)
      nums1[write] = nums2[j];
      j--;
    }
    write--;
  }

  // Если в nums1 остались элементы — они уже на своих местах, ничего делать не нужно
}

// Время: O(m + n) — каждый элемент рассматривается один раз
// Память: O(1) — сливаем прямо в nums1
`,
  ideaRuMd: `### Идея: два указателя с конца

Наивный способ — дописать \`nums2\` в конец \`nums1\` и отсортировать: \`O((m+n) log(m+n))\`. Но оба массива **уже отсортированы**, поэтому их можно слить за линейное время, как в merge sort.

Проблема: если сливать **с начала**, мы затрём элементы \`nums1\`, которые ещё не обработаны. Значит, нужен дополнительный массив.

Ключевое наблюдение: в конце \`nums1\` есть **n свободных ячеек**. Если заполнять результат **с конца**, начиная с наибольших элементов, позиция записи \`write\` всегда остаётся правее (или совпадает с) указателем \`i\` — затирать нечего.

**Алгоритм:**

1. \`i = m - 1\`, \`j = n - 1\`, \`write = m + n - 1\`.
2. Пока \`j >= 0\`: кладём в \`nums1[write]\` больший из \`nums1[i]\` и \`nums2[j]\`, сдвигаем соответствующий указатель и \`write\`.
3. Когда \`nums2\` закончился — остаток \`nums1\` уже стоит на месте.

**Сложность:** время \`O(m + n)\`, память \`O(1)\`.`,
  theory: { topicKey: 'two-pointers', titleRu: 'Два указателя' },
};

const theory = {
  key: 'two-pointers',
  titleRu: 'Два указателя',
  bodyMd: `## Два указателя (Two Pointers)

Техника, при которой по массиву (или двум массивам) одновременно двигаются **два индекса**. Позволяет заменить вложенные циклы \`O(n²)\` одним проходом \`O(n)\`.

### Основные варианты

- **Навстречу друг другу** — \`left = 0\`, \`right = n - 1\`, сдвигаем в зависимости от условия. Примеры: проверка палиндрома, Two Sum в отсортированном массиве, Container With Most Water.
- **В одном направлении (быстрый и медленный)** — \`slow\` указывает, куда писать, \`fast\` читает. Примеры: удаление дубликатов, Remove Element, Move Zeroes.
- **По двум массивам** — по указателю на каждый массив, как в слиянии merge sort. Пример: Merge Sorted Array.

### Когда применять

- Массив **отсортирован** (или его можно отсортировать).
- Нужно найти пару/тройку элементов с условием на сумму.
- Нужно модифицировать массив **in-place** за \`O(1)\` памяти.

### Шаблон

\`\`\`ts
let left = 0;
let right = arr.length - 1;
while (left < right) {
  if (условие) left++;
  else right--;
}
\`\`\`

**Сложность:** обычно \`O(n)\` время, \`O(1)\` память.`,
};

fs.writeFileSync(path.join(root, 'data/algos/merge-sorted-array.json'), JSON.stringify(algo, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'data/theory/two-pointers.json'), JSON.stringify(theory, null, 2) + '\n');
console.log('mock content written');
