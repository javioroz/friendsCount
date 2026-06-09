/**
 * Helpers to read data from GunDB and normalize it to plain JSON shapes
 * that can be safely returned by the REST API. GunDB can return data in
 * several weird shapes (chain nodes, indexed objects, sentinel-serialized
 * arrays, etc.), so we centralize all the normalization logic here.
 *
 * The shapes we have to handle, per the mobile client (`gunService.ts`):
 *  - Members / expenses / favors / rankings are stored as records keyed by id:
 *      { [id]: { ...data, sharedBy?: __gun_array__ JSON string, ... } }
 *  - The serializer marks arrays with a `__gun_array__` sentinel holding a
 *    JSON string. We reverse that here.
 *  - GunDB round-trips native arrays as indexed objects `{0:...,1:...}`.
 *  - GunDB chain nodes carry internal metadata keys (`_`, `>`, `:`, `#`).
 */

const GUN_META_KEYS = new Set(['_', '>', ':', '#']);

const isPlainObject = (v: any): v is Record<string, any> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

const hasNumericKeys = (v: any): boolean => {
  if (!isPlainObject(v)) return false;
  return Object.keys(v).some((k) => /^\d+$/.test(k));
};

const unwrapChain = (v: any): any => {
  // Strip GunDB internal metadata. If the only keys are metadata (plus maybe
  // an underscore pointer), return the inner value.
  if (!isPlainObject(v)) return v;
  const keys = Object.keys(v);
  const dataKeys = keys.filter((k) => !GUN_META_KEYS.has(k));
  if (dataKeys.length === 0) {
    return v._ ?? v;
  }
  return v;
};

/**
 * Convert any GunDB-shaped value into a plain JS array, recursing into
 * nested elements.
 */
const toArray = (v: any): any[] => {
  if (v === null || v === undefined) return [];
  if (Array.isArray(v)) return v.map(deserialize);
  if (!isPlainObject(v)) return [];

  // 1) __gun_array__ sentinel (our explicit serializer)
  if (typeof v.__gun_array__ === 'string') {
    try {
      const parsed = JSON.parse(v.__gun_array__);
      if (Array.isArray(parsed)) return parsed.map(deserialize);
    } catch {
      /* fall through */
    }
  }

  // 2) Indexed object produced when GunDB round-trips a native array
  if (hasNumericKeys(v)) {
    const keys = Object.keys(v)
      .filter((k) => /^\d+$/.test(k))
      .sort((a, b) => Number(a) - Number(b));
    const out: any[] = [];
    for (const k of keys) {
      const element = v[k];
      // Element can be either a plain object or another chain node.
      out.push(deserialize(unwrapChain(element)));
    }
    return out;
  }

  // 3) Single-`_`-pointer chain node wrapping the real value
  if (Object.keys(v).every((k) => GUN_META_KEYS.has(k))) {
    return toArray(unwrapChain(v));
  }

  // 4) Single value, wrap it
  return [deserialize(v)];
};

/**
 * Recursively normalize any value coming out of GunDB.
 */
export const deserialize = (v: any): any => {
  if (v === null || v === undefined) return v;
  if (typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(deserialize);

  // __gun_array__ sentinel
  if (typeof (v as any).__gun_array__ === 'string') {
    try {
      const parsed = JSON.parse((v as any).__gun_array__);
      if (Array.isArray(parsed)) return parsed.map(deserialize);
    } catch {
      /* fall through */
    }
  }

  if (hasNumericKeys(v)) {
    return toArray(v);
  }

  // Plain object: strip metadata and recurse
  const out: Record<string, any> = {};
  for (const k of Object.keys(v)) {
    if (GUN_META_KEYS.has(k)) continue;
    out[k] = deserialize(v[k]);
  }
  return out;
};

/**
 * Collect every child of a GunDB `map()` collection into an array of
 * `{ id, ...data }` objects. The `map().once()` callback signature in GunDB
 * is `(data, id)`, so we use it directly.
 */
export const collectMap = (
  ref: any,
  apply?: (item: any) => any
): Promise<any[]> => {
  return new Promise((resolve) => {
    const items: any[] = [];
    let pending = 0;
    let started = false;
    let settleTimer: NodeJS.Timeout | null = null;

    const settle = () => {
      if (settleTimer) clearTimeout(settleTimer);
      // Give Gun a moment to deliver all children, then resolve.
      settleTimer = setTimeout(() => {
        resolve(items);
      }, 250);
    };

    try {
      ref.map().once((data: any, id: string) => {
        if (!data) return;
        // data may be `{ _: realValue }` (chain node) for some shapes
        const real = isPlainObject(data) && data._ && Object.keys(data).every((k) => GUN_META_KEYS.has(k) || k === '_')
          ? data._
          : data;

        const normalized = deserialize(real);
        if (normalized === undefined || normalized === null) return;
        const result = apply ? apply(normalized) : normalized;
        if (result && typeof result === 'object' && !('id' in result)) {
          (result as any).id = id;
        }
        items.push(result);
      });
      started = true;
    } catch (err) {
      // If `map()` is not available (e.g. empty collection) we just resolve.
      resolve(items);
      return;
    }

    // Safety net: if nothing ever fires we still resolve after a short delay.
    setTimeout(() => {
      if (!started || items.length === 0) {
        // Don't replace items if some have arrived; just resolve.
      }
      settle();
    }, 1500);

    // Trigger settle in case map().once is synchronous-ish
    settle();
  });
};
