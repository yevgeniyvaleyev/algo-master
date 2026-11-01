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
  // Оригинал -> его копия: по ней узнаём, что узел уже скопирован
  const visited = new Map<_Node, _Node>();

  // Возвращает копию узла, создавая её при первом обращении
  const cloneNode = (node: _Node | null): _Node | null => {
    if (node === null) return null;
    // Копия уже есть — отдаём её, а не создаём вторую
    if (visited.has(node)) return visited.get(node)!;

    const newNode = new _Node(node.val, null, null);
    // Запоминаем копию ДО рекурсии: random может вести обратно на этот же узел
    visited.set(node, newNode);
    newNode.next = cloneNode(node.next);
    newNode.random = cloneNode(node.random);
    return newNode;
  };

  return cloneNode(head);
}

// Время: O(n) — каждый узел копируется один раз
// Память: O(n) — таблица и стек рекурсии (глубина до n)`,
    ideaRuMd: `### Проблема

Скопировать \`val\` и \`next\` легко. Сложность в \`random\`: когда мы копируем узел, его \`random\` может указывать на узел, копии которого ещё нет. Нужен способ по исходному узлу быстро находить **его копию**.

### Идея: рекурсивное клонирование с таблицей «оригинал → копия»

Смотрим на список как на граф, где у каждого узла два ребра — \`next\` и \`random\`. Пишем функцию \`cloneNode(node)\`, которая **возвращает копию узла**:

1. \`null\` копируется в \`null\`.
2. Если узел уже есть в \`visited\` — возвращаем готовую копию (так \`random\` на уже скопированный узел попадает в правильное место, и ничего не копируется дважды).
3. Иначе создаём \`newNode\`, **сразу** кладём его в \`visited\` и только потом рекурсивно копируем \`next\` и \`random\`.

Ответ — \`cloneNode(head)\`. Исходный список при этом не меняется.

### Почему запись до рекурсии

Если \`random\` узла указывает на него самого (или цепочка рекурсии возвращается к узлу), то без ранней записи мы бы создали вторую копию того же узла или ушли в бесконечную рекурсию.

### Краевые случаи

- Пустой список — \`cloneNode(null)\` сразу даёт \`null\`.
- \`random\` указывает на сам узел (\`[[1,0]]\`) — копия уже лежит в \`visited\`, получаем \`X'.random = X'\`.

**Сложность:** время \`O(n)\`, память \`O(n)\` (таблица и стек рекурсии глубиной до \`n ≤ 1000\`). Follow-up: переплетение \`A -> A' -> B -> B'\` даёт \`O(1)\` дополнительной памяти.`,
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
      { args: [[[1, 3], [2, 0], [3, 3], [4, 1]]], expected: [[1, 3], [2, 0], [3, 3], [4, 1]] },
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

  // before — узел прямо перед отрезком [left, right]
  let before: ListNode = dummy;
  for (let i = 1; i < left; i++) before = before.next!;

  // Обычный разворот (right - left + 1) узлов отрезка
  let prev: ListNode | null = null;
  let curr: ListNode | null = before.next;
  for (let i = 0; i < right - left + 1; i++) {
    const next: ListNode | null = curr!.next;
    curr!.next = prev;
    prev = curr;
    curr = next;
  }

  // Теперь prev — новое начало отрезка, curr — первый узел после отрезка,
  // а before.next — бывшее начало, ставшее хвостом отрезка
  before.next!.next = curr; // хвост отрезка -> остаток списка
  before.next = prev; // узел перед отрезком -> новое начало

  return dummy.next;
}

