import { createComplex, unsafeComplexNumber } from "./complex.ts";
import { safeGet } from "./safeGet.ts";

import type { ComplexNumber } from "./complex.ts";

// Signals has length 2^x
export const computeFft = (
  signals: ComplexNumber[],
  inverse: boolean
): ComplexNumber[] => {
  const n = signals.length;
  if (n <= 1) return signals;

  const halfN = n / 2;

  const even = new Array<ComplexNumber>(halfN);
  const odd = new Array<ComplexNumber>(halfN);

  for (let i = 0; i < halfN; i++) {
    even[i] = safeGet(signals, 2 * i);
    odd[i] = safeGet(signals, 2 * i + 1);
  }

  const evenFFT = computeFft(even, inverse);
  const oddFFT = computeFft(odd, inverse);

  const out = new Array<ComplexNumber>(n);

  for (let k = 0; k < halfN; k++) {
    const angle = ((inverse ? 1 : -1) * (2 * Math.PI * k)) / n;
    const twiddleRe = Math.cos(angle);
    const twiddleIm = Math.sin(angle);

    const currOdd = safeGet(oddFFT, k);
    const currEven = safeGet(evenFFT, k);

    const t = createComplex(
      currOdd.x() * twiddleRe - currOdd.y() * twiddleIm,
      currOdd.x() * twiddleIm + currOdd.y() * twiddleRe
    );

    out[k] = unsafeComplexNumber(currEven.copy().add(t));
    out[k + halfN] = unsafeComplexNumber(currEven.copy().sub(t));
  }

  return out;
};
