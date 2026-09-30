import Gun from 'gun';
import 'gun/sea';
import { Group, Expense, Favor, Member, MemberRanking } from '../types';
import { useServerStore, normalizeRelayUrl } from '../stores/serverStore';

// Configuration from environment.
//
// Solo las variables que empiezan por EXPO_PUBLIC_ se sustituyen al compilar
// (ver node_modules/babel-preset-expo/build/inline-env-vars.js). Por eso el
// nombre es EXPO_PUBLIC_GUN_RELAY y no GUN_RELAY: esta ultima llega como
// undefined en un release build y la app caeria a localhost, que en un
// telefono es el propio telefono, con lo que no conectaria con ningun relay.
// Valor por defecto compilado en la app. Solo se usa si el usuario no ha
// configurado ninguna direccion en el menu de ajustes, de modo que un dominio
// mal configurado en el build se puede corregir sin republicar la app.
const buildRelayRaw = process.env.EXPO_PUBLIC_GUN_RELAY;

const DEFAULT_DEV_RELAY = 'ws://localhost:3001/gun';

// El manifest de release no declara usesCleartextTraffic, asi que Android
// bloquea ws://. En dev si esta permitido (src/debug/AndroidManifest.xml).
const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

// El valor del build tambien se normaliza: si alguien escribe un puerto
// duplicado o se inventa el esquema, Gun recibiria una cadena que ni es una URL
// y la app se quedaria sin conectar sin explicar por que. Si no se puede
// normalizar, se descarta y se avisa con el issue 'invalidBuild'.
const buildRelay = buildRelayRaw ? normalizeRelayUrl(buildRelayRaw) : null;

/**
 * URL del relay configurada por el usuario en los ajustes, o null si no hay.
 * Se lee del store en cada llamada (y no al importar el modulo) para que un
 * cambio hecho en caliente tenga efecto sin reiniciar la app.
 */
export const getConfiguredRelay = (): string | null =>
  useServerStore.getState().relayUrl;

/**
 * URL del relay que la app va a usar: la de los ajustes si existe, si no la
 * compilada en el build, y en dev el relay local.
 */
export const getRelayUrl = (): string =>
  getConfiguredRelay() || buildRelay || DEFAULT_DEV_RELAY;

/**
 * Problema de configuracion del relay, o null si esta bien.
 *
 * Se devuelve un codigo corto y no un texto: los textos viven en i18n y asi
 * se muestran traducidos. Ademas asi no depende de que una cadena larga
 * sobreviva al minificado del bundle de release, cosa que no ocurre de forma
 * fiable cuando el valor ausente se resuelve en tiempo de compilacion.
 */
export type RelayConfigIssue = 'cleartext' | 'invalidBuild';

export const getRelayUrlIssue = (): RelayConfigIssue | null => {
  if (isDev) return null;
  if (!getConfiguredRelay() && buildRelayRaw && !buildRelay) {
    // Solo se puede dar si el valor venia del build, no de los ajustes, porque
    // lo que guarda el usuario pasa antes por normalizeRelayUrl.
    return 'invalidBuild';
  }
  if (getRelayUrl().startsWith('ws://')) return 'cleartext';
  return null;
};

// Singleton Gun instance
// Using 'any' type as Gun is a schemaless database and proper typing is complex
let gunInstance: any = null;
let gunInstancePeer: string | null = null;

// Sockets opened by Gun, tracked through the WebSocket class we hand to it.
//
// Reaching into Gun's own opt.peers to close them is unreliable: gun.js keeps the
// peers in an internal structure that is not the one exposed to callers, and the
// socket may not even exist yet because Gun connects lazily. Passing our own
// WebSocket implementation is a documented option (opt.WebSocket) and lets us
// keep an exact list of every socket we own, so switching relay really releases
// the previous connection instead of leaking it.
const openSockets = new Set<any>();

const createTrackedWebSocket = (): any => {
  const Native = (globalThis as any).WebSocket;
  if (typeof Native !== 'function') return undefined;

  return new Proxy(Native, {
    construct(target, args: any[]) {
      const socket = new target(...args);
      openSockets.add(socket);
      return socket;
    },
  });
};

/**
 * Close every socket opened by Gun.
 *
 * Clearing onclose first is what stops Gun from reconnecting: it installs a
 * handler that calls reconnect(peer) when a socket drops, so closing without
 * clearing it would leave it retrying against the old relay in the background.
 */
export const closeGunSockets = (): void => {
  for (const socket of openSockets) {
    try {
      socket.onclose = null;
      socket.close();
    } catch {
      // Best effort: a socket that refuses to close must not break the UI.
    }
  }
  openSockets.clear();
};

/**
 * Get or create the GunDB instance
 */
export const getGun = (): any => {
  const currentUrl = getRelayUrl();
  if (gunInstance && gunInstancePeer !== currentUrl) {
    closeGunSockets();
    gunInstance = null;
  }
  if (!gunInstance) {
    gunInstance = Gun({
      peers: [currentUrl],
      localStorage: true,
      radisk: false,
      WebSocket: createTrackedWebSocket(),
    });
    gunInstancePeer = currentUrl;
  }
  return gunInstance;
};

