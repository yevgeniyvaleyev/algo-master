// Batch 03f: Binary Tree (medium/hard) problems.
// Apply with: node scripts/content/apply.mjs scripts/content/generated/03f-binary-tree.mjs

const TREE_DFS = { topicKey: 'tree-dfs', titleRu: 'Обход дерева в глубину (DFS)' };
const TREE_BFS = { topicKey: 'tree-bfs', titleRu: 'Обход дерева в ширину (BFS)' };
const BST = { topicKey: 'bst', titleRu: 'Двоичное дерево поиска' };
const DIVIDE_AND_CONQUER = { topicKey: 'divide-and-conquer', titleRu: 'Разделяй и властвуй' };

// LeetCode's _Node for "Populating Next Right Pointers", as plain JS.
const NEXT_NODE_PRELUDE = `
class _Node {
  constructor(val, left, right, next) {
    this.val = val === undefined ? 0 : val;
    this.left = left === undefined ? null : left;
    this.right = right === undefined ? null : right;
    this.next = next === undefined ? null : next;
  }
}
`;

// Builds a _Node tree from level order, runs connect and serializes it like LeetCode:
// each level is read by following next pointers from its leftmost node, followed by '#'.
const NEXT_NODE_HARNESS = `
function __run(arr) {
  let root = null;
  if (arr.length && arr[0] !== null) {
    root = new _Node(arr[0]);
    const queue = [root];
    let i = 1;
    while (queue.length && i < arr.length) {
      const node = queue.shift();
      if (i < arr.length && arr[i] !== null) queue.push((node.left = new _Node(arr[i])));
      i++;
      if (i < arr.length && arr[i] !== null) queue.push((node.right = new _Node(arr[i])));
      i++;
    }
  }
  connect(root);
  const out = [];
  let levelStart = root;
  while (levelStart) {
    let nextStart = null;
    for (let n = levelStart, k = 0; n && k < 10000; n = n.next, k++) {
      out.push(n.val);
      if (!nextStart) nextStart = n.left || n.right;
    }
    out.push('#');
    levelStart = nextStart;
  }
  return out;
}
`;

