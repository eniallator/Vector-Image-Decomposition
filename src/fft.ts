import type { ComplexSignals } from "./complexSignals.ts";
import { safeGet } from "./safeGet.ts";

// Signals have lengths of 2^x
export const computeFft = (
  signals: ComplexSignals,
  inverse: boolean
): ComplexSignals => {
  const n = signals.re.length;
  if (n <= 1) return signals;

  const halfN = n / 2;

  const reEven = new Float32Array(halfN);
  const imEven = new Float32Array(halfN);
  const reOdd = new Float32Array(halfN);
  const imOdd = new Float32Array(halfN);

  for (let i = 0; i < halfN; i++) {
    reEven[i] = safeGet(signals.re, 2 * i);
    imEven[i] = safeGet(signals.im, 2 * i);
    reOdd[i] = safeGet(signals.re, 2 * i + 1);
    imOdd[i] = safeGet(signals.im, 2 * i + 1);
  }

  const evenFFT = computeFft({ re: reEven, im: imEven }, inverse);
  const oddFFT = computeFft({ re: reOdd, im: imOdd }, inverse);

  const outRe = new Float32Array(n);
  const outIm = new Float32Array(n);

  for (let k = 0; k < halfN; k++) {
    const angle = ((inverse ? 1 : -1) * (2 * Math.PI * k)) / n;
    const twiddleRe = Math.cos(angle);
    const twiddleIm = Math.sin(angle);

    const tRe =
      safeGet(oddFFT.re, k) * twiddleRe - safeGet(oddFFT.im, k) * twiddleIm;
    const tIm =
      safeGet(oddFFT.re, k) * twiddleIm + safeGet(oddFFT.im, k) * twiddleRe;

    outRe[k] = safeGet(evenFFT.re, k) + tRe;
    outIm[k] = safeGet(evenFFT.im, k) + tIm;

    outRe[k + halfN] = safeGet(evenFFT.re, k) - tRe;
    outIm[k + halfN] = safeGet(evenFFT.im, k) - tIm;
  }

  return { re: outRe, im: outIm };
};
