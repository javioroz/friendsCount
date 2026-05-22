import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/src/components/ThemedText';
import { useTheme } from '@/src/contexts/ThemeContext';

interface Member {
  id: string;
  name: string;
}

interface Balance {
  memberId: string;
  amount: number;
}

interface Group {
  members: Member[];
  balances: Balance[];
}

interface BalancesTabProps {
  group: Group;
}

const tabStyles = StyleSheet.create({
  tabContent: {
    padding: 16,
  },
  balancesList: {
    marginBottom: 24,
  },
  balanceCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  balanceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  balanceValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  balanceEmoji: {
    fontSize: 16,
  },
  settlementSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  settlementInfo: {
    marginTop: 12,
  },
  settlementText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
});

export const BalancesTab: React.FC<BalancesTabProps> = ({ group }) => {
  const { colors } = useTheme();

  const getMemberName = (memberId: string) => {
    return group.members.find((m) => m.id === memberId)?.name || 'Unknown';
  };

  return (
    <View style={[tabStyles.tabContent, { backgroundColor: colors.background }]}>
      <View style={tabStyles.balancesList}>
        <ThemedText style={[tabStyles.sectionTitle, { color: colors.text }]}>Saldos actuales</ThemedText>
        {group.balances.map((balance) => (
          <View
            key={balance.memberId}
            style={[tabStyles.balanceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <ThemedText style={[tabStyles.balanceName, { color: colors.text }]}>
              {getMemberName(balance.memberId)}
            </ThemedText>
            <View style={tabStyles.balanceValue}>
              <ThemedText
                style={[
                  tabStyles.balanceAmount,
                  {
                    color: balance.amount >= 0 ? '#22c55e' : '#ef4444',
                  },
                ]}
              >
                {balance.amount >= 0 ? '+' : ''}€{Math.abs(balance.amount).toFixed(2)}
              </ThemedText>
              <ThemedText style={tabStyles.balanceEmoji}>
                {balance.amount >= 0 ? '🟢' : '🔴'}
              </ThemedText>
            </View>
          </View>
        ))}
      </View>

      <View style={[tabStyles.settlementSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <ThemedText style={[tabStyles.sectionTitle, { color: colors.text }]}>Liquidación óptima</ThemedText>
        <View style={tabStyles.settlementInfo}>
          {group.balances.filter((b) => b.amount < 0).length > 0 ? (
            <>
              {group.balances
                .filter((b) => b.amount > 0)
                .map((creditor) => (
                  <ThemedText
                    key={creditor.memberId}
                    style={[tabStyles.settlementText, { color: colors.muted }]}
                  >
                    {getMemberName(creditor.memberId)} ← €{creditor.amount.toFixed(2)}
                  </ThemedText>
                ))}
            </>
          ) : (
            <ThemedText style={[tabStyles.settlementText, { color: colors.muted }]}>
              ✅ Saldos equilibrados
            </ThemedText>
          )}
        </View>
      </View>
    </View>
  );
};