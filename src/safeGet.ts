import { raise } from "niall-utils/core";

export const safeGet = <S, K extends keyof S>(
  structure: S,
  key: K,
  error: string = `Key ${String(key)} doesn't exist in ${structure}`
): NonNullable<S[K]> => structure[key] ?? raise(new Error(error));
