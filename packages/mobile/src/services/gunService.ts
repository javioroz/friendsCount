import Gun from 'gun';
import 'gun/sea';
import { Group, Expense, Favor, Member, MemberRanking } from '../types';

// Configuration from environment
const GUN_RELAY_URL = process.env.EXPO_PUBLIC_GUN_RELAY || 'ws://localhost:3001/gun';

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
  
  getGroupRef(groupId).get('expenses').map().on((data: Expense | null, id: string) => {
    if (data) {
      expensesMap.set(id, data);
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
 * Save or update an expense
 */
export const putExpense = (
  groupId: string,
  expense: Expense
): Promise<void> => {
  return new Promise((resolve, reject) => {
    getGroupRef(groupId).get('expenses').get(expense.id).put(expense, (ack: any) => {
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