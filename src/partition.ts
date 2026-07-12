export const partition = <T>(
  arr: T[],
  predicate: (item: T, index: number, arr: T[]) => boolean
): [T[], T[]] => {
  const out: [T[], T[]] = [[], []];
  for (const [i, item] of arr.entries()) {
    out[predicate(item, i, arr) ? 0 : 1].push(item);
  }
  return out;
};