// Время: O(n) — один проход
// Память: O(1)`,
    ideaRuMd: `### Идея: дойти до отрезка, развернуть его обычным разворотом, пришить концы

1. Заводим \`dummy\` перед головой — тогда случай \`left = 1\` не особый.
2. Доходим до \`before\` — узла **перед** отрезком (\`left - 1\` шагов от \`dummy\`).
3. Разворачиваем ровно \`right - left + 1\` узлов стандартным циклом \`prev/curr/next\`, начиная с \`curr = before.next\`.
4. После цикла: \`prev\` — новое начало отрезка, \`curr\` — первый узел после отрезка, а \`before.next\` всё ещё указывает на бывшее начало, которое стало хвостом.
5. Пришиваем: \`before.next.next = curr\` (хвост → остаток), затем \`before.next = prev\` (перед отрезком → новое начало).

Пример для \`[1,2,3,4,5]\`, \`left = 2\`, \`right = 4\` (\`before = 1\`):

\`\`\`
после разворота:  1 -> 2 -> null,   4 -> 3 -> 2,   curr = 5
before.next.next = 5:   2 -> 5
before.next = 4:        1 -> 4 -> 3 -> 2 -> 5
\`\`\`

Порядок двух последних присваиваний важен: пока \`before.next\` не перезаписан, через него можно достать хвост отрезка.

**Сложность:** время \`O(n)\`, память \`O(1)\`.`,
    fn: 'reverseBetween',
    tests: [
      L([[1, 2, 3, 4, 5], 2, 4], [1, 4, 3, 2, 5], { argTypes: ['list'] }),
      L([[5], 1, 1], [5], { argTypes: ['list'] }),
      L([[3, 5], 1, 2], [5, 3], { argTypes: ['list'] }),
      L([[1, 2, 3, 4, 5], 1, 5], [5, 4, 3, 2, 1], { argTypes: ['list'] }),
      L([[1, 2, 3, 4, 5], 3, 3], [1, 2, 3, 4, 5], { argTypes: ['list'] }),
      L([[1, 2, 3, 4, 5], 4, 5], [1, 2, 3, 5, 4], { argTypes: ['list'] }),
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
  // Проверяем, что впереди есть хотя бы k узлов; если нет — остаток не трогаем
  let check: ListNode | null = head;
  for (let i = 0; i < k; i++) {
    if (check === null) return head;
    check = check.next;
  }

  // Обычный разворот первых k узлов
  let prev: ListNode | null = null;
  let curr: ListNode | null = head;
  for (let i = 0; i < k; i++) {
    const next: ListNode | null = curr!.next;
    curr!.next = prev;
    prev = curr;
    curr = next;
  }

  // head (бывший первый) стал хвостом группы: пришиваем к нему
  // рекурсивно обработанный остаток, который начинается с curr
  head!.next = reverseKGroup(curr, k);

  // prev — бывший k-й узел, теперь начало группы
  return prev;
}

// Время: O(n) — каждый узел проверяется и разворачивается по одному разу
// Память: O(n / k) — глубина рекурсии (по вызову на группу)`,
    ideaRuMd: `### Идея: развернуть первую группу, остаток — рекурсией

Функция \`reverseKGroup(head, k)\` решает задачу для списка, начинающегося с \`head\`. Достаточно справиться с **первой** группой, а остальное поручить рекурсивному вызову.

1. **Проверка.** Делаем \`k\` шагов от \`head\`. Если по пути встретили \`null\` — узлов меньше \`k\`, возвращаем \`head\` без изменений.
2. **Разворот.** Стандартным циклом \`prev/curr/next\` разворачиваем ровно \`k\` узлов. После него \`prev\` — бывший \`k\`-й узел (новое начало группы), \`curr\` — первый узел следующей группы.
3. **Стыковка.** \`head\` теперь хвост группы: \`head.next = reverseKGroup(curr, k)\`.
4. Возвращаем \`prev\`.

Пример \`[1,2,3,4,5]\`, \`k = 2\`: \`2 -> 1 -> f([3,4,5])\`, \`f([3,4,5]) = 4 -> 3 -> f([5])\`, \`f([5]) = 5\` → \`[2,1,4,3,5]\`.

### Краевые случаи

- \`k = 1\` — каждая группа из одного узла, список не меняется.
- \`n\` кратно \`k\` — последний вызов получает \`null\` и сразу возвращает его.

**Сложность:** время \`O(n)\`, память \`O(n/k)\` на стек рекурсии. Follow-up на \`O(1)\` — итеративный вариант с заглушкой \`dummy\` и указателем на узел перед группой.`,
    fn: 'reverseKGroup',
    tests: [
      L([[1, 2, 3, 4, 5], 2], [2, 1, 4, 3, 5], { argTypes: ['list'] }),
      L([[1, 2, 3, 4, 5], 3], [3, 2, 1, 4, 5], { argTypes: ['list'] }),
      L([[1, 2, 3, 4, 5], 1], [1, 2, 3, 4, 5], { argTypes: ['list'] }),
      L([[1, 2, 3, 4, 5, 6], 3], [3, 2, 1, 6, 5, 4], { argTypes: ['list'] }),
      L([[1, 2], 2], [2, 1], { argTypes: ['list'] }),
      L([[1, 2, 3, 4, 5], 5], [5, 4, 3, 2, 1], { argTypes: ['list'] }),
      L([[1, 2, 3, 4, 5, 6, 7, 8], 3], [3, 2, 1, 6, 5, 4, 7, 8], { argTypes: ['list'] }),
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
