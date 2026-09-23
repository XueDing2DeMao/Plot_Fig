type Decimal = { coefficient: bigint; exponent: number };

function decimal(value: number): Decimal {
  const [mantissa, exponent = '0'] = String(value).toLowerCase().split('e');
  const fraction = mantissa!.split('.')[1]?.length ?? 0;
  return {
    coefficient: BigInt(mantissa!.replace('.', '')),
    exponent: Number(exponent) - fraction,
  };
}

function units(value: Decimal, exponent: number): bigint {
  return value.coefficient * 10n ** BigInt(value.exponent - exponent);
}

function floorDivision(numerator: bigint, denominator: bigint): bigint {
  const quotient = numerator / denominator;
  return numerator < 0n && numerator % denominator !== 0n
    ? quotient - 1n
    : quotient;
}

function safeIndex(value: bigint): number {
  const limit = BigInt(Number.MAX_SAFE_INTEGER);
  if (value > limit || value < -limit)
    throw new Error(
      '主刻度格点索引超出安全整数范围，请增大间隔或将锚点移近坐标范围',
    );
  return Number(value);
}

// 使用输入数值可往返的十进制表示计算格点，避免统一截断有效数字。
export function decimalTickGrid(anchor: number, step: number) {
  const origin = decimal(anchor),
    increment = decimal(step);
  const exponent = Math.min(origin.exponent, increment.exponent);
  const originUnits = units(origin, exponent),
    stepUnits = units(increment, exponent);
  return {
    value: (index: number): number =>
      Number(`${originUnits + BigInt(index) * stepUnits}e${exponent}`),
    bounds: (min: number, max: number): { first: number; last: number } => {
      const low = decimal(min),
        high = decimal(max);
      const shared = Math.min(exponent, low.exponent, high.exponent);
      const offset = units(origin, shared),
        divisor = units(increment, shared);
      const first = -floorDivision(-(units(low, shared) - offset), divisor);
      const last = floorDivision(units(high, shared) - offset, divisor);
      return { first: safeIndex(first), last: safeIndex(last) };
    },
  };
}
