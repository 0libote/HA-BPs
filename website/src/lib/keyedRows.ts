/** Row identity belongs to the editor, never to Home Assistant configuration. */
export interface KeyedRow<T> {
  key: number;
  value: T;
}

export interface RowState<T> {
  values: readonly T[];
  rows: KeyedRow<T>[];
  nextKey: number;
}

/** Match each occurrence once, including duplicate objects and scalar values. */
export function reconcileRows<T>(previous: RowState<T>, values: readonly T[]): RowState<T> {
  const available = new Set(previous.rows);
  let nextKey = previous.nextKey;
  const rows = values.map((value) => {
    const match = previous.rows.find((row) => available.has(row) && Object.is(row.value, value));
    if (match) {
      available.delete(match);
      return match;
    }
    return { key: nextKey++, value };
  });
  return { values, rows, nextKey };
}
