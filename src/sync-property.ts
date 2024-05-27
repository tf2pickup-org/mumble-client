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

// allows for a map function to be called on property changes
// also accepts undefined
export function syncPropertyWithMapper<T extends object, K extends keyof T>(
  obj: T,
  key: K,
  mapper: (value: T[K]) => T[K] | undefined,
  value: T[K] | undefined,
): Record<string, Change<T[K] | undefined>> {
  if (value === undefined) {
    return {};
  }

  value = mapper(value)

  const previousValue = obj[key];

  // @ts-ignore
  obj[key] = value;
  return {
    [key]: { previousValue, currentValue: value },
  };
}