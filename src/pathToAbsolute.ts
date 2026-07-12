import { mapAccumulate } from "niall-utils/functional";

import { safeAt } from "./safeAt.ts";

import type { FillTuple } from "niall-utils/core";

interface Point {
  x: number;
  y: number;
}

interface PenState {
  pos: Point;
  start: Point;
}

interface Segment {
  pos: Point;
  code: string;
  values: number[];
}

interface ParsedCommand {
  code: string;
  relative: boolean;
  args: number[];
}

type PathTransform<N extends number> = (
  pos: Point,
  relative: boolean,
  args: FillTuple<number, N>
) => Segment;

const COMMAND_REGEX = /([acdghmlsqtvwz])([^acdghmlsqtvwz]*)/gi;
const NUMBER_REGEX = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;

const INITIAL_STATE: PenState = { pos: { x: 0, y: 0 }, start: { x: 0, y: 0 } };

const parseCommands = (pathString: string): ParsedCommand[] =>
  [...pathString.matchAll(COMMAND_REGEX)].map(match => {
    const letter = safeAt(match, 1);
    const argsText = safeAt(match, 2);
    const upCase = letter.toUpperCase();

    return {
      code: upCase,
      relative: letter !== upCase,
      args: [...argsText.matchAll(NUMBER_REGEX)].map(numberMatch =>
        Number.parseFloat(safeAt(numberMatch, 0))
      ),
    };
  });

const chunk = <T, N extends number>(
  arr: readonly T[],
  size: N
): FillTuple<T, N>[] => {
  const groups: FillTuple<T, N>[] = [];
  for (let i = 0; i < arr.length; i += size) {
    groups.push(arr.slice(i, i + size) as FillTuple<T, N>);
  }
  return groups;
};

const resolvePoint = (
  pos: Point,
  relative: boolean,
  x: number,
  y: number
): Point => (relative ? { x: pos.x + x, y: pos.y + y } : { x, y });

const moveTo: PathTransform<2> = (pos, relative, [x, y]) => {
  const next = resolvePoint(pos, relative, x, y);
  return { pos: next, code: "M", values: [next.x, next.y] };
};

const lineTo =
  (code: "L" | "T"): PathTransform<2> =>
  (pos, relative, [x, y]) => {
    const next = resolvePoint(pos, relative, x, y);
    return { pos: next, code, values: [next.x, next.y] };
  };

const horizontalTo: PathTransform<1> = (pos, relative, [x]) => {
  const next = { x: relative ? pos.x + x : x, y: pos.y };
  return { pos: next, code: "L", values: [next.x, next.y] };
};

const verticalTo: PathTransform<1> = (pos, relative, [y]) => {
  const next = { x: pos.x, y: relative ? pos.y + y : y };
  return { pos: next, code: "L", values: [next.x, next.y] };
};

const cubicTo: PathTransform<6> = (pos, relative, [x1, y1, x2, y2, x, y]) => {
  const c1 = resolvePoint(pos, relative, x1, y1);
  const c2 = resolvePoint(pos, relative, x2, y2);
  const next = resolvePoint(pos, relative, x, y);
  return {
    pos: next,
    code: "C",
    values: [c1.x, c1.y, c2.x, c2.y, next.x, next.y],
  };
};

const smoothTo =
  (code: "S" | "Q"): PathTransform<4> =>
  (pos, relative, [x1, y1, x, y]) => {
    const c1 = resolvePoint(pos, relative, x1, y1);
    const next = resolvePoint(pos, relative, x, y);
    return { pos: next, code, values: [c1.x, c1.y, next.x, next.y] };
  };

const arcTo: PathTransform<7> = (
  pos,
  relative,
  [rx, ry, angle, largeArc, sweep, x, y]
) => {
  const next = resolvePoint(pos, relative, x, y);
  return {
    pos: next,
    code: "A",
    values: [rx, ry, angle, largeArc, sweep, next.x, next.y],
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TRANSFORM_LOOKUP: Record<string, [number, PathTransform<any>]> = {
  L: [2, lineTo("L")],
  T: [2, lineTo("T")],
  H: [1, horizontalTo],
  V: [1, verticalTo],
  C: [6, cubicTo],
  S: [4, smoothTo("S")],
  Q: [4, smoothTo("Q")],
  A: [7, arcTo],
};

const formatSegment = ({ code, values }: Segment): string =>
  `${code} ${values.join(" ")}`;

const applyCommand = (
  state: PenState,
  { code, relative, args }: ParsedCommand
): [PenState, string[]] => {
  if (code === "Z") {
    return [{ pos: state.start, start: state.start }, ["Z"]];
  }

  if (code === "M") {
    const [firstGroup, ...restGroups] = chunk(args, 2);
    if (firstGroup === undefined) return [state, []];

    const move = moveTo(state.pos, relative, firstGroup);
    const [pos, lines] = restGroups.reduce<[Point, Segment[]]>(
      ([currentPos, segments], group) => {
        const segment = lineTo("L")(currentPos, relative, group);
        return [segment.pos, [...segments, segment]];
      },
      [move.pos, []]
    );

    return [{ pos, start: move.pos }, [move, ...lines].map(formatSegment)];
  }

  const transformParams = TRANSFORM_LOOKUP[code];
  if (transformParams === undefined) return [state, []];
  const [size, transform] = transformParams;

  const [pos, segments] = chunk(args, size).reduce<[Point, Segment[]]>(
    ([currentPos, segments], group) => {
      const segment = transform(currentPos, relative, group);
      return [segment.pos, [...segments, segment]];
    },
    [state.pos, []]
  );

  return [{ pos, start: state.start }, segments.map(formatSegment)];
};

export const convertPathToAbsolute = (pathString: string): string =>
  mapAccumulate(parseCommands(pathString), applyCommand, INITIAL_STATE)
    .flat()
    .join(" ");
