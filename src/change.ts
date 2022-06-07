export interface Change<T = unknown> {
  previousValue: T;
  currentValue: T;
}
