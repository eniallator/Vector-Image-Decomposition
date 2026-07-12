import { Option } from "niall-utils";

import { createComplex } from "./complex.ts";
import { computeFft } from "./fft.ts";
import { convertPathToAbsolute } from "./pathToAbsolute.ts";

import type { ComplexNumber } from "./complex.ts";

const pointsOnPathEl = (
  pathEl: SVGPathElement,
  sampleCount: number = 256
): ComplexNumber[] => {
  console.log(pathEl);
  const length = pathEl.getTotalLength();

  return new Array(sampleCount).fill(undefined).map((_, i) => {
    const point = pathEl.getPointAtLength((i / sampleCount) * length);
    return createComplex(point.x, point.y);
  });
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

// Connect the starts and ends of each path element here, where it minimizes the total lengths of the connections
export const decomposeSvg = (
  svgEl: SVGElement,
  sampleCount: number = 256
): ComplexNumber[] => {
  const atomicPaths = [...svgEl.querySelectorAll("path")].flatMap(
    compoundToAtomicPaths
  );
  console.log(atomicPaths);
  const allPathPoints = atomicPaths.map(pathEl =>
    pointsOnPathEl(pathEl, sampleCount)
  );

  // TODO: Traveling salesman problem
  const solvedPoints = allPathPoints;

  return computeFft(solvedPoints.flat(), false);
};
