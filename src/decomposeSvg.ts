import { computeFft } from "./fft.ts";

import type { ComplexSignals } from "./complexSignals.ts";

export const decomposeSvgPath = (
  pathEl: SVGPathElement,
  sampleCount: number = 256
): ComplexSignals => {
  const length = pathEl.getTotalLength();

  const re = new Float32Array(sampleCount);
  const im = new Float32Array(sampleCount);

  for (let i = 0; i < sampleCount; i++) {
    const point = pathEl.getPointAtLength((i / sampleCount) * length);

    re[i] = point.x;
    im[i] = point.y;
  }

  return computeFft({ re, im }, false);
};

export const decomposeSvg = (
  svgEl: SVGElement,
  sampleCount: number = 256
): ComplexSignals[] =>
  [...svgEl.querySelectorAll("path")].map(pathEl =>
    decomposeSvgPath(pathEl, sampleCount)
  );