export const algos = {
  'construct-binary-tree-from-preorder-and-inorder-traversal': {
    theory: DIVIDE_AND_CONQUER,
    descriptionRuMd: `Даны два массива целых чисел \`preorder\` и \`inorder\`: \`preorder\` — прямой (pre-order) обход двоичного дерева, а \`inorder\` — центрированный (in-order) обход того же дерева. Постройте и верните _это двоичное дерево_.

**Пример 1:**

![](https://assets.leetcode.com/uploads/2021/02/19/tree.jpg)

\`\`\`
Вход: preorder = [3,9,20,15,7], inorder = [9,3,15,20,7]
Выход: [3,9,20,null,null,15,7]
\`\`\`

**Пример 2:**

\`\`\`
Вход: preorder = [-1], inorder = [-1]
Выход: [-1]
\`\`\`

**Ограничения:**

- \`1 <= preorder.length <= 3000\`
- \`inorder.length == preorder.length\`
- \`-3000 <= preorder[i], inorder[i] <= 3000\`
- \`preorder\` и \`inorder\` состоят из **различных** значений.
- Каждое значение из \`inorder\` также встречается в \`preorder\`.
- **Гарантируется**, что \`preorder\` — прямой обход дерева.
- **Гарантируется**, что \`inorder\` — центрированный обход дерева.`,
    solutionTs: `function buildTree(preorder: number[], inorder: number[]): TreeNode | null {
  // Значение -> его индекс в inorder, чтобы находить корень за O(1)
  const inIndex = new Map<number, number>();
  inorder.forEach((v, i) => inIndex.set(v, i));

  // Указатель на следующий корень в preorder: корни идут в порядке «корень, левое, правое»
  let pre = 0;

  // Строит поддерево из элементов inorder[lo..hi]
  const build = (lo: number, hi: number): TreeNode | null => {
    if (lo > hi) return null; // пустой отрезок — пустое поддерево

    // Очередной элемент preorder — корень текущего поддерева
    const rootVal = preorder[pre++];
    const root = new TreeNode(rootVal);

    // Всё левее корня в inorder — левое поддерево, правее — правое
    const mid = inIndex.get(rootVal)!;

    // Сначала левое: в preorder его узлы идут сразу после корня
    root.left = build(lo, mid - 1);
    root.right = build(mid + 1, hi);
    return root;
  };

  return build(0, inorder.length - 1);
}

// Время: O(n) — каждый узел создаётся один раз, поиск корня в Map за O(1)
// Память: O(n) — Map + стек рекурсии O(h)`,
    ideaRuMd: `### Идея: корень из preorder делит inorder на две части

- В **preorder** первым идёт корень: \`[корень, ...левое, ...правое]\`.
- В **inorder** корень стоит между поддеревьями: \`[...левое, корень, ...правое]\`.

Значит, берём корень из \`preorder\`, находим его позицию \`mid\` в \`inorder\` — всё левее \`mid\` образует левое поддерево, всё правее — правое. Дальше рекурсивно строим каждое поддерево тем же способом.

### Детали реализации

- Чтобы не искать корень в \`inorder\` линейно (это дало бы \`O(n²)\` на вырожденном дереве), заранее строим \`Map\` «значение → индекс». Это работает, потому что все значения **различны**.
- Вместо нарезки массивов (\`slice\` копирует) передаём границы отрезка \`[lo, hi]\` в \`inorder\`, а по \`preorder\` идём одним глобальным указателем \`pre\`. Порядок рекурсии «сначала левое, потом правое» в точности совпадает с порядком preorder, поэтому \`pre++\` всегда даёт корень нужного поддерева.
- Пустой отрезок (\`lo > hi\`) — это \`null\`.

**Альтернатива:** итеративное построение со стеком за \`O(n)\` без \`Map\` — красиво, но сложнее объяснить на собеседовании.

**Сложность:** время \`O(n)\`, память \`O(n)\`.`,
    fn: 'buildTree',
    tests: [
      { args: [[3, 9, 20, 15, 7], [9, 3, 15, 20, 7]], resultType: 'tree', expected: [3, 9, 20, null, null, 15, 7] },
      { args: [[-1], [-1]], resultType: 'tree', expected: [-1] },
      { args: [[1, 2, 3], [3, 2, 1]], resultType: 'tree', expected: [1, 2, null, 3] },
      { args: [[1, 2, 4, 5, 3, 6], [4, 2, 5, 1, 6, 3]], resultType: 'tree', expected: [1, 2, 3, 4, 5, 6] },
    ],
  },

  'construct-binary-tree-from-inorder-and-postorder-traversal': {
    theory: DIVIDE_AND_CONQUER,
    descriptionRuMd: `Даны два массива целых чисел \`inorder\` и \`postorder\`: \`inorder\` — центрированный (in-order) обход двоичного дерева, а \`postorder\` — обратный (post-order) обход того же дерева. Постройте и верните _это двоичное дерево_.

**Пример 1:**

![](https://assets.leetcode.com/uploads/2021/02/19/tree.jpg)

\`\`\`
Вход: inorder = [9,3,15,20,7], postorder = [9,15,7,20,3]
Выход: [3,9,20,null,null,15,7]
\`\`\`

**Пример 2:**

\`\`\`
Вход: inorder = [-1], postorder = [-1]
Выход: [-1]
\`\`\`

**Ограничения:**

- \`1 <= inorder.length <= 3000\`
- \`postorder.length == inorder.length\`
- \`-3000 <= inorder[i], postorder[i] <= 3000\`
- \`inorder\` и \`postorder\` состоят из **различных** значений.
- Каждое значение из \`postorder\` также встречается в \`inorder\`.
- **Гарантируется**, что \`inorder\` — центрированный обход дерева.
- **Гарантируется**, что \`postorder\` — обратный обход дерева.`,
    solutionTs: `function buildTree(inorder: number[], postorder: number[]): TreeNode | null {
  // Значение -> его индекс в inorder
  const inIndex = new Map<number, number>();
  inorder.forEach((v, i) => inIndex.set(v, i));

  // Идём по postorder с конца: там порядок «корень, правое, левое»
  let post = postorder.length - 1;

  // Строит поддерево из элементов inorder[lo..hi]
  const build = (lo: number, hi: number): TreeNode | null => {
    if (lo > hi) return null;

    // Последний ещё не использованный элемент postorder — корень поддерева
    const rootVal = postorder[post--];
    const root = new TreeNode(rootVal);
    const mid = inIndex.get(rootVal)!;

    // Важно: сначала ПРАВОЕ поддерево — с конца postorder идут его узлы
    root.right = build(mid + 1, hi);
    root.left = build(lo, mid - 1);
    return root;
  };

  return build(0, inorder.length - 1);
}

// Время: O(n)
// Память: O(n) — Map + стек рекурсии O(h)`,
    ideaRuMd: `### Идея: корень — последний элемент postorder

- **postorder**: \`[...левое, ...правое, корень]\` — корень в **конце**.
- **inorder**: \`[...левое, корень, ...правое]\` — корень делит отрезок на два поддерева.

Алгоритм тот же, что и для пары preorder + inorder, но читаем \`postorder\` **с конца**:

1. Берём \`postorder[post--]\` — это корень текущего поддерева.
2. Находим его индекс \`mid\` в \`inorder\` (через заранее построенную \`Map\`).
3. Рекурсивно строим **сначала правое** поддерево из \`inorder[mid+1..hi]\`, затем левое из \`inorder[lo..mid-1]\`.

Почему сначала правое? Если читать postorder справа налево, получаем порядок «корень, правое, левое». Указатель \`post\` должен двигаться синхронно с рекурсией, иначе в правое поддерево попадут узлы левого.

**Типичная ошибка:** построить сначала левое поддерево — дерево получится неверным.

**Сложность:** время \`O(n)\`, память \`O(n)\`.`,
    fn: 'buildTree',
    tests: [
      { args: [[9, 3, 15, 20, 7], [9, 15, 7, 20, 3]], resultType: 'tree', expected: [3, 9, 20, null, null, 15, 7] },
      { args: [[-1], [-1]], resultType: 'tree', expected: [-1] },
      { args: [[1, 2, 3], [3, 2, 1]], resultType: 'tree', expected: [1, null, 2, null, 3] },
      { args: [[4, 2, 5, 1, 6, 3], [4, 5, 2, 6, 3, 1]], resultType: 'tree', expected: [1, 2, 3, 4, 5, 6] },
    ],
  },

  'populating-next-right-pointers-in-each-node-ii': {
    theory: TREE_BFS,
    descriptionRuMd: `Дано двоичное дерево:

\`\`\`
struct Node {
  int val;
  Node *left;
  Node *right;
  Node *next;
}
\`\`\`

Заполните у каждого узла указатель \`next\` так, чтобы он указывал на следующий узел справа на том же уровне. Если справа узла нет, \`next\` должен быть равен \`NULL\`.

Изначально все указатели \`next\` равны \`NULL\`.

**Пример 1:**

![](https://assets.leetcode.com/uploads/2019/02/15/117_sample.png)

\`\`\`
Вход: root = [1,2,3,4,5,null,7]
Выход: [1,#,2,3,#,4,5,7,#]
Пояснение: для данного дерева (рисунок A) функция должна заполнить указатели next так, чтобы каждый указывал на следующий узел справа, как на рисунке B. Сериализованный вывод идёт по уровням в порядке указателей next, а '#' обозначает конец каждого уровня.
\`\`\`

**Пример 2:**

\`\`\`
Вход: root = []
Выход: []
\`\`\`

**Ограничения:**

- Количество узлов в дереве — в диапазоне \`[0, 6000]\`.
- \`-100 <= Node.val <= 100\`

**Дополнительно:**

- Используйте только константную дополнительную память.
- Рекурсивное решение допустимо: можно считать, что неявный стек рекурсии в этой задаче не считается дополнительной памятью.`,
    solutionTs: `/**
 * Definition for _Node.
 * class _Node {
 *     val: number
 *     left: _Node | null
 *     right: _Node | null
 *     next: _Node | null
 *     constructor(val?: number, left?: _Node, right?: _Node, next?: _Node) { ... }
 * }
 */

function connect(root: _Node | null): _Node | null {
  // levelStart — самый левый узел текущего уровня (он уже связан через next)
  let levelStart = root;

  while (levelStart !== null) {
    // Фиктивная голова списка следующего уровня
    const dummy = new _Node(0);
    // tail — последний узел, уже подцепленный в список следующего уровня
    let tail = dummy;

    // Идём по текущему уровню как по связному списку через next
    for (let node: _Node | null = levelStart; node !== null; node = node.next) {
      // Дописываем детей в хвост списка следующего уровня
      if (node.left !== null) {
        tail.next = node.left;
        tail = node.left;
      }
      if (node.right !== null) {
        tail.next = node.right;
        tail = node.right;
      }
    }

    // Следующий уровень полностью связан — переходим на него
    levelStart = dummy.next;
  }

  return root;
}

// Время: O(n) — каждый узел посещается дважды (как ребёнок и как родитель)
// Память: O(1) — без очереди, используем уже построенные указатели next`,
    ideaRuMd: `### Идея: уровень — это связный список

Простое решение — BFS с очередью: обходим уровень и связываем соседей. Но очередь занимает \`O(n)\` памяти, а follow-up просит \`O(1)\`.

Ключевое наблюдение: **после обработки уровня его узлы уже связаны через \`next\`** — это готовый связный список. Значит, по текущему уровню можно идти без очереди и при этом строить список следующего уровня.

### Алгоритм

1. \`levelStart\` — самый левый узел текущего уровня (сначала \`root\`).
2. Заводим фиктивный узел \`dummy\` и хвост \`tail = dummy\` для списка следующего уровня.
3. Идём по текущему уровню через \`next\`. Для каждого узла дописываем его \`left\` и \`right\` (если они есть) в хвост: \`tail.next = child; tail = child\`.
4. Когда уровень пройден, \`dummy.next\` — самый левый узел следующего уровня. Переходим к нему.

Фиктивная голова избавляет от отдельной обработки «первого найденного ребёнка», что важно именно в версии **II**, где дерево не идеальное и у узлов могут отсутствовать дети.

**Сложность:** время \`O(n)\`, память \`O(1)\` (вспомогательный \`dummy\` на каждый уровень — константа).`,
    prelude: NEXT_NODE_PRELUDE,
    harness: NEXT_NODE_HARNESS,
    tests: [
      { args: [[1, 2, 3, 4, 5, null, 7]], expected: [1, '#', 2, 3, '#', 4, 5, 7, '#'] },
      { args: [[]], expected: [] },
      { args: [[1]], expected: [1, '#'] },
      { args: [[1, 2, 3, 4, null, null, 5]], expected: [1, '#', 2, 3, '#', 4, 5, '#'] },
      {
        args: [[1, 2, 3, 4, 5, null, 6, 7, null, null, null, null, 8]],
        expected: [1, '#', 2, 3, '#', 4, 5, 6, '#', 7, 8, '#'],
      },
    ],
  },

  'flatten-binary-tree-to-linked-list': {
    theory: TREE_DFS,
    descriptionRuMd: `Дан корень двоичного дерева \`root\`. Преобразуйте («сплющите») дерево в «связный список»:

- «Связный список» должен использовать тот же класс \`TreeNode\`: указатель на правого ребёнка \`right\` указывает на следующий узел списка, а указатель на левого ребёнка \`left\` всегда равен \`null\`.
- Узлы «связного списка» должны идти в том же порядке, что и при [**прямом (pre-order) обходе**](https://en.wikipedia.org/wiki/Tree_traversal#Pre-order,_NLR) дерева.

**Пример 1:**

![](https://assets.leetcode.com/uploads/2021/01/14/flaten.jpg)

\`\`\`
Вход: root = [1,2,5,3,4,null,6]
Выход: [1,null,2,null,3,null,4,null,5,null,6]
\`\`\`

**Пример 2:**

\`\`\`
Вход: root = []
Выход: []
\`\`\`

**Пример 3:**

\`\`\`
Вход: root = [0]
Выход: [0]
\`\`\`

**Ограничения:**

- Количество узлов в дереве — в диапазоне \`[0, 2000]\`.
- \`-100 <= Node.val <= 100\`

**Дополнительно:** сможете ли вы сплющить дерево на месте (с \`O(1)\` дополнительной памяти)?`,
    solutionTs: `/**
 Do not return anything, modify root in-place instead.
 */
function flatten(root: TreeNode | null): void {
  let node = root;

  while (node !== null) {
    if (node.left !== null) {
      // Ищем самый правый узел левого поддерева —
      // в pre-order он идёт последним перед правым поддеревом
      let rightmost = node.left;
      while (rightmost.right !== null) {
        rightmost = rightmost.right;
      }

      // Подвешиваем правое поддерево за этот узел
      rightmost.right = node.right;

      // Переносим левое поддерево направо, слева оставляем null
      node.right = node.left;
      node.left = null;
    }

    // Двигаемся по «списку» дальше
    node = node.right;
  }
}

// Время: O(n) — каждое ребро просматривается не более двух раз
// Память: O(1) — без рекурсии и стека`,
    ideaRuMd: `### Идея: переносим левое поддерево вправо (как в обходе Морриса)

В pre-order порядок такой: \`узел → всё левое поддерево → всё правое поддерево\`. Последний узел левого поддерева в pre-order — это его **самый правый** узел. Сразу после него должно начинаться правое поддерево.

Для каждого узла \`node\` с непустым \`left\`:

1. Находим самый правый узел \`rightmost\` в \`node.left\`.
2. \`rightmost.right = node.right\` — подвешиваем правое поддерево после левого.
3. \`node.right = node.left\`, \`node.left = null\` — левое поддерево становится продолжением списка.
4. Переходим к \`node.right\`.

Каждый узел становится «текущим» один раз, а спуск к \`rightmost\` проходит по правым рёбрам, которые затем оказываются в списке и больше так не обходятся. Итого \`O(n)\`.

### Альтернативы

- **Рекурсия в обратном pre-order** (\`right → left → node\`) с глобальным \`prev\`: \`node.right = prev; node.left = null; prev = node\`. Коротко, но \`O(h)\` памяти на стек.
- Собрать узлы pre-order обходом в массив и перелинковать — \`O(n)\` памяти.

**Сложность:** время \`O(n)\`, память \`O(1)\`.`,
    harness: `
function __run(arr) {
  const root = __toTree(arr);
  flatten(root);
  return __fromTree(root);
}
`,
    tests: [
      { args: [[1, 2, 5, 3, 4, null, 6]], expected: [1, null, 2, null, 3, null, 4, null, 5, null, 6] },
      { args: [[]], expected: [] },
      { args: [[0]], expected: [0] },
      { args: [[1, 2, null, 3]], expected: [1, null, 2, null, 3] },
      { args: [[1, null, 2, 3]], expected: [1, null, 2, null, 3] },
    ],
  },

  'sum-root-to-leaf-numbers': {
    theory: TREE_DFS,
    descriptionRuMd: `Дан корень \`root\` двоичного дерева, в узлах которого записаны только цифры от \`0\` до \`9\`.

Каждый путь от корня до листа задаёт число.

- Например, путь \`1 -> 2 -> 3\` задаёт число \`123\`.

Верните _сумму всех чисел, заданных путями от корня до листьев_. Тесты составлены так, что ответ помещается в **32-битное** целое.

**Лист** — узел без детей.

**Пример 1:**

![](https://assets.leetcode.com/uploads/2021/02/19/num1tree.jpg)

\`\`\`
Вход: root = [1,2,3]
Выход: 25
Пояснение:
Путь 1->2 задаёт число 12.
Путь 1->3 задаёт число 13.
Сумма = 12 + 13 = 25.
\`\`\`

**Пример 2:**

![](https://assets.leetcode.com/uploads/2021/02/19/num2tree.jpg)

\`\`\`
Вход: root = [4,9,0,5,1]
Выход: 1026
Пояснение:
Путь 4->9->5 задаёт число 495.
Путь 4->9->1 задаёт число 491.
Путь 4->0 задаёт число 40.
Сумма = 495 + 491 + 40 = 1026.
\`\`\`

**Ограничения:**

- Количество узлов в дереве — в диапазоне \`[1, 1000]\`.
- \`0 <= Node.val <= 9\`
- Глубина дерева не превышает \`10\`.`,
    solutionTs: `function sumNumbers(root: TreeNode | null): number {
  // current — число, набранное на пути от корня до родителя node
  const dfs = (node: TreeNode | null, current: number): number => {
    if (node === null) return 0;

    // Дописываем цифру узла справа: 12 -> 123
    const value = current * 10 + node.val;

    // Лист — путь закончился, это готовое число
    if (node.left === null && node.right === null) {
      return value;
    }

    // Иначе сумма чисел из левого и правого поддеревьев
    return dfs(node.left, value) + dfs(node.right, value);
  };

  return dfs(root, 0);
}

// Время: O(n) — каждый узел посещается один раз
// Память: O(h) — стек рекурсии (h <= 10 по условию)`,
    ideaRuMd: `### Идея: DFS сверху вниз с накоплением числа

Спускаясь от корня, несём с собой число, набранное на пути: при переходе в узел со значением \`d\` оно становится \`current * 10 + d\`.

- Дошли до **листа** — это готовое число, возвращаем его.
- Пустой узел (\`null\`) даёт \`0\` — так безопасно обрабатывается узел с одним ребёнком.
- Иначе ответ для узла — сумма ответов левого и правого поддеревьев.

Важно проверять именно **лист**, а не \`null\`: иначе у узла с одним ребёнком «оборванный» путь посчитался бы как отдельное число.

**Альтернативы:** итеративный DFS со стеком пар \`(узел, число)\` или BFS с очередью таких пар; обход Морриса даёт \`O(1)\` памяти, но заметно сложнее.

**Сложность:** время \`O(n)\`, память \`O(h)\`.`,
    fn: 'sumNumbers',
    tests: [
      { args: [[1, 2, 3]], argTypes: ['tree'], expected: 25 },
      { args: [[4, 9, 0, 5, 1]], argTypes: ['tree'], expected: 1026 },
      { args: [[0]], argTypes: ['tree'], expected: 0 },
      { args: [[1, 0]], argTypes: ['tree'], expected: 10 },
      { args: [[1, null, 2, 3]], argTypes: ['tree'], expected: 123 },
    ],
  },

  'binary-tree-maximum-path-sum': {
    theory: TREE_DFS,
    descriptionRuMd: `**Путь** в двоичном дереве — это последовательность узлов, в которой каждая пара соседних узлов соединена ребром. Каждый узел может встречаться в последовательности **не более одного раза**. Путь не обязан проходить через корень.

**Сумма пути** — сумма значений узлов на этом пути.

Дан корень двоичного дерева \`root\`. Верните _максимальную **сумму пути** среди всех **непустых** путей_.

**Пример 1:**

![](https://assets.leetcode.com/uploads/2020/10/13/exx1.jpg)

\`\`\`
Вход: root = [1,2,3]
Выход: 6
Пояснение: оптимальный путь 2 -> 1 -> 3 с суммой 2 + 1 + 3 = 6.
\`\`\`

**Пример 2:**

![](https://assets.leetcode.com/uploads/2020/10/13/exx2.jpg)

\`\`\`
Вход: root = [-10,9,20,null,null,15,7]
Выход: 42
Пояснение: оптимальный путь 15 -> 20 -> 7 с суммой 15 + 20 + 7 = 42.
\`\`\`

**Ограничения:**

- Количество узлов в дереве — в диапазоне \`[1, 3 * 10^4]\`.
- \`-1000 <= Node.val <= 1000\``,
    solutionTs: `function maxPathSum(root: TreeNode | null): number {
  // Лучший найденный путь (любой формы). Узлов минимум один, но значения могут быть < 0
  let best = -Infinity;

  // Возвращает максимальную сумму «луча» — пути, который начинается в node
  // и идёт вниз только в одно поддерево
  const gain = (node: TreeNode | null): number => {
    if (node === null) return 0;

    // Отрицательный луч только уменьшает сумму — тогда лучше его не брать (0)
    const left = Math.max(gain(node.left), 0);
    const right = Math.max(gain(node.right), 0);

    // Путь, «перегибающийся» в node: левый луч + node + правый луч
    best = Math.max(best, node.val + left + right);

    // Наверх можно отдать только один луч — иначе путь раздвоится
    return node.val + Math.max(left, right);
  };

  gain(root);
  return best;
}

// Время: O(n) — каждый узел обрабатывается один раз
// Память: O(h) — стек рекурсии`,
    ideaRuMd: `### Идея: post-order DFS, «луч» наверх и «перегиб» в узле

У любого пути есть **самый верхний** узел — точка перегиба. В нём путь состоит из:
\`лучший луч из левого поддерева + node.val + лучший луч из правого поддерева\`.

**Луч** — путь, идущий от узла строго вниз в одну сторону. Функция \`gain(node)\` возвращает максимальную сумму луча, начинающегося в \`node\`:

\`gain(node) = node.val + max(gain(left), gain(right), 0)\`

Для каждого узла делаем две вещи:

1. **Обновляем глобальный ответ** путём с перегибом в этом узле: \`node.val + max(gainL, 0) + max(gainR, 0)\`.
2. **Возвращаем наверх** только один луч — родитель может продолжить путь лишь в одну сторону, иначе узел попадёт в путь дважды (получится «вилка»).

### Тонкости

- Отрицательный луч отбрасываем через \`max(..., 0)\` — выгоднее его не брать.
- Начальное значение ответа — \`-Infinity\`, а не \`0\`: если все значения отрицательные (например, \`[-3]\`), ответом будет наибольшее одиночное значение. Путь непустой, поэтому \`0\` вернуть нельзя.

Это классический приём «возвращаем одно, а ответ считаем другое» — так же решаются диаметр дерева и самый длинный путь с одинаковыми значениями.

**Сложность:** время \`O(n)\`, память \`O(h)\`.`,
    fn: 'maxPathSum',
    tests: [
      { args: [[1, 2, 3]], argTypes: ['tree'], expected: 6 },
      { args: [[-10, 9, 20, null, null, 15, 7]], argTypes: ['tree'], expected: 42 },
      { args: [[-3]], argTypes: ['tree'], expected: -3 },
      { args: [[-1, -2, -3]], argTypes: ['tree'], expected: -1 },
      { args: [[2, -1]], argTypes: ['tree'], expected: 2 },
      { args: [[5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1]], argTypes: ['tree'], expected: 48 },
    ],
  },

  'binary-search-tree-iterator': {
    theory: BST,
    descriptionRuMd: `Реализуйте класс \`BSTIterator\` — итератор по **[центрированному (in-order) обходу](https://en.wikipedia.org/wiki/Tree_traversal#In-order_\\(LNR\\))** двоичного дерева поиска (BST):

- \`BSTIterator(TreeNode root)\` — инициализирует объект класса \`BSTIterator\`. Корень BST передаётся в конструктор. Указатель изначально стоит на несуществующем числе, меньшем любого элемента BST.
- \`boolean hasNext()\` — возвращает \`true\`, если в обходе справа от указателя есть число, иначе \`false\`.
- \`int next()\` — сдвигает указатель вправо и возвращает число под указателем.

Поскольку указатель изначально стоит на несуществующем наименьшем числе, первый вызов \`next()\` вернёт наименьший элемент BST.

Можно считать, что вызовы \`next()\` всегда корректны: при вызове \`next()\` в обходе всегда есть следующее число.

**Пример 1:**

![](https://assets.leetcode.com/uploads/2018/12/25/bst-tree.png)

\`\`\`
Вход
["BSTIterator", "next", "next", "hasNext", "next", "hasNext", "next", "hasNext", "next", "hasNext"]
[[[7, 3, 15, null, null, 9, 20]], [], [], [], [], [], [], [], [], []]
Выход
[null, 3, 7, true, 9, true, 15, true, 20, false]

Пояснение
BSTIterator bSTIterator = new BSTIterator([7, 3, 15, null, null, 9, 20]);
bSTIterator.next();    // вернёт 3
bSTIterator.next();    // вернёт 7
bSTIterator.hasNext(); // вернёт true
bSTIterator.next();    // вернёт 9
bSTIterator.hasNext(); // вернёт true
bSTIterator.next();    // вернёт 15
bSTIterator.hasNext(); // вернёт true
bSTIterator.next();    // вернёт 20
bSTIterator.hasNext(); // вернёт false
\`\`\`

**Ограничения:**

- Количество узлов в дереве — в диапазоне \`[1, 10^5]\`.
- \`0 <= Node.val <= 10^6\`
- Всего будет не более \`10^5\` вызовов \`hasNext\` и \`next\`.

**Дополнительно:**

- Сможете ли вы реализовать \`next()\` и \`hasNext()\` так, чтобы они работали в среднем за \`O(1)\` и использовали \`O(h)\` памяти, где \`h\` — высота дерева?`,
    solutionTs: `class BSTIterator {
  // Стек «отложенных» узлов: путь влево от текущей позиции.
  // На вершине всегда лежит следующий по порядку (наименьший непосещённый) узел
  private stack: TreeNode[] = [];

  constructor(root: TreeNode | null) {
    this.pushLeft(root);
  }

  next(): number {
    // Вершина стека — следующий элемент in-order обхода
    const node = this.stack.pop()!;

    // После узла в in-order идёт его правое поддерево, начиная с самого левого узла
    this.pushLeft(node.right);
    return node.val;
  }

  hasNext(): boolean {
    return this.stack.length > 0;
  }

  // Спускаемся влево до упора, складывая узлы в стек
  private pushLeft(node: TreeNode | null): void {
    while (node !== null) {
      this.stack.push(node);
      node = node.left;
    }
  }
}

// Время: next — O(1) в среднем (каждый узел кладётся и снимается со стека ровно один раз),
//        hasNext — O(1)
// Память: O(h) — в стеке не больше узлов, чем высота дерева`,
    ideaRuMd: `### Идея: итеративный in-order обход, «поставленный на паузу»

Простое решение — в конструкторе сделать полный in-order обход в массив и дальше просто двигать индекс. \`next\` и \`hasNext\` будут \`O(1)\`, но память — \`O(n)\`, а follow-up просит \`O(h)\`.

Вспомним итеративный in-order со стеком:

\`\`\`
спуститься влево до упора, складывая узлы в стек
пока стек не пуст:
  node = pop()        // посетить node
  спуститься влево от node.right
\`\`\`

Разрежем этот цикл на шаги: каждый вызов \`next()\` — одна итерация.

- **Конструктор:** спускаемся влево от корня — на вершине стека оказывается минимум.
- **\`next()\`:** снимаем вершину (это ответ) и спускаемся влево от её правого ребёнка — там лежит следующий по величине элемент.
- **\`hasNext()\`:** стек не пуст.

### Почему O(1) в среднем

Отдельный вызов \`next()\` может спуститься на \`h\` уровней, но за весь обход каждый узел кладётся в стек и снимается ровно **один раз**. Значит, \`n\` вызовов стоят \`O(n)\` — амортизированно \`O(1)\` на вызов.

В стеке одновременно лежит не больше одного пути от корня, поэтому память \`O(h)\`.

**Сложность:** \`next\` — амортизированно \`O(1)\`, \`hasNext\` — \`O(1)\`, память \`O(h)\`.`,
    harness: `
function __run(ops, args) {
  const it = new BSTIterator(__toTree(args[0][0]));
  const out = [null];
  for (let k = 1; k < ops.length; k++) out.push(it[ops[k]](...args[k]));
  return out;
}
`,
    tests: [
      {
        args: [
          ['BSTIterator', 'next', 'next', 'hasNext', 'next', 'hasNext', 'next', 'hasNext', 'next', 'hasNext'],
          [[[7, 3, 15, null, null, 9, 20]], [], [], [], [], [], [], [], [], []],
        ],
        expected: [null, 3, 7, true, 9, true, 15, true, 20, false],
      },
      {
        args: [
          ['BSTIterator', 'hasNext', 'next', 'hasNext'],
          [[[1]], [], [], []],
        ],
        expected: [null, true, 1, false],
      },
      {
        args: [
          ['BSTIterator', 'next', 'next', 'next', 'hasNext', 'next', 'hasNext'],
          [[[2, 1, 3, null, null, null, 4]], [], [], [], [], [], []],
        ],
        expected: [null, 1, 2, 3, true, 4, false],
      },
    ],
  },

  'count-complete-tree-nodes': {
    theory: DIVIDE_AND_CONQUER,
    descriptionRuMd: `Дан корень \`root\` **полного** двоичного дерева. Верните количество узлов в дереве.

Согласно **[Википедии](http://en.wikipedia.org/wiki/Binary_tree#Types_of_binary_trees)**, в полном двоичном дереве все уровни, кроме, возможно, последнего, заполнены целиком, а все узлы последнего уровня расположены как можно левее. На последнем уровне \`h\` может быть от \`1\` до \`2^h\` узлов включительно.

Придумайте алгоритм, работающий быстрее, чем за \`O(n)\`.

**Пример 1:**

![](https://assets.leetcode.com/uploads/2021/01/14/complete.jpg)

\`\`\`
Вход: root = [1,2,3,4,5,6]
Выход: 6
\`\`\`

**Пример 2:**

\`\`\`
Вход: root = []
Выход: 0
\`\`\`

**Пример 3:**

\`\`\`
Вход: root = [1]
Выход: 1
\`\`\`

**Ограничения:**

- Количество узлов в дереве — в диапазоне \`[0, 5 * 10^4]\`.
- \`0 <= Node.val <= 5 * 10^4\`
- **Гарантируется**, что дерево полное.`,
    solutionTs: `function countNodes(root: TreeNode | null): number {
  if (root === null) return 0;

  // Высота по самому левому пути
  let leftHeight = 0;
  for (let n: TreeNode | null = root; n !== null; n = n.left) leftHeight++;

  // Высота по самому правому пути
  let rightHeight = 0;
  for (let n: TreeNode | null = root; n !== null; n = n.right) rightHeight++;

  // Высоты равны — дерево идеальное (все уровни заполнены): 2^h - 1 узлов
  if (leftHeight === rightHeight) {
    return 2 ** leftHeight - 1;
  }

  // Иначе считаем рекурсивно. Одно из поддеревьев обязательно идеальное
  // и посчитается сразу по формуле — поэтому рекурсия идёт вглубь только по одной ветке
  return 1 + countNodes(root.left) + countNodes(root.right);
}

// Время: O(log² n) — O(log n) уровней рекурсии, на каждом замер высоты за O(log n)
// Память: O(log n) — стек рекурсии`,
    ideaRuMd: `### Идея: идеальные поддеревья считаем по формуле

Обычный обход считает узлы за \`O(n)\` и не использует то, что дерево **полное**.

Ключевой факт: если высота по самому левому пути равна высоте по самому правому, дерево **идеальное** (все уровни заполнены), и в нём ровно \`2^h - 1\` узлов — считать их не нужно.

### Алгоритм

1. Измеряем \`leftHeight\` (идём только влево) и \`rightHeight\` (идём только вправо) — \`O(log n)\`.
2. Равны → возвращаем \`2^h - 1\`.
3. Не равны → \`1 + countNodes(left) + countNodes(right)\`.

### Почему это быстро

В полном дереве из двух поддеревьев корня **хотя бы одно идеальное**: граница последнего уровня проходит либо через левое поддерево (тогда правое идеальное, на уровень ниже), либо через правое (тогда левое идеальное). Идеальное поддерево вернёт ответ сразу после замера высот, и «настоящая» рекурсия продолжится только по одной ветке. Получаем \`O(log n)\` уровней по \`O(log n)\` работы.

### Альтернатива: бинарный поиск

Узнаём высоту \`h\`, а затем бинарным поиском ищем, сколько узлов на последнем уровне: существование узла с индексом \`k\` проверяется спуском от корня по битам \`k\` за \`O(h)\`. Итог тоже \`O(log² n)\`.

**Сложность:** время \`O(log² n)\`, память \`O(log n)\`.`,
    fn: 'countNodes',
    tests: [
      { args: [[1, 2, 3, 4, 5, 6]], argTypes: ['tree'], expected: 6 },
      { args: [[]], argTypes: ['tree'], expected: 0 },
      { args: [[1]], argTypes: ['tree'], expected: 1 },
      { args: [[1, 2, 3, 4, 5, 6, 7]], argTypes: ['tree'], expected: 7 },
      { args: [[1, 2, 3, 4]], argTypes: ['tree'], expected: 4 },
      { args: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]], argTypes: ['tree'], expected: 12 },
    ],
  },

  'lowest-common-ancestor-of-a-binary-tree': {
    theory: TREE_DFS,
    descriptionRuMd: `Дано двоичное дерево. Найдите наименьшего общего предка (LCA) двух заданных узлов дерева.

Согласно [определению LCA в Википедии](https://en.wikipedia.org/wiki/Lowest_common_ancestor): «Наименьший общий предок двух узлов \`p\` и \`q\` — это самый нижний узел дерева \`T\`, у которого и \`p\`, и \`q\` являются потомками (при этом **узел считается потомком самого себя**)».

**Пример 1:**

![](https://assets.leetcode.com/uploads/2018/12/14/binarytree.png)

\`\`\`
Вход: root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 1
Выход: 3
Пояснение: LCA узлов 5 и 1 — узел 3.
\`\`\`

**Пример 2:**

![](https://assets.leetcode.com/uploads/2018/12/14/binarytree.png)

\`\`\`
Вход: root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 4
Выход: 5
Пояснение: LCA узлов 5 и 4 — узел 5, так как по определению LCA узел может быть потомком самого себя.
\`\`\`

**Пример 3:**

\`\`\`
Вход: root = [1,2], p = 1, q = 2
Выход: 1
\`\`\`

**Ограничения:**

- Количество узлов в дереве — в диапазоне \`[2, 10^5]\`.
- \`-10^9 <= Node.val <= 10^9\`
- Все значения \`Node.val\` **различны**.
- \`p != q\`
- \`p\` и \`q\` присутствуют в дереве.`,
    solutionTs: `function lowestCommonAncestor(
  root: TreeNode | null,
  p: TreeNode | null,
  q: TreeNode | null,
): TreeNode | null {
  // Пустое поддерево ничего не содержит.
  // Если корень — p или q, он и есть ответ для этого поддерева:
  // либо второй узел ниже (тогда LCA — root), либо он в другой ветке выше
  if (root === null || root === p || root === q) {
    return root;
  }

  // Ищем p и q в левом и правом поддеревьях
  const left = lowestCommonAncestor(root.left, p, q);
  const right = lowestCommonAncestor(root.right, p, q);

  // p и q нашлись по разные стороны — root и есть самый нижний общий предок
  if (left !== null && right !== null) {
    return root;
  }

  // Иначе оба узла (или единственный найденный) в одной ветке — пробрасываем её результат наверх
  return left !== null ? left : right;
}

// Время: O(n) — каждый узел посещается не более одного раза
// Память: O(h) — стек рекурсии`,
    ideaRuMd: `### Идея: post-order DFS, который «поднимает» найденные узлы

Функция для поддерева возвращает:
- \`null\`, если в нём нет ни \`p\`, ни \`q\`;
- найденный узел (\`p\` или \`q\`), если в поддереве есть только один из них;
- их LCA, если там есть оба.

Для узла \`root\`:

1. \`root\` пуст, равен \`p\` или равен \`q\` → возвращаем \`root\`. Если это \`p\`, а \`q\` лежит ниже, ответ всё равно \`p\` (узел — потомок самого себя), поэтому глубже спускаться не нужно.
2. Рекурсивно ищем в левом и правом поддереве.
3. Оба результата не \`null\` → \`p\` и \`q\` в разных ветках, \`root\` — первая точка, где они «встретились». Это LCA.
4. Иначе возвращаем непустой результат (тот, что пришёл снизу).

Решение опирается на гарантию, что \`p\` и \`q\` **есть в дереве**. Без неё пришлось бы отдельно проверять, что найдены оба узла.

### Альтернатива

Обойти дерево и записать \`parent\` для каждого узла, затем поднять все предки \`p\` в \`Set\` и идти вверх от \`q\` до первого предка из множества. Тоже \`O(n)\`, но с \`O(n)\` памяти.

Для **BST** есть решение проще: спускаемся от корня, пока \`p\` и \`q\` по одну сторону от текущего значения.

**Сложность:** время \`O(n)\`, память \`O(h)\`.`,
    harness: `
function __run(arr, pVal, qVal) {
  const root = __toTree(arr);
  const find = (n, v) => (n === null ? null : n.val === v ? n : find(n.left, v) || find(n.right, v));
  const res = lowestCommonAncestor(root, find(root, pVal), find(root, qVal));
  return res === null ? null : res.val;
}
`,
    tests: [
      { args: [[3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], 5, 1], expected: 3 },
      { args: [[3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], 5, 4], expected: 5 },
      { args: [[1, 2], 1, 2], expected: 1 },
      { args: [[3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], 7, 4], expected: 2 },
      { args: [[3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], 7, 8], expected: 3 },
      { args: [[3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], 6, 4], expected: 5 },
    ],
  },
};