/**
 * Get reference to a specific group's data
 */
export const getGroupRef = (groupId: string) => {
  return getGun().get('friendscount').get('groups').get(groupId);
};

/**
 * Group data structure in GunDB
 */
interface GunGroupData {
  meta: {
    id: string;
    name: string;
    icon: string;
    currency?: string;
    llmApiKey?: string;
    llmModel?: string;
    llmEndpoint?: string;
    createdAt: string;
    createdBy: string;
  };
  members: Record<string, Member>;
  expenses: Record<string, Expense>;
  favors: Record<string, Favor>;
  rankings: Record<string, MemberRanking>;
}

/**
 * Subscribe to group meta updates
 */
export const subscribeToGroupMeta = (
  groupId: string,
  callback: (meta: GunGroupData['meta']) => void
) => {
  getGroupRef(groupId).get('meta').on((data: GunGroupData['meta']) => {
    if (data) callback(data);
  });
};

/**
 * Subscribe to members updates
 */
export const subscribeToMembers = (
  groupId: string,
  callback: (members: Member[]) => void
) => {
  const membersMap = new Map<string, Member>();
  
  getGroupRef(groupId).get('members').map().on((data: Member | null, id: string) => {
    if (data) {
      membersMap.set(id, data);
    } else {
      membersMap.delete(id);
    }
    callback(Array.from(membersMap.values()));
  });
};

/**
 * Subscribe to expenses updates
 */
export const subscribeToExpenses = (
  groupId: string,
  callback: (expenses: Expense[]) => void
) => {
  const expensesMap = new Map<string, Expense>();
  
  getGroupRef(groupId).get('expenses').map().on((data: any, id: string) => {
    if (data) {
      const expense = deserializeFromGun(data) as Expense;
      expensesMap.set(id, expense);
    } else {
      expensesMap.delete(id);
    }
    callback(Array.from(expensesMap.values()));
  });
};

/**
 * Subscribe to favors updates
 */
export const subscribeToFavors = (
  groupId: string,
  callback: (favors: Favor[]) => void
) => {
  const favorsMap = new Map<string, Favor>();
  
  getGroupRef(groupId).get('favors').map().on((data: Favor | null, id: string) => {
    if (data) {
      favorsMap.set(id, data);
    } else {
      favorsMap.delete(id);
    }
    callback(Array.from(favorsMap.values()));
  });
};

/**
 * Subscribe to rankings updates
 */
export const subscribeToRankings = (
  groupId: string,
  callback: (rankings: MemberRanking[]) => void
) => {
  const rankingsMap = new Map<string, MemberRanking>();
  
  getGroupRef(groupId).get('rankings').map().on((data: MemberRanking | null, id: string) => {
    if (data) {
      rankingsMap.set(id, data);
    } else {
      rankingsMap.delete(id);
    }
    callback(Array.from(rankingsMap.values()));
  });
};

/**
 * Save or update group meta
 */
export const putGroupMeta = (
  groupId: string,
  meta: GunGroupData['meta']
): Promise<void> => {
  return new Promise((resolve, reject) => {
    getGroupRef(groupId).get('meta').put(meta, (ack: any) => {
      if (ack.err) reject(new Error(ack.err));
      else resolve();
    });
  });
};

/**
 * Save or update a member
 */
export const putMember = (
  groupId: string,
  member: Member
): Promise<void> => {
  return new Promise((resolve, reject) => {
    getGroupRef(groupId).get('members').get(member.id).put(member, (ack: any) => {
      if (ack.err) reject(new Error(ack.err));
      else resolve();
    });
  });
};

/**
 * Serialize an object so that it can be stored in GunDB.
 * GunDB does not support native arrays inside `put`, so we convert
 * every array field to a JSON string under a sibling key (`_json_<key>`).
 * The reader (`deserializeFromGun`) reverses the process transparently.
 */
const serializeForGun = (value: any): any => {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    // Mark with a sentinel key so the reader can detect it
    return { __gun_array__: JSON.stringify(value) };
  }
  if (typeof value === 'object') {
    const out: any = {};
    for (const k of Object.keys(value)) {
      out[k] = serializeForGun(value[k]);
    }
    return out;
  }
  return value;
};

/**
 * Heuristic: does the value look like a serialized array?
 * We accept three shapes GunDB has produced historically:
 *   - real Array
 *   - object with a `__gun_array__` sentinel holding a JSON string
 *   - object whose own keys are sequential numeric strings "0","1","2"
 *     (this is what GunDB returns when it round-trips a native array)
 *   - object with a single `_` sub-key whose value is another object of the
 *     same form (GunDB chain node pointing to the actual list)
 */
const hasNumericKeys = (value: any): boolean => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.keys(value).some((k) => /^\d+$/.test(k));
};

