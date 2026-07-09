import { cartesianToPolar, polarToCartesian } from "niall-utils/math";
import { Vector } from "vectyped";

import { safeGet } from "./safeGet.ts";

import type { ComplexSignals } from "./complexSignals.ts";

export interface Epicycle {
  freq: number;
  amp: number;
  phase: number;
}

// Turns forward-FFT coefficients into rotating vectors (epicycles): each
// bin k is a circle of radius `amp` spinning at `freq` turns per unit t,
// starting at `phase`. Sorted by descending amplitude for the classic
// biggest-circle-first look.
export const toEpicycles = (signals: ComplexSignals): Epicycle[] => {
  const length = signals.re.length;

  return new Array(length)
    .fill(undefined)
    .map((_, k) => {
      const [amp, phase] = cartesianToPolar(
        safeGet(signals.re, k) / length,
        safeGet(signals.im, k) / length
      );

      return {
        freq: k > length / 2 ? k - length : k,
        amp,
        phase,
      };
    })
    .sort((a, b) => b.amp - a.amp);
};

// Cumulative centre of each epicycle at time t (chain[0] is the origin,
// the last entry is the traced point itself).
export const epicycleChain = (
  epicycles: Epicycle[],
  t: number
): Vector<2>[] => {
  const chain = [Vector.zero(2)];

  for (const { freq, amp, phase } of epicycles) {
    const angle = phase + 2 * Math.PI * freq * t;
    const centre = chain.at(-1) as Vector<2>;
    const [dx, dy] = polarToCartesian(amp, angle);

    chain.push(Vector.create(centre.x() + dx, centre.y() + dy));
  }

  return chain;
};
