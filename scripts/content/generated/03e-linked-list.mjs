// Batch 03e: Linked List (medium/hard) + LRU Cache.
// Apply with: node scripts/content/apply.mjs scripts/content/generated/03e-linked-list.mjs

const LINKED_LIST = { topicKey: 'linked-list', titleRu: 'Связный список' };
const TWO_POINTERS = { topicKey: 'two-pointers', titleRu: 'Два указателя' };

const L = (args, expected, extra = {}) => ({ args, expected, resultType: 'list', ...extra });

export const theory = [];

export const algos = {
  'add-two-numbers': {
    theory: LINKED_LIST,
    descriptionRuMd: `Даны два **непустых** связных списка, представляющих два неотрицательных целых числа. Цифры хранятся в **обратном порядке**, и каждый узел содержит одну цифру. Сложите два числа и верните сумму в виде связного списка.

Можно считать, что числа не содержат ведущих нулей, кроме самого числа 0.

**Пример 1:**

![](https://assets.leetcode.com/uploads/2020/10/02/addtwonumber1.jpg)

\`\`\`
Вход: l1 = [2,4,3], l2 = [5,6,4]
Выход: [7,0,8]
Пояснение: 342 + 465 = 807.
\`\`\`

**Пример 2:**

\`\`\`
Вход: l1 = [0], l2 = [0]
Выход: [0]
\`\`\`

**Пример 3:**

\`\`\`
Вход: l1 = [9,9,9,9,9,9,9], l2 = [9,9,9,9]
Выход: [8,9,9,9,0,0,0,1]
\`\`\`

**Ограничения:**

- Количество узлов в каждом списке — в диапазоне \`[1, 100]\`.
- \`0 <= Node.val <= 9\`
- Гарантируется, что список представляет число без ведущих нулей.`,
    solutionTs: `/**
 * Definition for singly-linked list.
 * class ListNode {
 *     val: number
 *     next: ListNode | null
 *     constructor(val?: number, next?: ListNode | null)
 * }
 */

function addTwoNumbers(l1: ListNode | null, l2: ListNode | null): ListNode | null {
  // Фиктивная голова — не нужно отдельно создавать первый узел ответа
  const dummy = new ListNode(0);
  let tail = dummy;
  let carry = 0; // перенос в следующий разряд (0 или 1)

  // Идём, пока есть цифры хотя бы в одном списке или остался перенос
  while (l1 !== null || l2 !== null || carry > 0) {
    // Отсутствующая цифра более короткого числа считается нулём
    const sum = (l1?.val ?? 0) + (l2?.val ?? 0) + carry;

    carry = Math.floor(sum / 10);
    tail.next = new ListNode(sum % 10); // в разряд идёт последняя цифра суммы
    tail = tail.next;

    l1 = l1?.next ?? null;
    l2 = l2?.next ?? null;
  }

  return dummy.next;
}

// Время: O(max(n, m)) — один проход по обоим спискам
// Память: O(1) дополнительно (не считая самого ответа)`,
    ideaRuMd: `### Идея: сложение «в столбик»

Цифры хранятся **в обратном порядке** — голова списка это младший разряд. Именно с младших разрядов и начинается сложение в столбик, поэтому списки можно просто идти параллельно слева направо.

1. Заводим \`dummy\` и \`tail\` для сборки ответа, \`carry = 0\`.
2. На каждом шаге: \`sum = d1 + d2 + carry\`, где отсутствующая цифра (один список кончился) — \`0\`.
3. В ответ пишем \`sum % 10\`, перенос — \`Math.floor(sum / 10)\`.
4. Цикл крутится, пока есть цифры **или перенос**: иначе потеряем старшую единицу, как в \`99 + 1 = 100\`.

Переводить списки в числа нельзя: до 100 цифр не помещаются в \`number\` (а \`BigInt\` здесь — обход сути задачи).

**Сложность:** время \`O(max(n, m))\`, дополнительная память \`O(1)\`.`,
    fn: 'addTwoNumbers',
    tests: [
      L([[2, 4, 3], [5, 6, 4]], [7, 0, 8], { argTypes: ['list', 'list'] }),
      L([[0], [0]], [0], { argTypes: ['list', 'list'] }),
      L([[9, 9, 9, 9, 9, 9, 9], [9, 9, 9, 9]], [8, 9, 9, 9, 0, 0, 0, 1], { argTypes: ['list', 'list'] }),
      L([[5], [5]], [0, 1], { argTypes: ['list', 'list'] }),
      L([[1, 8], [0]], [1, 8], { argTypes: ['list', 'list'] }),
    ],
  },

  'copy-list-with-random-pointer': {
    theory: LINKED_LIST,
    descriptionRuMd: `Дан связный список длины \`n\`, в котором каждый узел содержит дополнительный указатель \`random\`. Он может указывать на любой узел списка или быть \`null\`.

Постройте [**глубокую копию**](https://en.wikipedia.org/wiki/Object_copying#Deep_copy) списка. Глубокая копия должна состоять ровно из \`n\` **совершенно новых** узлов, значение каждого из которых равно значению соответствующего исходного узла. Указатели \`next\` и \`random\` новых узлов должны указывать на новые узлы скопированного списка так, чтобы указатели в исходном и скопированном списках описывали одно и то же состояние списка. **Ни один указатель в новом списке не должен указывать на узлы исходного списка.**

Например, если в исходном списке есть узлы \`X\` и \`Y\` и \`X.random --> Y\`, то для соответствующих узлов \`x\` и \`y\` копии должно выполняться \`x.random --> y\`.

Верните _голову скопированного списка_.

Во входных и выходных данных список представлен как массив из \`n\` узлов. Каждый узел — пара \`[val, random_index]\`, где:

- \`val\` — целое число \`Node.val\`;
- \`random_index\` — индекс узла (от \`0\` до \`n-1\`), на который указывает \`random\`, или \`null\`, если указатель никуда не указывает.

Ваш код получает **только** голову \`head\` исходного списка.

**Пример 1:**

![](https://assets.leetcode.com/uploads/2019/12/18/e1.png)

\`\`\`
Вход: head = [[7,null],[13,0],[11,4],[10,2],[1,0]]
Выход: [[7,null],[13,0],[11,4],[10,2],[1,0]]
\`\`\`

**Пример 2:**

![](https://assets.leetcode.com/uploads/2019/12/18/e2.png)

\`\`\`
Вход: head = [[1,1],[2,1]]
Выход: [[1,1],[2,1]]
\`\`\`

**Пример 3:**

![](https://assets.leetcode.com/uploads/2019/12/18/e3.png)

\`\`\`
Вход: head = [[3,null],[3,0],[3,null]]
Выход: [[3,null],[3,0],[3,null]]
\`\`\`

**Ограничения:**

- \`0 <= n <= 1000\`
- \`-10^4 <= Node.val <= 10^4\`
- \`Node.random\` равен \`null\` или указывает на какой-то узел списка.`,
    solutionTs: `/**
 * Definition for _Node.
 * class _Node {
 *     val: number
 *     next: _Node | null
 *     random: _Node | null
 *     constructor(val?: number, next?: _Node, random?: _Node)
 * }
 */

function copyRandomList(head: _Node | null): _Node | null {
  if (head === null) return null;

  // Шаг 1. Вставляем копию сразу после каждого узла:
  // A -> B -> C  превращается в  A -> A' -> B -> B' -> C -> C'
  let cur: _Node | null = head;
  while (cur !== null) {
    const copy: _Node = new _Node(cur.val, cur.next);
    cur.next = copy;
    cur = copy.next;
  }

  // Шаг 2. Проставляем random у копий.
  // Копия узла X всегда лежит в X.next, поэтому копия X.random — это X.random.next
  cur = head;
  while (cur !== null) {
    const copy: _Node = cur.next!;
    copy.random = cur.random !== null ? cur.random.next : null;
    cur = copy.next;
  }

  // Шаг 3. Расплетаем списки обратно: исходный восстанавливаем, копию собираем отдельно
  const newHead: _Node = head.next!;
  cur = head;
  while (cur !== null) {
    const copy: _Node = cur.next!;
    cur.next = copy.next; // возвращаем исходную связь
    copy.next = copy.next !== null ? copy.next.next : null; // копия -> следующая копия
    cur = cur.next;
  }

  return newHead;
}

// Время: O(n) — три линейных прохода
// Память: O(1) дополнительно (не считая самих копий)`,
    ideaRuMd: `### Проблема

Скопировать \`val\` и \`next\` легко. Сложность в \`random\`: когда мы копируем узел, его \`random\` может указывать на узел, копии которого ещё нет. Нужен способ по исходному узлу быстро находить **его копию**.

### Вариант 1: хеш-таблица (проще)

1. Первый проход: \`map.set(old, new _Node(old.val))\` для каждого узла.
2. Второй проход: \`copy.next = map.get(old.next)\`, \`copy.random = map.get(old.random)\`.

Время \`O(n)\`, память \`O(n)\` на таблицу.

### Вариант 2: переплетение (память O(1))

Вместо таблицы храним копию **прямо за оригиналом**: \`A -> A' -> B -> B' -> ...\`. Тогда «копия узла X» — это просто \`X.next\`.

1. **Вставка копий.** Для каждого \`X\` создаём \`X'\` и вставляем между \`X\` и \`X.next\`.
2. **random.** \`X'.random = X.random?.next\` — копия того узла, на который указывал \`X.random\`.
3. **Расплетание.** Восстанавливаем \`X.next = X'.next\` и связываем копии: \`X'.next = X'.next?.next\`.

Исходный список после третьего шага возвращается в первоначальное состояние — это важно, LeetCode его проверяет.

### Краевые случаи

- Пустой список — сразу \`null\`.
- \`random\` указывает на сам узел (\`[[1,0]]\`) — формула \`X.random.next\` даёт \`X'\`, всё корректно.

**Сложность:** время \`O(n)\`, дополнительная память \`O(1)\`.`,
    prelude: `class _Node {
  constructor(val, next, random) {
    this.val = val === undefined ? 0 : val;
    this.next = next === undefined ? null : next;
    this.random = random === undefined ? null : random;
  }
}`,
    harness: `function __run(pairs) {
  const nodes = pairs.map(([v]) => new _Node(v));
  nodes.forEach((n, i) => {
    n.next = nodes[i + 1] ?? null;
    n.random = pairs[i][1] === null ? null : nodes[pairs[i][1]];
  });
  const original = new Set(nodes);
  const head = copyRandomList(nodes[0] ?? null);
  // Исходный список должен остаться нетронутым
  for (let i = 0; i < nodes.length; i++) {
    const r = pairs[i][1] === null ? null : nodes[pairs[i][1]];
    if (nodes[i].next !== (nodes[i + 1] ?? null) || nodes[i].random !== r || nodes[i].val !== pairs[i][0]) return 'ORIGINAL_MODIFIED';
  }
  const copy = [];
  for (let n = head; n && copy.length <= nodes.length; n = n.next) {
    if (original.has(n)) return 'SHARES_NODES';
    copy.push(n);
  }
  const index = new Map(copy.map((n, i) => [n, i]));
  return copy.map((n) => [n.val, n.random === null ? null : index.has(n.random) ? index.get(n.random) : 'OUTSIDE']);
}`,
    tests: [
      { args: [[[7, null], [13, 0], [11, 4], [10, 2], [1, 0]]], expected: [[7, null], [13, 0], [11, 4], [10, 2], [1, 0]] },
      { args: [[[1, 1], [2, 1]]], expected: [[1, 1], [2, 1]] },
      { args: [[[3, null], [3, 0], [3, null]]], expected: [[3, null], [3, 0], [3, null]] },
      { args: [[]], expected: [] },
      { args: [[[1, 0]]], expected: [[1, 0]] },
    ],
  },

  'reverse-linked-list-ii': {
    theory: LINKED_LIST,
    descriptionRuMd: `Дана голова \`head\` односвязного списка и два целых числа \`left\` и \`right\`, где \`left <= right\`. Разверните узлы списка с позиции \`left\` по позицию \`right\` и верните _получившийся список_.

**Пример 1:**

![](https://assets.leetcode.com/uploads/2021/02/19/rev2ex2.jpg)

\`\`\`
Вход: head = [1,2,3,4,5], left = 2, right = 4
Выход: [1,4,3,2,5]
\`\`\`

**Пример 2:**

\`\`\`
Вход: head = [5], left = 1, right = 1
Выход: [5]
\`\`\`

**Ограничения:**

- Количество узлов в списке — \`n\`.
- \`1 <= n <= 500\`
- \`-500 <= Node.val <= 500\`
- \`1 <= left <= right <= n\`

**Дополнительно:** сможете сделать это за один проход?`,
    solutionTs: `/**
 * Definition for singly-linked list.
 * class ListNode {
 *     val: number
 *     next: ListNode | null
 *     constructor(val?: number, next?: ListNode | null)
 * }
 */

function reverseBetween(head: ListNode | null, left: number, right: number): ListNode | null {
  // Заглушка нужна, если разворот начинается с первого узла (left = 1)
  const dummy = new ListNode(0, head);

  // prev — узел прямо перед отрезком [left, right]
  let prev: ListNode = dummy;
  for (let i = 1; i < left; i++) prev = prev.next!;

  // start — первый узел отрезка; после разворота он окажется в его конце
  const start: ListNode = prev.next!;

  // Вставка в голову: (right - left) раз берём узел сразу после start
  // и переносим его в начало отрезка (сразу после prev)
  for (let i = 0; i < right - left; i++) {
    const moved = start.next!;
    start.next = moved.next; // вынимаем moved из цепочки
    moved.next = prev.next; // moved указывает на текущее начало отрезка
    prev.next = moved; // moved становится новым началом
  }

  return dummy.next;
}

// Время: O(n) — один проход
// Память: O(1)`,
    ideaRuMd: `### Идея: вставка в голову отрезка за один проход

1. Заводим \`dummy\` перед головой — тогда случай \`left = 1\` не особый.
2. Доходим до \`prev\` — узла **перед** отрезком.
3. \`start = prev.next\` — первый узел отрезка. Он так и остаётся на месте в цепочке, а остальные узлы отрезка по одному «перепрыгивают» в начало.
4. Повторяем \`right - left\` раз: берём \`moved = start.next\`, вынимаем его и вставляем сразу после \`prev\`.

Пример для \`[1,2,3,4,5]\`, \`left = 2\`, \`right = 4\` (\`prev = 1\`, \`start = 2\`):

\`\`\`
1 -> 2 -> 3 -> 4 -> 5
1 -> 3 -> 2 -> 4 -> 5   (перенесли 3)
1 -> 4 -> 3 -> 2 -> 5   (перенесли 4)
\`\`\`

\`start\` сам «сползает» к концу отрезка и всегда указывает на остаток списка — поэтому стыковка с хвостом получается автоматически.

### Альтернатива

Найти границы отрезка, развернуть его стандартным разворотом (\`prev/curr/next\`) и пришить концы обратно. Тоже \`O(n)\`, но больше указателей, которые легко перепутать.

**Сложность:** время \`O(n)\`, память \`O(1)\`.`,
    fn: 'reverseBetween',
    tests: [
      L([[1, 2, 3, 4, 5], 2, 4], [1, 4, 3, 2, 5], { argTypes: ['list'] }),
      L([[5], 1, 1], [5], { argTypes: ['list'] }),
      L([[3, 5], 1, 2], [5, 3], { argTypes: ['list'] }),
      L([[1, 2, 3, 4, 5], 1, 5], [5, 4, 3, 2, 1], { argTypes: ['list'] }),
      L([[1, 2, 3, 4, 5], 3, 3], [1, 2, 3, 4, 5], { argTypes: ['list'] }),
    ],
  },

  'reverse-nodes-in-k-group': {
    theory: LINKED_LIST,
    descriptionRuMd: `Дана голова \`head\` связного списка. Разворачивайте узлы списка группами по \`k\` и верните _изменённый список_.

\`k\` — положительное целое число, не превосходящее длину списка. Если количество узлов не кратно \`k\`, оставшиеся в конце узлы должны остаться как есть.

Менять значения в узлах нельзя — можно менять только сами узлы (их связи).

**Пример 1:**

![](https://assets.leetcode.com/uploads/2020/10/03/reverse_ex1.jpg)

\`\`\`
Вход: head = [1,2,3,4,5], k = 2
Выход: [2,1,4,3,5]
\`\`\`

**Пример 2:**

![](https://assets.leetcode.com/uploads/2020/10/03/reverse_ex2.jpg)

\`\`\`
Вход: head = [1,2,3,4,5], k = 3
Выход: [3,2,1,4,5]
\`\`\`

**Ограничения:**

- Количество узлов в списке — \`n\`.
- \`1 <= k <= n <= 5000\`
- \`0 <= Node.val <= 1000\`

**Дополнительно:** сможете решить задачу с \`O(1)\` дополнительной памяти?`,
    solutionTs: `/**
 * Definition for singly-linked list.
 * class ListNode {
 *     val: number
 *     next: ListNode | null
 *     constructor(val?: number, next?: ListNode | null)
 * }
 */

function reverseKGroup(head: ListNode | null, k: number): ListNode | null {
  const dummy = new ListNode(0, head);
  // groupPrev — последний узел уже обработанной части (перед текущей группой)
  let groupPrev: ListNode = dummy;

  while (true) {
    // Ищем k-й узел группы; если узлов меньше k — остаток не трогаем
    let kth: ListNode | null = groupPrev;
    for (let i = 0; i < k && kth !== null; i++) kth = kth.next;
    if (kth === null) break;

    const groupNext = kth.next; // первый узел следующей группы

    // Разворачиваем группу. Начинаем с prev = groupNext,
    // чтобы бывший первый узел сразу указал на следующую группу
    let prev: ListNode | null = groupNext;
    let curr: ListNode | null = groupPrev.next;
    while (curr !== groupNext) {
      const next: ListNode | null = curr!.next;
      curr!.next = prev;
      prev = curr;
      curr = next;
    }

    // Бывший первый узел группы теперь её хвост
    const groupTail = groupPrev.next!;
    groupPrev.next = kth; // k-й узел стал началом группы
    groupPrev = groupTail; // следующая группа пришивается к хвосту
  }

  return dummy.next;
}

// Время: O(n) — каждый узел посещается константное число раз
// Память: O(1)`,
    ideaRuMd: `### Идея: разворот по группам с заглушкой

Обобщение обычного разворота списка: режем список на куски по \`k\` и разворачиваем каждый на месте.

Состояние — \`groupPrev\`: узел **перед** текущей группой (вначале \`dummy\`).

1. От \`groupPrev\` делаем \`k\` шагов и находим \`kth\` — последний узел группы. Если дошли до \`null\` — узлов меньше \`k\`, выходим (хвост остаётся как есть).
2. Запоминаем \`groupNext = kth.next\`.
3. Разворачиваем узлы от \`groupPrev.next\` до \`groupNext\` (не включая). Трюк: начальное \`prev = groupNext\` — тогда бывший первый узел группы после разворота сразу указывает на следующую группу.
4. Пришиваем: \`groupPrev.next = kth\`, а \`groupPrev\` переносим на бывший первый узел (теперь хвост группы).

### Почему O(1) памяти

Рекурсивное решение (развернуть первые \`k\`, рекурсивно обработать остаток) короче, но тратит \`O(n/k)\` на стек. Итеративный вариант с \`groupPrev\` отвечает на follow-up.

### Краевые случаи

- \`k = 1\` — список не меняется.
- \`n\` кратно \`k\` — разворачиваются все группы.

**Сложность:** время \`O(n)\` (каждый узел проходится при поиске \`kth\` и при развороте), память \`O(1)\`.`,
    fn: 'reverseKGroup',
    tests: [
      L([[1, 2, 3, 4, 5], 2], [2, 1, 4, 3, 5], { argTypes: ['list'] }),
      L([[1, 2, 3, 4, 5], 3], [3, 2, 1, 4, 5], { argTypes: ['list'] }),
      L([[1, 2, 3, 4, 5], 1], [1, 2, 3, 4, 5], { argTypes: ['list'] }),
      L([[1, 2, 3, 4, 5, 6], 3], [3, 2, 1, 6, 5, 4], { argTypes: ['list'] }),
      L([[1, 2], 2], [2, 1], { argTypes: ['list'] }),
    ],
  },

  'remove-nth-node-from-end-of-list': {
    theory: TWO_POINTERS,
    descriptionRuMd: `Дана голова \`head\` связного списка. Удалите \`n\`-й с конца узел списка и верните его голову.

**Пример 1:**

![](https://assets.leetcode.com/uploads/2020/10/03/remove_ex1.jpg)

\`\`\`
Вход: head = [1,2,3,4,5], n = 2
Выход: [1,2,3,5]
\`\`\`

**Пример 2:**

\`\`\`
Вход: head = [1], n = 1
Выход: []
\`\`\`

**Пример 3:**

\`\`\`
Вход: head = [1,2], n = 1
Выход: [1]
\`\`\`

**Ограничения:**

- Количество узлов в списке — \`sz\`.
- \`1 <= sz <= 30\`
- \`0 <= Node.val <= 100\`
- \`1 <= n <= sz\`

**Дополнительно:** сможете сделать это за один проход?`,
    solutionTs: `/**
 * Definition for singly-linked list.
 * class ListNode {
 *     val: number
 *     next: ListNode | null
 *     constructor(val?: number, next?: ListNode | null)
 * }
 */

function removeNthFromEnd(head: ListNode | null, n: number): ListNode | null {
  // Заглушка: удаление самой головы не требует особого случая
  const dummy = new ListNode(0, head);
  let fast: ListNode | null = dummy;
  let slow: ListNode = dummy;

  // Уводим fast на n + 1 шаг вперёд: между slow и fast будет ровно n узлов
  for (let i = 0; i <= n; i++) fast = fast!.next;

  // Двигаем оба, пока fast не выйдет за конец списка
  while (fast !== null) {
    fast = fast.next;
    slow = slow.next!;
  }

  // slow стоит прямо перед удаляемым узлом — перешагиваем через него
  slow.next = slow.next!.next;

  return dummy.next;
}

// Время: O(sz) — один проход
// Память: O(1)`,
    ideaRuMd: `### Идея: два указателя с отставанием

Простой вариант — два прохода: посчитать длину \`sz\`, затем удалить узел номер \`sz - n\` с начала.

**За один проход:**

1. Ставим \`dummy\` перед головой, оба указателя \`fast\` и \`slow\` — на \`dummy\`.
2. Двигаем \`fast\` на \`n + 1\` шаг вперёд.
3. Двигаем оба указателя, пока \`fast !== null\`. Расстояние между ними сохраняется, и когда \`fast\` вышел за конец, \`slow\` стоит **ровно перед** \`n\`-м с конца узлом.
4. \`slow.next = slow.next.next\`.

Почему \`n + 1\`, а не \`n\`: чтобы удалить узел, нужен его **предшественник**.

Заглушка нужна для случая, когда удаляется сама голова (\`n = sz\`): тогда \`slow\` останется на \`dummy\`, и ответом станет \`dummy.next\`.

**Сложность:** время \`O(sz)\`, память \`O(1)\`.`,
    fn: 'removeNthFromEnd',
    tests: [
      L([[1, 2, 3, 4, 5], 2], [1, 2, 3, 5], { argTypes: ['list'] }),
      L([[1], 1], [], { argTypes: ['list'] }),
      L([[1, 2], 1], [1], { argTypes: ['list'] }),
      L([[1, 2], 2], [2], { argTypes: ['list'] }),
      L([[1, 2, 3, 4, 5], 5], [2, 3, 4, 5], { argTypes: ['list'] }),
    ],
  },

  'remove-duplicates-from-sorted-list-ii': {
    theory: LINKED_LIST,
    descriptionRuMd: `Дана голова \`head\` **отсортированного** связного списка.

Удалите все узлы, значения которых **повторяются**, оставив только **уникальные** числа исходного списка.

Верните список, тоже **отсортированный**.

**Пример 1:**

![](https://assets.leetcode.com/uploads/2021/01/04/linkedlist1.jpg)

\`\`\`
Вход: head = [1,2,3,3,4,4,5]
Выход: [1,2,5]
\`\`\`

**Пример 2:**

![](https://assets.leetcode.com/uploads/2021/01/04/linkedlist2.jpg)

\`\`\`
Вход: head = [1,1,1,2,3]
Выход: [2,3]
\`\`\`

**Ограничения:**

- Количество узлов в списке — в диапазоне \`[0, 300]\`.
- \`-100 <= Node.val <= 100\`
- Гарантируется, что список **отсортирован** по возрастанию.`,
    solutionTs: `/**
 * Definition for singly-linked list.
 * class ListNode {
 *     val: number
 *     next: ListNode | null
 *     constructor(val?: number, next?: ListNode | null)
 * }
 */

function deleteDuplicates(head: ListNode | null): ListNode | null {
  // Заглушка: голова тоже может оказаться дубликатом и быть удалена
  const dummy = new ListNode(0, head);
  // prev — последний узел, который точно остаётся в ответе
  let prev: ListNode = dummy;
  let curr = head;

  while (curr !== null) {
    if (curr.next !== null && curr.next.val === curr.val) {
      // Начался блок одинаковых значений — пропускаем его целиком
      const dup = curr.val;
      while (curr !== null && curr.val === dup) curr = curr.next;
      // Отрезаем весь блок; prev не двигаем — следующий узел тоже может быть дубликатом
      prev.next = curr;
    } else {
      // Значение уникально — оставляем узел
      prev = curr;
      curr = curr.next;
    }
  }

  return dummy.next;
}

// Время: O(n) — один проход
// Память: O(1)`,
    ideaRuMd: `### Идея: заглушка + пропуск блоков дубликатов

Список отсортирован, значит одинаковые значения идут **подряд** блоками. Задача: выкинуть каждый блок длины \`>= 2\` целиком (в отличие от easy-версии, где оставляли по одному экземпляру).

- \`prev\` — последний узел, который точно попадёт в ответ (вначале \`dummy\`).
- \`curr\` — текущий узел.

На каждом шаге:
- если \`curr.next.val === curr.val\` — это блок дубликатов. Проматываем \`curr\` до первого узла с другим значением и делаем \`prev.next = curr\`. **\`prev\` не двигаем**: новый \`curr\` тоже может начинать блок дубликатов (\`[1,1,2,2,3]\`).
- иначе \`curr\` уникален: \`prev = curr\`, идём дальше.

Заглушка обязательна: если дубликаты в самом начале (\`[1,1,1,2,3]\`), меняется голова списка.

**Сложность:** время \`O(n)\`, память \`O(1)\`.`,
    fn: 'deleteDuplicates',
    tests: [
      L([[1, 2, 3, 3, 4, 4, 5]], [1, 2, 5], { argTypes: ['list'] }),
      L([[1, 1, 1, 2, 3]], [2, 3], { argTypes: ['list'] }),
      L([[]], [], { argTypes: ['list'] }),
      L([[1, 1]], [], { argTypes: ['list'] }),
      L([[1, 2, 2]], [1], { argTypes: ['list'] }),
      L([[1, 1, 2, 2, 3]], [3], { argTypes: ['list'] }),
    ],
  },

  'rotate-list': {
    theory: LINKED_LIST,
    descriptionRuMd: `Дана голова \`head\` связного списка. Поверните список вправо на \`k\` позиций.

**Пример 1:**

![](https://assets.leetcode.com/uploads/2020/11/13/rotate1.jpg)

\`\`\`
Вход: head = [1,2,3,4,5], k = 2
Выход: [4,5,1,2,3]
\`\`\`

**Пример 2:**

![](https://assets.leetcode.com/uploads/2020/11/13/roate2.jpg)

\`\`\`
Вход: head = [0,1,2], k = 4
Выход: [2,0,1]
\`\`\`

**Ограничения:**

- Количество узлов в списке — в диапазоне \`[0, 500]\`.
- \`-100 <= Node.val <= 100\`
- \`0 <= k <= 2 * 10^9\``,
    solutionTs: `/**
 * Definition for singly-linked list.
 * class ListNode {
 *     val: number
 *     next: ListNode | null
 *     constructor(val?: number, next?: ListNode | null)
 * }
 */

function rotateRight(head: ListNode | null, k: number): ListNode | null {
  // Пустой список и список из одного узла не меняются
  if (head === null || head.next === null) return head;

  // Считаем длину и заодно находим хвост
  let n = 1;
  let tail: ListNode = head;
  while (tail.next !== null) {
    tail = tail.next;
    n++;
  }

  // Поворот на n позиций возвращает список в исходное состояние
  k %= n;
  if (k === 0) return head;

  // Новый хвост — (n - k)-й узел с начала, новая голова — следующий за ним
  let newTail: ListNode = head;
  for (let i = 1; i < n - k; i++) newTail = newTail.next!;
  const newHead = newTail.next;

  // Разрываем список после newTail и пришиваем старую голову к старому хвосту
  newTail.next = null;
  tail.next = head;

  return newHead;
}

// Время: O(n) — не больше двух проходов
// Память: O(1)`,
    ideaRuMd: `### Идея: длина, остаток и одна перестыковка

Поворот вправо на \`k\` — это «последние \`k\` узлов переезжают в начало».

1. Проходом считаем длину \`n\` и находим хвост \`tail\`.
2. \`k %= n\`: поворот на \`n\` ничего не меняет, а \`k\` может быть до \`2 · 10^9\` — крутить столько раз нельзя. Если \`k === 0\`, ответ — исходный список.
3. Новый хвост — узел номер \`n - k\` (с единицы), новая голова — следующий за ним.
4. Перестыковка: \`newTail.next = null\`, \`tail.next = head\`.

Эквивалентный вариант — замкнуть список в кольцо (\`tail.next = head\`), пройти \`n - k\` шагов и разрезать.

### Краевые случаи

- Пустой список или один узел — возвращаем как есть.
- \`k\` кратно \`n\` — список не меняется.

**Сложность:** время \`O(n)\`, память \`O(1)\`.`,
    fn: 'rotateRight',
    tests: [
      L([[1, 2, 3, 4, 5], 2], [4, 5, 1, 2, 3], { argTypes: ['list'] }),
      L([[0, 1, 2], 4], [2, 0, 1], { argTypes: ['list'] }),
      L([[], 0], [], { argTypes: ['list'] }),
      L([[1, 2], 2000000000], [1, 2], { argTypes: ['list'] }),
      L([[1, 2, 3], 1], [3, 1, 2], { argTypes: ['list'] }),
    ],
  },

  'partition-list': {
    theory: LINKED_LIST,
    descriptionRuMd: `Дана голова \`head\` связного списка и значение \`x\`. Переставьте узлы так, чтобы все узлы **меньше** \`x\` шли перед узлами, **большими или равными** \`x\`.

Исходный относительный порядок узлов внутри каждой из двух частей нужно **сохранить**.

**Пример 1:**

![](https://assets.leetcode.com/uploads/2021/01/04/partition.jpg)

\`\`\`
Вход: head = [1,4,3,2,5,2], x = 3
Выход: [1,2,2,4,3,5]
\`\`\`

**Пример 2:**

\`\`\`
Вход: head = [2,1], x = 2
Выход: [1,2]
\`\`\`

**Ограничения:**

- Количество узлов в списке — в диапазоне \`[0, 200]\`.
- \`-100 <= Node.val <= 100\`
- \`-200 <= x <= 200\``,
    solutionTs: `/**
 * Definition for singly-linked list.
 * class ListNode {
 *     val: number
 *     next: ListNode | null
 *     constructor(val?: number, next?: ListNode | null)
 * }
 */

function partition(head: ListNode | null, x: number): ListNode | null {
  // Две заглушки: для узлов < x и для узлов >= x
  const lessDummy = new ListNode(0);
  const geDummy = new ListNode(0);
  let less = lessDummy;
  let ge = geDummy;

  // Раскладываем узлы по двум спискам, сохраняя порядок
  for (let node = head; node !== null; node = node.next) {
    if (node.val < x) {
      less.next = node;
      less = node;
    } else {
      ge.next = node;
      ge = node;
    }
  }

  // Обрываем хвост второго списка — иначе может остаться ссылка
  // на узел из первого списка и получится цикл
  ge.next = null;
  // Склеиваем: сначала меньшие, затем большие или равные
  less.next = geDummy.next;

  return lessDummy.next;
}

// Время: O(n) — один проход
// Память: O(1) — переиспользуем существующие узлы`,
    ideaRuMd: `### Идея: два списка с заглушками

Задача похожа на \`partition\` из быстрой сортировки, но требует **устойчивости** — порядок внутри частей сохраняется. На списке это проще всего сделать так:

1. Заводим две заглушки: \`lessDummy\` (узлы \`< x\`) и \`geDummy\` (узлы \`>= x\`), и хвосты \`less\`, \`ge\`.
2. Идём по списку и пришиваем каждый узел к хвосту нужного списка. Порядок внутри каждого списка совпадает с исходным.
3. \`ge.next = null\` — **обязательно**: последний узел второй части может всё ещё указывать на узел из первой (например, \`[1,4,3,2,5,2]\`: узел \`5\` указывает на последний \`2\`), получится цикл.
4. \`less.next = geDummy.next\` и возвращаем \`lessDummy.next\`.

Новые узлы не создаются — переиспользуем существующие.

### Краевые случаи

- Пустой список — обе части пустые, ответ \`null\`.
- Все узлы \`< x\` или все \`>= x\` — одна из частей пустая, склейка всё равно корректна.

**Сложность:** время \`O(n)\`, память \`O(1)\`.`,
    fn: 'partition',
    tests: [
      L([[1, 4, 3, 2, 5, 2], 3], [1, 2, 2, 4, 3, 5], { argTypes: ['list'] }),
      L([[2, 1], 2], [1, 2], { argTypes: ['list'] }),
      L([[], 0], [], { argTypes: ['list'] }),
      L([[3, 1, 2], 5], [3, 1, 2], { argTypes: ['list'] }),
      L([[1, 4, 3, 0, 2, 5, 2], 3], [1, 0, 2, 2, 4, 3, 5], { argTypes: ['list'] }),
    ],
  },

  'lru-cache': {
    theory: LINKED_LIST,
    descriptionRuMd: `Спроектируйте структуру данных, которая подчиняется правилам **[LRU-кэша](https://en.wikipedia.org/wiki/Cache_replacement_policies#LRU)** (Least Recently Used — вытесняется давно не использовавшийся элемент).

Реализуйте класс \`LRUCache\`:

- \`LRUCache(int capacity)\` — инициализирует LRU-кэш **положительным** размером \`capacity\`.
- \`int get(int key)\` — возвращает значение по ключу \`key\`, если ключ есть, иначе \`-1\`.
- \`void put(int key, int value)\` — обновляет значение по ключу \`key\`, если ключ есть. Иначе добавляет пару \`key-value\` в кэш. Если после этой операции количество ключей превышает \`capacity\`, **вытесните** ключ, который использовался давнее всех.

Функции \`get\` и \`put\` должны работать за \`O(1)\` в среднем.

**Пример 1:**

\`\`\`
Вход
["LRUCache", "put", "put", "get", "put", "get", "put", "get", "get", "get"]
[[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]]
Выход
[null, null, null, 1, null, -1, null, -1, 3, 4]

Пояснение
LRUCache lRUCache = new LRUCache(2);
lRUCache.put(1, 1); // кэш: {1=1}
lRUCache.put(2, 2); // кэш: {1=1, 2=2}
lRUCache.get(1);    // вернёт 1
lRUCache.put(3, 3); // давнее всех использовался ключ 2, вытесняем его, кэш: {1=1, 3=3}
lRUCache.get(2);    // вернёт -1 (не найден)
lRUCache.put(4, 4); // давнее всех использовался ключ 1, вытесняем его, кэш: {4=4, 3=3}
lRUCache.get(1);    // вернёт -1 (не найден)
lRUCache.get(3);    // вернёт 3
lRUCache.get(4);    // вернёт 4
\`\`\`

**Ограничения:**

- \`1 <= capacity <= 3000\`
- \`0 <= key <= 10^4\`
- \`0 <= value <= 10^5\`
- Всего будет не более \`2 * 10^5\` вызовов \`get\` и \`put\`.`,
    solutionTs: `// Узел двусвязного списка: хранит и ключ, чтобы при вытеснении удалить его из Map
class DListNode {
  key: number;
  value: number;
  prev: DListNode | null = null;
  next: DListNode | null = null;

  constructor(key: number, value: number) {
    this.key = key;
    this.value = value;
  }
}

class LRUCache {
  private capacity: number;
  // ключ -> узел списка: доступ к узлу за O(1)
  private map = new Map<number, DListNode>();
  // Заглушки: head.next — самый свежий элемент, tail.prev — самый старый
  private head = new DListNode(0, 0);
  private tail = new DListNode(0, 0);

  constructor(capacity: number) {
    this.capacity = capacity;
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  get(key: number): number {
    const node = this.map.get(key);
    if (node === undefined) return -1;
    // Обращение делает элемент самым свежим — переносим в начало
    this.remove(node);
    this.addToFront(node);
    return node.value;
  }

  put(key: number, value: number): void {
    const node = this.map.get(key);
    if (node !== undefined) {
      // Ключ уже есть: обновляем значение и освежаем
      node.value = value;
      this.remove(node);
      this.addToFront(node);
      return;
    }

    const fresh = new DListNode(key, value);
    this.map.set(key, fresh);
    this.addToFront(fresh);

    // Переполнение — вытесняем самый старый элемент (перед хвостовой заглушкой)
    if (this.map.size > this.capacity) {
      const lru = this.tail.prev!;
      this.remove(lru);
      this.map.delete(lru.key);
    }
  }

  // Вынуть узел из списка за O(1): соседи знают друг о друге благодаря prev/next
  private remove(node: DListNode): void {
    node.prev!.next = node.next;
    node.next!.prev = node.prev;
  }

  // Вставить узел сразу после головной заглушки
  private addToFront(node: DListNode): void {
    node.prev = this.head;
    node.next = this.head.next;
    this.head.next!.prev = node;
    this.head.next = node;
  }
}

// Время: O(1) на get и put
// Память: O(capacity)`,
    ideaRuMd: `### Идея: хеш-таблица + двусвязный список

Нужно две вещи за \`O(1)\`:

- **найти** значение по ключу — это \`Map\`;
- **помнить порядок использования** и уметь переносить любой элемент в «свежий» конец и выкидывать самый старый — это **двусвязный список**.

Склеиваем их: \`Map\` хранит не значение, а **узел списка**. Тогда:

- \`get(key)\`: нашли узел в \`Map\`, вынули его из списка и вставили в начало — всё \`O(1)\`, потому что у узла есть \`prev\` и \`next\`.
- \`put(key, value)\`: если ключ есть — обновили и перенесли в начало. Иначе создали узел, вставили в начало, и если размер превысил \`capacity\` — удалили узел перед хвостом (самый старый) и его ключ из \`Map\`.

### Детали

- **Две заглушки** \`head\` и \`tail\` избавляют от проверок на \`null\` при вставке и удалении: у любого настоящего узла всегда есть оба соседа.
- Узел хранит **ключ** — иначе при вытеснении не узнать, что удалять из \`Map\`.
- Список именно **двусвязный**: в односвязном вынуть узел из середины за \`O(1)\` нельзя — нужен предшественник.

### Альтернатива для JS

\`Map\` в JavaScript помнит порядок вставки. Поэтому LRU можно написать короче: при обращении делать \`delete\` + \`set\` (ключ уезжает в конец), а для вытеснения брать \`map.keys().next().value\` — самый старый ключ. Это тоже \`O(1)\`, но на собеседовании обычно ждут явный двусвязный список.

**Сложность:** \`O(1)\` на операцию, память \`O(capacity)\`.`,
    cls: 'LRUCache',
    tests: [
      {
        ops: ['LRUCache', 'put', 'put', 'get', 'put', 'get', 'put', 'get', 'get', 'get'],
        args: [[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]],
        expected: [null, null, null, 1, null, -1, null, -1, 3, 4],
      },
      {
        ops: ['LRUCache', 'put', 'get', 'put', 'get', 'get'],
        args: [[1], [2, 1], [2], [3, 2], [2], [3]],
        expected: [null, null, 1, null, -1, 2],
      },
      {
        // put существующего ключа обновляет значение и освежает его
        ops: ['LRUCache', 'put', 'put', 'put', 'put', 'get', 'get', 'get'],
        args: [[2], [1, 1], [2, 2], [1, 10], [3, 3], [1], [2], [3]],
        expected: [null, null, null, null, null, 10, -1, 3],
      },
      {
        // get освежает ключ, поэтому вытесняется другой
        ops: ['LRUCache', 'put', 'put', 'get', 'put', 'get', 'get'],
        args: [[2], [2, 1], [1, 1], [2], [4, 1], [1], [2]],
        expected: [null, null, null, 1, null, -1, 1],
      },
    ],
  },
};
