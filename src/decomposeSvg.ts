import { computeFft } from "./fft.ts";

import { createComplex, type ComplexNumber } from "./complex.ts";

export const decomposeSvgPath = (
  pathEl: SVGPathElement,
  sampleCount: number = 256
): ComplexNumber[] => {
  const length = pathEl.getTotalLength();

  const out = new Array<ComplexNumber>(sampleCount);

  for (let i = 0; i < sampleCount; i++) {
    const point = pathEl.getPointAtLength((i / sampleCount) * length);

    out[i] = createComplex(point.x, point.y);
  }

  return computeFft(out, false);
};

export const decomposeSvg = (
  svgEl: SVGElement,
  sampleCount: number = 256
): ComplexNumber[][] =>
  [...svgEl.querySelectorAll("path")].map(pathEl =>
    decomposeSvgPath(pathEl, sampleCount)
  );
