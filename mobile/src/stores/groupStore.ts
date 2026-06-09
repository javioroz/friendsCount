import { create } from 'zustand';
import { Group, Expense, Favor, Member, Balance, Settlement, MemberRanking } from '../types';

/**
 * Coerce any value into a string array. GunDB may return a native array, an
 * indexed object (`{0:'a',1:'b'}`), a GunDB chain node (`{_:{0:'a',1:'b'}}`),
 * a JSON string, or even `null`/`undefined`. We need a single helper that
 * understands every shape so the rest of the code can assume a real Array.
 */
const normalizeToStringArray = (value: any): string[] => {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) {
    return value.map((v) => String(v)).filter((v) => v.length > 0);
  }
  if (typeof value === 'string') {
    // Try to parse as JSON array first
    const trimmed = value.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((v: any) => String(v)).filter((v) => v.length > 0);
        }
      } catch {
        // fall through
      }
    }
    return [];
  }
  if (typeof value === 'object') {
    // Unwrap GunDB chain node if needed
    let current: any = value;
    if (current._ && typeof current._ === 'object' && Object.keys(current).every((k) => k === '_' || k === '>' || k === ':' || k === '#')) {
      current = current._;
    }
    const keys = Object.keys(current)
      .filter((k) => /^\d+$/.test(k))
      .sort((a, b) => Number(a) - Number(b));
    if (keys.length === 0) {
      // Maybe it's the __gun_array__ sentinel
      if (typeof current.__gun_array__ === 'string') {
        try {
          const parsed = JSON.parse(current.__gun_array__);
          if (Array.isArray(parsed)) {
            return parsed.map((v: any) => String(v)).filter((v) => v.length > 0);
          }
        } catch {
          // fall through
        }
      }
      return [];
    }
    return keys.map((k) => String(current[k])).filter((v) => v.length > 0);
  }
  return [];
};

interface GroupStore {
  groups: Group[];
  currentGroupId: string | null;
  
  // Group management
  addGroup: (group: Group) => void;
  removeGroup: (groupId: string) => void;
  setCurrentGroup: (groupId: string) => void;
  getCurrentGroup: () => Group | undefined;
  updateGroup: (groupId: string, updatedGroup: Group) => void;
  
  // Expense management
  addExpense: (groupId: string, expense: Expense) => void;
  removeExpense: (groupId: string, expenseId: string) => void;
  updateExpense: (groupId: string, expense: Expense) => void;
  
  // Favor management
  addFavor: (groupId: string, favor: Favor) => void;
  removeFavor: (groupId: string, favorId: string) => void;
  updateFavor: (groupId: string, favor: Favor) => void;
  
  // Balance and settlement management
  calculateBalances: (groupId: string) => Balance[];
  calculateBalancesFromExpenses: (group: Omit<Group, 'balances'> & { expenses: Expense[], members: Member[] }) => Balance[];
  calculateSettlements: (groupId: string) => Settlement[];
  
  // Rankings management
  calculateRankingsFromFavors: (group: { members: Member[]; favors: Favor[]; rankings: MemberRanking[] }) => MemberRanking[];
  updateMemberRanking: (groupId: string, ranking: MemberRanking) => void;
  getMemberRankings: (groupId: string) => MemberRanking[];
}

