import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
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
  tabContent: {
    padding: 16,
    position: 'relative',
  },
  expensesList: {
    marginBottom: 24,
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
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 16,
    right: 16,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  fabButtonText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
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

  return (
    <View style={[tabStyles.tabContent, { backgroundColor: colors.background }]}>
      <View style={tabStyles.expensesList}>
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
              {getMemberName(expense.paidBy)} · Hace{' '}
              {Math.round((Date.now() - new Date(expense.date).getTime()) / (1000 * 60 * 60))}h
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={[tabStyles.fabButton, { backgroundColor: colors.primary }]} onPress={onAdd}>
        <ThemedText style={tabStyles.fabButtonText}>+</ThemedText>
      </TouchableOpacity>
    </View>
  );
};