import React from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/src/components/ThemedText';
import { useTheme } from '@/src/contexts/ThemeContext';

interface Member {
  id: string;
  name: string;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  date: string;
  category?: string;
}

interface Group {
  id: string;
  members: Member[];
  expenses: Expense[];
}

interface ExpensesTabProps {
  group: Group;
  onAdd: () => void;
}

const tabStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  expensesList: {},
  dateHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  expenseCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  expenseDescriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  expenseCategory: {
    fontSize: 18,
  },
  expenseDescription: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    color: '#333',
  },
  expenseAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  expenseDetail: {
    fontSize: 12,
    color: '#999',
  },
});

export const ExpensesTab: React.FC<ExpensesTabProps> = ({ group, onAdd }) => {
  const { colors } = useTheme();
  const router = useRouter();

  const getMemberName = (memberId: string) => {
    return group.members.find((m) => m.id === memberId)?.name || 'Unknown';
  };

  const handleExpensePress = (expenseId: string) => {
    router.push(`./addEditExpense?groupId=${group.id}&expenseId=${expenseId}`);
  };

  // Sort expenses by date (most recent first), then by id suffix within the same day
  const getGroupedExpenses = () => {
    const extractSuffixNumber = (id: string) => {
      const match = id.match(/_(\d+)$/);
      return match ? Number(match[1]) : 0;
    };

    const sorted = [...group.expenses].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) {
        return dateB - dateA;
      }
      const suffixA = extractSuffixNumber(a.id);
      const suffixB = extractSuffixNumber(b.id);
      if (suffixA !== suffixB) {
        return suffixB - suffixA;
      }
      return b.id.localeCompare(a.id);
    });

    let currentGroup: { date: string; label: string; expenses: typeof sorted } | null = null;
    const result: Array<{ date: string; label: string; expenses: typeof sorted }> = [];

    sorted.forEach((expense) => {
      const dateObj = new Date(expense.date);
      const dateKey = dateObj.toISOString().split('T')[0];
      
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let label: string;
      if (dateObj.toDateString() === today.toDateString()) {
        label = 'Hoy';
      } else if (dateObj.toDateString() === yesterday.toDateString()) {
        label = 'Ayer';
      } else {
        label = dateKey; // Use YYYY-MM-DD format
      }

      if (!currentGroup || dateKey !== currentGroup.date) {
        currentGroup = { date: dateKey, label, expenses: [] };
        result.push(currentGroup);
      }
      currentGroup.expenses.push(expense);
    });

    return result;
  };

  const groupedExpenses = getGroupedExpenses();

  return (
    <View style={[tabStyles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={tabStyles.tabContent}>
        <View style={tabStyles.expensesList}>
          {groupedExpenses.length === 0 ? (
            <ThemedText style={[tabStyles.expenseDetail, { color: colors.muted, textAlign: 'center', marginTop: 20 }]}>
              No hay gastos registrados aún
            </ThemedText>
          ) : (
            groupedExpenses.map((group) => (
              <View key={group.date}>
                <ThemedText style={[tabStyles.dateHeader, { color: colors.text }]}>
                  {group.label}
                </ThemedText>
                {group.expenses.map((expense) => (
                  <TouchableOpacity
                    key={expense.id}
                    onPress={() => handleExpensePress(expense.id)}
                    style={[tabStyles.expenseCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <View style={tabStyles.expenseHeader}>
                      <View style={tabStyles.expenseDescriptionRow}>
                        <ThemedText style={tabStyles.expenseCategory}>
                          {expense.category || '💰'}
                        </ThemedText>
                        <ThemedText style={[tabStyles.expenseDescription, { color: colors.text }]}>
                          {expense.description}
                        </ThemedText>
                      </View>
                      <ThemedText style={[tabStyles.expenseAmount, { color: colors.primary }]}>
                        €{expense.amount.toFixed(2)}
                      </ThemedText>
                    </View>
                    <ThemedText style={[tabStyles.expenseDetail, { color: colors.muted }]}>
                      Pagado por: {getMemberName(expense.paidBy)}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};
