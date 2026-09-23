/** 数学表达式白名单；不执行 JavaScript，不读取任何全局对象。 */
export type FormulaPair = {
  forward: string;
  inverse: string;
  min: number;
  max: number;
};
type Interval = [number, number];
type Analysis = { value: Interval; derivative: Interval };
type Node = { eval: (x: number) => number; analyze: (x: Interval) => Analysis };
const AUTO_INVERSE_FORMULA = 'auto';
const add = (a: Interval, b: Interval): Interval => [a[0] + b[0], a[1] + b[1]];
const neg = (a: Interval): Interval => [-a[1], -a[0]];
const mul = (a: Interval, b: Interval): Interval => {
  const v = [a[0] * b[0], a[0] * b[1], a[1] * b[0], a[1] * b[1]];
  return [Math.min(...v), Math.max(...v)];
};
const reciprocal = (a: Interval): Interval => {
  if (a[0] <= 0 && a[1] >= 0) throw new Error('公式定义域包含除零');
  return [1 / a[1], 1 / a[0]];
};
const power = (a: Interval, p: number): Interval => {
  if (
    !Number.isFinite(p) ||
    Math.abs(p) > 16 ||
    (a[0] < 0 && !Number.isInteger(p)) ||
    (a[0] <= 0 && a[1] >= 0 && p < 0)
  )
    throw new Error('幂的定义域无效，指数绝对值不能超过16');
  const lo = a[0] ** p,
    hi = a[1] ** p;
  return [
    p > 0 && Number.isInteger(p) && p % 2 === 0 && a[0] <= 0 && a[1] >= 0
      ? 0
      : Math.min(lo, hi),
    Math.max(lo, hi),
  ];
};
export function compileAxisFormula(expression: string): Node {
  if (
    typeof expression !== 'string' ||
    !expression.trim() ||
    expression.length > 256
  )
    throw new Error('公式长度须为1–256字符');
  const tokens =
    expression.match(
      /(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|[A-Za-z][A-Za-z0-9]*|[+\-*/^()]/g,
    ) ?? [];
  if (tokens.join('') !== expression.replace(/\s/g, ''))
    throw new Error('公式含有不允许的字符');
  let cursor = 0,
    nodes = 0,
    depth = 0;
  const constant = (n: number): Node => ({
    eval: () => n,
    analyze: () => ({ value: [n, n], derivative: [0, 0] }),
  });
  function atom(): Node {
    if (++nodes > 128 || ++depth > 32) throw new Error('公式计算预算超限');
    const token = tokens[cursor++];
    let node: Node;
    if (token === '+' || token === '-') {
      const child = parse(2);
      node =
        token === '+'
          ? child
          : {
              eval: (x) => -child.eval(x),
              analyze: (x) => {
                const a = child.analyze(x);
                return { value: neg(a.value), derivative: neg(a.derivative) };
              },
            };
    } else if (token === '(') {
      node = parse(0);
      if (tokens[cursor++] !== ')') throw new Error('公式括号不匹配');
    } else if (token === 'x')
      node = {
        eval: (x) => x,
        analyze: (x) => ({ value: x, derivative: [1, 1] }),
      };
    else if (token === 'pi' || token === 'e')
      node = constant(token === 'pi' ? Math.PI : Math.E);
    else if (token && /^(?:\d|\.)/.test(token)) {
      const n = Number(token);
      if (!Number.isFinite(n)) throw new Error('公式常数必须有限');
      node = constant(n);
    } else if (
      token &&
      ['sqrt', 'log', 'ln', 'log10', 'log2', 'exp', 'abs'].includes(token)
    ) {
      if (tokens[cursor++] !== '(') throw new Error('函数参数须放入括号');
      const child = parse(0);
      if (tokens[cursor++] !== ')') throw new Error('函数括号不匹配');
      const fn =
        token === 'sqrt'
          ? Math.sqrt
          : token === 'exp'
            ? Math.exp
            : token === 'abs'
              ? Math.abs
              : token === 'log10'
                ? Math.log10
                : token === 'log2'
                  ? Math.log2
                  : Math.log;
      node = {
        eval: (x) => fn(child.eval(x)),
        analyze: (x) => {
          const a = child.analyze(x);
          let value: Interval, factor: Interval;
          if (token === 'abs') {
            if (a.value[0] < 0 && a.value[1] > 0)
              throw new Error('绝对值定义域跨零，无法确认单调性');
            const sign = a.value[1] <= 0 ? -1 : 1;
            value = sign < 0 ? neg(a.value) : a.value;
            factor = [sign, sign];
          } else {
            if (token !== 'exp' && a.value[0] <= 0)
              throw new Error('对数或平方根的公式区间须严格为正');
            value = [fn(a.value[0]), fn(a.value[1])];
            factor =
              token === 'exp'
                ? value
                : token === 'sqrt'
                  ? [0.5 / Math.sqrt(a.value[1]), 0.5 / Math.sqrt(a.value[0])]
                  : mul(reciprocal(a.value), [
                      1 /
                        (token === 'log10'
                          ? Math.LN10
                          : token === 'log2'
                            ? Math.LN2
                            : 1),
                      1 /
                        (token === 'log10'
                          ? Math.LN10
                          : token === 'log2'
                            ? Math.LN2
                            : 1),
                    ]);
          }
          return { value, derivative: mul(factor, a.derivative) };
        },
      };
    } else
      throw new Error(
        '仅支持x、常数、四则运算、幂和sqrt/log/log10/log2/exp/abs函数',
      );
    depth--;
    return node;
  }
  function parse(minPriority: number): Node {
    let left = atom();
    while (cursor < tokens.length) {
      const op = tokens[cursor]!,
        priority =
          op === '+' || op === '-'
            ? 1
            : op === '*' || op === '/'
              ? 2
              : op === '^'
                ? 3
                : 0;
      if (priority <= minPriority) break;
      cursor++;
      const right = parse(op === '^' ? priority - 1 : priority),
        a = left;
      left = {
        eval: (x) => {
          const u = a.eval(x),
            v = right.eval(x);
          return op === '+'
            ? u + v
            : op === '-'
              ? u - v
              : op === '*'
                ? u * v
                : op === '/'
                  ? u / v
                  : u ** v;
        },
        analyze: (x) => {
          const u = a.analyze(x),
            v = right.analyze(x);
          if (op === '+' || op === '-')
            return {
              value: add(u.value, op === '+' ? v.value : neg(v.value)),
              derivative: add(
                u.derivative,
                op === '+' ? v.derivative : neg(v.derivative),
              ),
            };
          if (op === '*')
            return {
              value: mul(u.value, v.value),
              derivative: add(
                mul(u.derivative, v.value),
                mul(u.value, v.derivative),
              ),
            };
          if (op === '/')
            return {
              value: mul(u.value, reciprocal(v.value)),
              derivative: mul(
                add(
                  mul(u.derivative, v.value),
                  neg(mul(u.value, v.derivative)),
                ),
                reciprocal(power(v.value, 2)),
              ),
            };
          if (
            v.value[0] !== v.value[1] ||
            v.derivative[0] !== 0 ||
            v.derivative[1] !== 0
          )
            throw new Error('幂指数必须是常数');
          const p = v.value[0];
          return {
            value: power(u.value, p),
            derivative:
              p === 0
                ? [0, 0]
                : mul(mul([p, p], power(u.value, p - 1)), u.derivative),
          };
        },
      };
    }
    return left;
  }
  const result = parse(0);
  if (cursor !== tokens.length) throw new Error('公式语法无效');
  return result;
}
export function validateFormulaPair(pair: FormulaPair) {
  if (
    !pair ||
    !Number.isFinite(pair.min) ||
    !Number.isFinite(pair.max) ||
    pair.min >= pair.max
  )
    throw new Error('公式定义域必须有限且递增');
  const direct = compileAxisFormula(pair.forward),
    inverseNode =
      pair.inverse === AUTO_INVERSE_FORMULA
        ? undefined
        : compileAxisFormula(pair.inverse);
  const check = (node: Node, domain: Interval) => {
    const analysis = node.analyze(domain),
      d = analysis.derivative;
    if (
      ![...analysis.value, ...d].every(Number.isFinite) ||
      !((d[0] >= 0 && d[1] > 0) || (d[1] <= 0 && d[0] < 0))
    )
      throw new Error('无法在整个区间确认公式严格单调，请缩小定义域或简化公式');
  };
  check(direct, [pair.min, pair.max]);
  const lo = direct.eval(pair.min),
    hi = direct.eval(pair.max);
  if (inverseNode) check(inverseNode, [Math.min(lo, hi), Math.max(lo, hi)]);
  const inverse = inverseNode
    ? inverseNode.eval
    : (value: number) => {
        const outputMin = Math.min(lo, hi),
          outputMax = Math.max(lo, hi);
        if (!Number.isFinite(value) || value < outputMin || value > outputMax)
          return NaN;
        if (value === lo) return pair.min;
        if (value === hi) return pair.max;
        const increasing = hi > lo;
        let min = pair.min,
          max = pair.max;
        for (let i = 0; i < 80; i++) {
          const middle = min + (max - min) / 2,
            result = direct.eval(middle);
          if (result < value === increasing) min = middle;
          else max = middle;
        }
        return min + (max - min) / 2;
      };
  for (let i = 0; i <= 64; i++) {
    const x = pair.min * (1 - i / 64) + pair.max * (i / 64),
      y = direct.eval(x),
      back = inverse(y);
    const tolerance =
      Math.max(Math.abs(x), pair.max - pair.min, Number.MIN_VALUE) * 1e-9;
    if (!Number.isFinite(back) || Math.abs(back - x) > tolerance)
      throw new Error('正向与反向公式不能互相还原');
    const v = lo * (1 - i / 64) + hi * (i / 64),
      round = direct.eval(inverse(v));
    if (
      !Number.isFinite(round) ||
      Math.abs(round - v) >
        Math.max(Math.abs(v), Math.abs(hi - lo), Number.MIN_VALUE) * 1e-9
    )
      throw new Error('反向公式的值域与正向公式不一致');
  }
  return { forward: direct.eval, inverse };
}
