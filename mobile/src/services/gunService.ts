import Gun from 'gun';
import 'gun/sea';
import { Group, Expense, Favor, Member, MemberRanking } from '../types';

// Configuration from environment
const GUN_RELAY_URL = process.env.GUN_RELAY || 'ws://localhost:3001/gun';

// Singleton Gun instance
// Using 'any' type as Gun is a schemaless database and proper typing is complex
let gunInstance: any = null;

/**
 * Get or create the GunDB instance
 */
export const getGun = (): any => {
  if (!gunInstance) {
    gunInstance = Gun({
      peers: [GUN_RELAY_URL],
      localStorage: true,
      radisk: false,
    });
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