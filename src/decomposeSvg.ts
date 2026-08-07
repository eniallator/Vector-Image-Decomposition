import { Option } from "niall-utils";

import {
  createComplex,
  unsafeComplexNumber,
  type ComplexNumber,
} from "./complex.ts";
import { computeFft } from "./fft.ts";
import { convertPathToAbsolute } from "./pathToAbsolute.ts";
import { safeAt } from "./safeAt.ts";

const pointsOnPathEl = (
  pathEl: SVGPathElement,
  sampleCount: number
): ComplexNumber[] => {
  const length = pathEl.getTotalLength();

  return new Array(sampleCount).fill(undefined).map((_, i) => {
    const point = pathEl.getPointAtLength((i / sampleCount) * length);
    return createComplex(point.x, point.y);
  });
};

// Splits `total` samples across `weights` proportionally, guaranteeing the
// resulting counts sum to exactly `total` (needed since computeFft requires
// a power-of-2 length overall).
const distributeSampleCounts = (weights: number[], total: number): number[] => {
  const sumWeights = weights.reduce((acc, weight) => acc + weight, 0);
  const raw =
    sumWeights === 0
      ? weights.map(() => total / weights.length)
      : weights.map(weight => (weight / sumWeights) * total);

  const counts = raw.map(Math.floor);
  const assigned = counts.reduce((acc, count) => acc + count, 0);
  const remainder = total - assigned;

  const remainderOrder = raw
    .map((value, i) => ({ i, frac: value - safeAt(counts, i) }))
    .sort((a, b) => b.frac - a.frac);

  for (let j = 0; j < remainder; j++) {
    const idx = safeAt(remainderOrder, j).i;
    counts[idx] = safeAt(counts, idx) + 1;
  }

  return counts;
};

const compoundToAtomicPaths = (pathEl: SVGPathElement): SVGPathElement[] =>
  Option.from(pathEl.getAttribute("d"))
    .map(convertPathToAbsolute)
    .map(absPath =>
      absPath.split(/(?=M)/i).map(atomicPath => {
        const path = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );
        path.setAttribute("d", atomicPath);
        for (const attr of pathEl.attributes) {
          if (attr.name.toLowerCase() !== "d") {
            path.setAttribute(attr.name, attr.value);
          }
        }
        return path;
      })
    )
    .getOrElse(() => []);

// Shifts every point by the same offset so the shape's top-left corner sits
// at the origin, since nothing downstream translates the epicycle drawing.
const normalizePath = (points: ComplexNumber[]): ComplexNumber[] => {
  const offset = points.reduce(
    (acc, point) => acc.min(point),
    createComplex(Infinity, Infinity)
  );
  return points.map(point => unsafeComplexNumber(point.copy().sub(offset)));
};

// Connect the starts and ends of each path element here, where it minimizes the total lengths of the connections
export const decomposeSvg = (
  svgEl: SVGElement,
  sampleCount: number = 256
): ComplexNumber[] => {
  const atomicPaths = [...svgEl.querySelectorAll("path")].flatMap(
    compoundToAtomicPaths
  );
  const pathLengths = atomicPaths.map(pathEl => pathEl.getTotalLength());
  const pathSampleCounts = distributeSampleCounts(pathLengths, sampleCount);
  const allPathPoints = atomicPaths.map((pathEl, i) =>
    pointsOnPathEl(pathEl, safeAt(pathSampleCounts, i))
  );

  // TODO: Traveling salesman problem
  const solvedPoints = allPathPoints;

  return computeFft(normalizePath(solvedPoints.flat()), false);
};
