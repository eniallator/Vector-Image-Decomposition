import { raise } from "niall-utils/core";

export const safeGet = <S, K extends keyof S>(
  structure: S,
  key: K,
  error: string = `Key ${String(key)} doesn't exist in ${structure}`
): NonNullable<S[K]> => structure[key] ?? raise(new Error(error));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const safeAt = <S extends { at: (key: any) => unknown }>(
  structure: S,
  key: Parameters<S["at"]>[0],
  error: string = `Key ${String(key)} doesn't exist in ${JSON.stringify(structure)}`
): NonNullable<ReturnType<S["at"]>> =>
  (structure.at(key) ?? raise(new Error(error))) as NonNullable<
    ReturnType<S["at"]>
  >;
