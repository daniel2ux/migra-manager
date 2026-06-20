function serializeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  if (value instanceof Date) {
    return { _type: 'Date', _iso: value.toISOString() };
  }

  if (Array.isArray(value)) {
    return value.map(serializeValue);
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, serializeValue(v)]),
    );
  }

  return value;
}

export function serializeDoc(data: Record<string, unknown>): Record<string, unknown> {
  return serializeValue(data) as Record<string, unknown>;
}

function deserializeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map((v) => deserializeValue(v));
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;

    if (obj._type === 'Date' && typeof obj._iso === 'string') {
      return new Date(obj._iso);
    }

    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, deserializeValue(v)]),
    );
  }

  return value;
}

export function deserializeDoc(data: Record<string, unknown>): Record<string, unknown> {
  return deserializeValue(data) as Record<string, unknown>;
}
