import { Change } from './change';

/**
 * @internal
 */
export function syncProperty<T extends object, K extends keyof T>(
  obj: T,
  key: K,
  value: T[K] | undefined,
): Record<string, Change<T[K]>> | Record<string, never> {
  if (value === undefined) {
    return {};
  }

  const previousValue = obj[key];
  obj[key] = value;
  return {
    [key]: { previousValue, currentValue: value },
  };
}