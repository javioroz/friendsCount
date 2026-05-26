import { useEffect, useRef } from 'react';
import {
  subscribeToGroupMeta,
  subscribeToMembers,
  subscribeToExpenses,
  subscribeToFavors,
  subscribeToRankings,
} from './gunService';
import { useGroupStore } from '../stores/groupStore';
import { Group, Member, Expense, Favor, MemberRanking } from '../types';

/**
 * Hook para sincronizar un grupo específico con GunDB
 * Escucha cambios en tiempo real y actualiza el store local
 */
export const useGroupSync = (groupId: string | undefined) => {
  const { updateGroup, groups } = useGroupStore();
  const groupIdRef = useRef(groupId);

  useEffect(() => {
    if (!groupId) return;

    groupIdRef.current = groupId;

    // Flag to prevent updates after unmount
    let isMounted = true;

    // Subscribe to group meta
    const unsubscribeMeta = subscribeToGroupMeta(groupId, (meta) => {
      if (!isMounted) return;
      
      updateGroupWithMeta(groupId, meta);
    });

    // Subscribe to members
    const unsubscribeMembers = subscribeToMembers(groupId, (members) => {
      if (!isMounted) return;
      
      updateGroupWithMembers(groupId, members);
    });

    // Subscribe to expenses
    const unsubscribeExpenses = subscribeToExpenses(groupId, (expenses) => {
      if (!isMounted) return;
      
      updateGroupWithExpenses(groupId, expenses);
    });

    // Subscribe to favors
    const unsubscribeFavors = subscribeToFavors(groupId, (favors) => {
      if (!isMounted) return;
      
      updateGroupWithFavors(groupId, favors);
    });

    // Subscribe to rankings
    const unsubscribeRankings = subscribeToRankings(groupId, (rankings) => {
      if (!isMounted) return;
      
      updateGroupWithRankings(groupId, rankings);
    });

    // Cleanup subscriptions on unmount or when groupId changes
    return () => {
      isMounted = false;
      // Note: GunDB subscriptions don't have explicit unsubscribe,
      // they persist for the lifetime of the app
    };
  }, [groupId]);
};

// Helper functions to update group data
const updateGroupWithMeta = (groupId: string, meta: any) => {
  const { updateGroup, groups } = useGroupStore.getState();
  const group = groups.find((g) => g.id === groupId);
  
  if (group) {
    updateGroup(groupId, {
      ...group,
      name: meta.name,
      icon: meta.icon,
      currency: meta.currency,
      llmApiKey: meta.llmApiKey,
      llmModel: meta.llmModel,
      llmEndpoint: meta.llmEndpoint,
      createdAt: meta.createdAt,
    });
  }
};

const updateGroupWithMembers = (groupId: string, members: Member[]) => {
  const { updateGroup, groups } = useGroupStore.getState();
  const group = groups.find((g) => g.id === groupId);
  
  if (group) {
    updateGroup(groupId, {
      ...group,
      members,
    });
  }
};

const updateGroupWithExpenses = (groupId: string, expenses: Expense[]) => {
  const { updateGroup, groups, calculateBalancesFromExpenses } = useGroupStore.getState();
  const group = groups.find((g) => g.id === groupId);
  
  if (group) {
    // Recalculate balances when expenses change
    const balances = calculateBalancesFromExpenses(group);
    
    updateGroup(groupId, {
      ...group,
      expenses,
      balances,
    });
  }
};

const updateGroupWithFavors = (groupId: string, favors: Favor[]) => {
  const { updateGroup, groups, calculateRankingsFromFavors } = useGroupStore.getState();
  const group = groups.find((g) => g.id === groupId);
  
  if (group) {
    // Recalculate rankings when favors change
    const rankings = calculateRankingsFromFavors({
      members: group.members,
      favors,
      rankings: group.rankings,
    });
    
    updateGroup(groupId, {
      ...group,
      favors,
      rankings,
    });
  }
};

const updateGroupWithRankings = (groupId: string, rankings: MemberRanking[]) => {
  const { updateGroup, groups } = useGroupStore.getState();
  const group = groups.find((g) => g.id === groupId);
  
  if (group) {
    // Sort rankings by score
    const sortedRankings = [...rankings].sort((a, b) => b.score - a.score);
    
    updateGroup(groupId, {
      ...group,
      rankings: sortedRankings,
    });
  }
};

/**
 * Hook para sincronizar todos los grupos
 * Útil para la pantalla principal de lista de grupos
 */
export const useAllGroupsSync = () => {
  const { groups } = useGroupStore();
  
  useEffect(() => {
    // Subscribe to each group
    groups.forEach((group) => {
      // Subscribe to group meta
      subscribeToGroupMeta(group.id, (meta) => {
        updateGroupWithMeta(group.id, meta);
      });
      
      // Subscribe to members
      subscribeToMembers(group.id, (members) => {
        updateGroupWithMembers(group.id, members);
      });
      
      // Subscribe to expenses
      subscribeToExpenses(group.id, (expenses) => {
        updateGroupWithExpenses(group.id, expenses);
      });
      
      // Subscribe to favors
      subscribeToFavors(group.id, (favors) => {
        updateGroupWithFavors(group.id, favors);
      });
      
      // Subscribe to rankings
      subscribeToRankings(group.id, (rankings) => {
        updateGroupWithRankings(group.id, rankings);
      });
    });
    
    // Cleanup on unmount or when groups change
    return () => {
      // Note: GunDB subscriptions don't have explicit unsubscribe,
      // they persist for the lifetime of the app
    };
  }, [groups.map(g => g.id).join(',')]); // Re-run when group list changes
};
