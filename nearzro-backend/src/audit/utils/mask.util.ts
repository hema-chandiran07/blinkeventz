// src/audit/utils/mask.util.ts
const SENSITIVE_KEYS = [
  'password',
  'pass',
  'hash',
  'token',
  'secret',
  'account',
  'doc',
  'email',
  'phone',
];

const MASK = '***REDACTED***';

export function maskSensitiveData<T>(
  input: T,
  seen = new WeakMap<object, any>(),
): T {
  if (input === null || typeof input !== 'object') {
    return input;
  }

  if (seen.has(input as object)) {
    return seen.get(input as object);
  }

  if (Array.isArray(input)) {
    const arr: any[] = [];
    seen.set(input, arr);
    for (const item of input) {
      arr.push(maskSensitiveData(item, seen));
    }
    return arr as T;
  }

  const output: Record<string, any> = {};
  seen.set(input as object, output);

  for (const [key, value] of Object.entries(input)) {
    const isSensitive = SENSITIVE_KEYS.some((k) =>
      key.toLowerCase().includes(k),
    );

    output[key] = isSensitive
      ? MASK
      : maskSensitiveData(value, seen);
  }

  return output as T;
}