import { Vector } from "vectyped";
import { safeGet } from "./safeGet.ts";

export interface ComplexSignals {
  re: Float32Array;
  im: Float32Array;
}

export const complexSignalsToVectors = (
  inverseSignals: ComplexSignals
): Vector<2>[] => {
  const length = inverseSignals.re.length;

  return new Array(length)
    .fill(undefined)
    .map((_, i) =>
      Vector.create(
        safeGet(inverseSignals.re, i) / length,
        safeGet(inverseSignals.im, i) / length
      )
    );
};