const keysAreOnlyGunMetadata = (value: any): boolean => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every((k) =>
    k === '_' || k === '>' || k === ':' || k === '#' || /^\d+$/.test(k)
  );
};

const gunChainToArray = (value: any): any[] => {
  // 1) Unwrap a single `_` pointer if the chain object only carries metadata
  //    pointing to the real list at value._.
  let current: any = value;
  // Walk through `>` (next) pointers if present
  const collected: any[] = [];
  // First try the simple indexed case
  if (hasNumericKeys(current)) {
    const keys = Object.keys(current)
      .filter((k) => /^\d+$/.test(k))
      .sort((a, b) => Number(a) - Number(b));
    for (const k of keys) {
      const v = current[k];
      // GunDB may store the actual element under a sub-key (e.g. value[k]._)
      if (v && typeof v === 'object' && '_' in v && typeof v._ === 'object' && hasNumericKeys(v._)) {
        collected.push(...gunChainToArray(v._));
      } else if (v && typeof v === 'object' && typeof v.__gun_array__ === 'string') {
        try {
          const parsed = JSON.parse(v.__gun_array__);
          if (Array.isArray(parsed)) {
            for (const item of parsed) collected.push(deserializeFromGun(item));
            continue;
          }
        } catch { /* fall through */ }
        collected.push(deserializeFromGun(v));
      } else {
        collected.push(deserializeFromGun(v));
      }
    }
    return collected;
  }
  return collected;
};

const deserializeFromGun = (value: any): any => {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map(deserializeFromGun);
  }
  if (typeof value === 'object') {
    // 1) New format: serialized via our helper, stored under __gun_array__
    if (typeof value.__gun_array__ === 'string') {
      try {
        const parsed = JSON.parse(value.__gun_array__);
        if (Array.isArray(parsed)) return parsed.map(deserializeFromGun);
      } catch {
        // fall through
      }
    }
    // 2) Indexed object (native array round-tripped through GunDB)
    if (hasNumericKeys(value)) {
      return gunChainToArray(value);
    }
    // 3) Empty object that is "only Gun metadata" – treat as []
    if (keysAreOnlyGunMetadata(value) && Object.keys(value).every((k) => k !== '_' && k !== '>' && k !== ':' && k !== '#')) {
      return [];
    }
    // 4) Plain object - recurse into fields
    const out: any = {};
    for (const k of Object.keys(value)) {
      // Skip GunDB internal metadata
      if (k === '_' || k === '>' || k === ':' || k === '#') continue;
      out[k] = deserializeFromGun(value[k]);
    }
    return out;
  }
  return value;
};

/**
 * Save or update an expense
 */
export const putExpense = (
  groupId: string,
  expense: Expense
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const payload = serializeForGun(expense);
    getGroupRef(groupId).get('expenses').get(expense.id).put(payload, (ack: any) => {
      if (ack.err) reject(new Error(ack.err));
      else resolve();
    });
  });
};

/**
 * Save or update a favor
 */
export const putFavor = (
  groupId: string,
  favor: Favor
): Promise<void> => {
  return new Promise((resolve, reject) => {
    getGroupRef(groupId).get('favors').get(favor.id).put(favor, (ack: any) => {
      if (ack.err) reject(new Error(ack.err));
      else resolve();
    });
  });
};

/**
 * Save or update a ranking
 */
export const putRanking = (
  groupId: string,
  ranking: MemberRanking
): Promise<void> => {
  return new Promise((resolve, reject) => {
    getGroupRef(groupId).get('rankings').get(ranking.memberId).put(ranking, (ack: any) => {
      if (ack.err) reject(new Error(ack.err));
      else resolve();
    });
  });
};

/**
 * Delete an expense
 */
export const deleteExpense = (
  groupId: string,
  expenseId: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    getGroupRef(groupId).get('expenses').get(expenseId).put(null, (ack: any) => {
      if (ack.err) reject(new Error(ack.err));
      else resolve();
    });
  });
};

/**
 * Delete a favor
 */
export const deleteFavor = (
  groupId: string,
  favorId: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    getGroupRef(groupId).get('favors').get(favorId).put(null, (ack: any) => {
      if (ack.err) reject(new Error(ack.err));
      else resolve();
    });
  });
};

/**
 * Create a new group with initial data
 */
export const createGroup = async (
  groupId: string,
  name: string,
  icon: string,
  createdBy: string,
  currency?: string
): Promise<void> => {
  const meta = {
    id: groupId,
    name,
    icon,
    currency,
    createdAt: new Date().toISOString(),
    createdBy,
  };
  
  await putGroupMeta(groupId, meta);
};

/**
 * Check connection status to GunDB relay
 */
export const checkConnection = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const gun = getGun();
    let connected = false;
    
    // Simple check - try to get a known path
    gun.get('friendscount').get('ping').put(Date.now());
    
    setTimeout(() => {
      resolve(connected);
    }, 3000);
    
    gun.get('friendscount').get('ping').on((data: any) => {
      if (data) {
        connected = true;
      }
    });
  });
};