export const useGroupStore = create<GroupStore>((set, get) => ({
  groups: [],
  currentGroupId: null,
  
  addGroup: (group: Group) => {
    set((state) => ({
      groups: [...state.groups, group],
      currentGroupId: group.id,
    }));
  },
  
  removeGroup: (groupId: string) => {
    set((state) => {
      const newGroups = state.groups.filter((g) => g.id !== groupId);
      const newCurrentGroupId = state.currentGroupId === groupId ? null : state.currentGroupId;
      return {
        groups: newGroups,
        currentGroupId: newCurrentGroupId,
      };
    });
  },
  
  setCurrentGroup: (groupId: string) => {
    set({ currentGroupId: groupId });
  },
  
  getCurrentGroup: () => {
    const state = get();
    if (!state.currentGroupId) return undefined;
    return state.groups.find((g) => g.id === state.currentGroupId);
  },

  updateGroup: (groupId: string, updatedGroup: Group) => {
    set((state) => ({
      groups: state.groups.map((group) =>
        group.id === groupId ? updatedGroup : group
      ),
    }));
  },
  
  addExpense: (groupId: string, expense: Expense) => {
    set((state) => {
      const updatedGroups = state.groups.map((group) => {
        if (group.id === groupId) {
          // Avoid duplicates by id
          if (group.expenses.some((e) => e.id === expense.id)) {
            return group;
          }
          const updatedGroup = { 
            ...group, 
            expenses: [...group.expenses, expense] 
          };
          // Recalculate balances after adding expense
          const balances = get().calculateBalancesFromExpenses(updatedGroup);
          return { ...updatedGroup, balances };
        }
        return group;
      });
      return { groups: updatedGroups };
    });
  },
  
  updateExpense: (groupId: string, expense: Expense) => {
    set((state) => {
      const updatedGroups = state.groups.map((group) => {
        if (group.id === groupId) {
          const updatedGroup = {
            ...group,
            expenses: group.expenses.map((e) => (e.id === expense.id ? expense : e)),
          };
          // Recalculate balances after updating expense
          const balances = get().calculateBalancesFromExpenses(updatedGroup);
          return { ...updatedGroup, balances };
        }
        return group;
      });
      return { groups: updatedGroups };
    });
  },
  
  removeExpense: (groupId: string, expenseId: string) => {
    set((state) => {
      const updatedGroups = state.groups.map((group) => {
        if (group.id === groupId) {
          const updatedGroup = {
            ...group,
            expenses: group.expenses.filter((e) => e.id !== expenseId),
          };
          // Recalculate balances after removing expense
          const balances = get().calculateBalancesFromExpenses(updatedGroup);
          return { ...updatedGroup, balances };
        }
        return group;
      });
      return { groups: updatedGroups };
    });
  },
  
  addFavor: (groupId: string, favor: Favor) => {
    set((state) => {
      const updatedGroups = state.groups.map((group) => {
        if (group.id === groupId) {
          // Avoid duplicates by id
          if (group.favors.some((f) => f.id === favor.id)) {
            return group;
          }
          const updatedGroup = { 
            ...group, 
            favors: [...group.favors, favor] 
          };
          // Recalculate rankings after adding favor
          const rankings = get().calculateRankingsFromFavors(updatedGroup);
          return { ...updatedGroup, rankings };
        }
        return group;
      });
      return { groups: updatedGroups };
    });
  },
  
  updateFavor: (groupId: string, favor: Favor) => {
    set((state) => {
      const updatedGroups = state.groups.map((group) => {
        if (group.id === groupId) {
          const updatedGroup = {
            ...group,
            favors: group.favors.map((f) => (f.id === favor.id ? favor : f)),
          };
          // Recalculate rankings after updating favor
          const rankings = get().calculateRankingsFromFavors(updatedGroup);
          return { ...updatedGroup, rankings };
        }
        return group;
      });
      return { groups: updatedGroups };
    });
  },
  
  removeFavor: (groupId: string, favorId: string) => {
    set((state) => {
      const updatedGroups = state.groups.map((group) => {
        if (group.id === groupId) {
          const updatedGroup = {
            ...group,
            favors: group.favors.filter((f) => f.id !== favorId),
          };
          // Recalculate rankings after removing favor
          const rankings = get().calculateRankingsFromFavors(updatedGroup);
          return { ...updatedGroup, rankings };
        }
        return group;
      });
      return { groups: updatedGroups };
    });
  },
  
  calculateBalances: (groupId: string) => {
    const group = get().groups.find((g) => g.id === groupId);
    if (!group) return [];
    return get().calculateBalancesFromExpenses(group);
  },
  
  calculateBalancesFromExpenses: (group: { members: Member[]; expenses: Expense[] }) => {
    const balances: Map<string, number> = new Map();

    // Initialize all members with 0 balance
    group.members.forEach((member) => {
      balances.set(member.id, 0);
    });

    // Calculate balances from expenses
    group.expenses.forEach((expense) => {
      // Defensive: `sharedBy` may come from GunDB in several shapes
      // (real Array, an indexed object, a GunDB chain node, or even a JSON
      // string). Coerce to a clean string array before iterating so the
      // balance calculation never crashes with `forEach is not a function`.
      const sharedBy = normalizeToStringArray(expense.sharedBy);
      if (sharedBy.length === 0) return;

      const amountPerPerson = expense.amount / sharedBy.length;

      // The person who paid gets positive balance (they're owed money)
      balances.set(expense.paidBy, (balances.get(expense.paidBy) || 0) + expense.amount);

      // Each person who benefited gets negative balance (they owe money)
      sharedBy.forEach((memberId: string) => {
        balances.set(memberId, (balances.get(memberId) || 0) - amountPerPerson);
      });
    });

    return Array.from(balances.entries()).map(([memberId, amount]) => ({
      memberId,
      amount: Math.round(amount * 100) / 100, // Round to avoid floating point issues
    }));
  },
  
  calculateSettlements: (groupId: string) => {
    const balances = get().calculateBalances(groupId);
    const settlements: Settlement[] = [];
    
    // Greedy algorithm: match debtors with creditors
    const debtors = balances.filter((b) => b.amount < 0).sort((a, b) => a.amount - b.amount);
    const creditors = balances.filter((b) => b.amount > 0).sort((a, b) => b.amount - a.amount);
    
    let debtorIndex = 0;
    let creditorIndex = 0;
    
    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
      const debtor = debtors[debtorIndex];
      const creditor = creditors[creditorIndex];
      
      const debtAmount = Math.abs(debtor.amount);
      const creditAmount = creditor.amount;
      const settlementAmount = Math.min(debtAmount, creditAmount);
      
      settlements.push({
        from: debtor.memberId,
        to: creditor.memberId,
        amount: settlementAmount,
      });
      
      debtor.amount += settlementAmount;
      creditor.amount -= settlementAmount;
      
      if (Math.abs(debtor.amount) < 0.01) debtorIndex++;
      if (creditAmount < 0.01) creditorIndex++;
    }
    
    return settlements;
  },
  
  updateMemberRanking: (groupId: string, ranking: MemberRanking) => {
    set((state) => ({
      groups: state.groups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              rankings: [
                ...group.rankings.filter((r) => r.memberId !== ranking.memberId),
                ranking,
              ].sort((a, b) => b.score - a.score),
            }
          : group
      ),
    }));
  },
  
  getMemberRankings: (groupId: string) => {
    const group = get().groups.find((g) => g.id === groupId);
    return group?.rankings || [];
  },
  
  calculateRankingsFromFavors: (group: { members: Member[]; favors: Favor[]; rankings: MemberRanking[] }) => {
    // Initialize scores from existing rankings or 0
    const scores: Map<string, number> = new Map();
    const nicknames: Map<string, string> = new Map();
    
    // Get existing scores and nicknames from current rankings
    group.rankings.forEach((ranking) => {
      scores.set(ranking.memberId, ranking.score);
      if (ranking.nickname) {
        nicknames.set(ranking.memberId, ranking.nickname);
      }
    });
    
    // Initialize members without rankings to 0
    group.members.forEach((member) => {
      if (!scores.has(member.id)) {
        scores.set(member.id, 0);
      }
    });
    
    // Add scores from favors
    group.favors.forEach((favor) => {
      const score = favor.aiResponse?.score ?? favor.manualScore ?? 0;
      const currentScore = scores.get(favor.madeBy) || 0;
      scores.set(favor.madeBy, currentScore + score);
    });
    
    // Generate fun nicknames based on ranking position
    const sortedMembers = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1]);
    
    const funNicknames = [
      'El/La Generoso/a',    // 1st place
      'El/La Solidario/a',   // 2nd place
      'El/La Colaborador/a', // 3rd place
    ];
    
    // Assign nicknames based on position
    sortedMembers.forEach(([memberId, score], index) => {
      if (!nicknames.has(memberId)) {
        const member = group.members.find(m => m.id === memberId);
        const baseNickname = funNicknames[index] || `Puesto #${index + 1}`;
        // Personalize with member name (first 3 letters)
        const namePrefix = member ? member.name.substring(0, 3).toLowerCase() : '';
        nicknames.set(memberId, `${namePrefix ? namePrefix.charAt(0).toUpperCase() + namePrefix.slice(1) : ''} ${baseNickname}`);
      }
    });
    
    // Create final rankings sorted by score
    return Array.from(scores.entries())
      .map(([memberId, score]) => ({
        memberId,
        score,
        nickname: nicknames.get(memberId) || '',
      }))
      .sort((a, b) => b.score - a.score);
  },
}));
