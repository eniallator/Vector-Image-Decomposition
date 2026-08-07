import { unsafeTag, type Tagged } from "niall-utils";
import { Vector } from "vectyped";

export type ComplexNumber = Tagged<Vector<2>, "ComplexNumber">;
export const unsafeComplexNumber = unsafeTag<ComplexNumber>();

export const createComplex = (real: number, imaginary: number): ComplexNumber =>
  unsafeComplexNumber(Vector.create(real, imaginary));
