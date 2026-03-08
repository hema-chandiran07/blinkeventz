// src/audit/utils/diff.util.ts
export interface DiffResult {
  path: string;
  before: unknown;
  after: unknown;
}

export function diffObjects(
  before: unknown,
  after: unknown,
  path = '',
  seen = new WeakSet<object>(),
): DiffResult[] {
  if (before === after) {
    return [];
  }

  if (
    typeof before !== 'object' ||
    typeof after !== 'object' ||
    before === null ||
    after === null
  ) {
    return [{ path, before, after }];
  }

  if (seen.has(before as object)) {
    return [];
  }

  seen.add(before as object);

  const diffs: DiffResult[] = [];
  const keys = new Set([
    ...Object.keys(before as object),
    ...Object.keys(after as object),
  ]);

  for (const key of keys) {
    diffs.push(
      ...diffObjects(
        (before as any)[key],
        (after as any)[key],
        path ? `${path}.${key}` : key,
        seen,
      ),
    );
  }

  return diffs;
}