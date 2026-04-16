export type Result<T, E extends string> =
  | { ok: true; value: T }
  | { ok: false; code: E; message: string };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E extends string>(code: E, message: string): Result<never, E> {
  return { ok: false, code, message };
}
