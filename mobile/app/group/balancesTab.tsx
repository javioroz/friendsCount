import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { ThemedText } from '@/src/components/ThemedText';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useGroupStore } from '@/src/stores/groupStore';
import { getGun, putExpense } from '@/src/services/gunService';

interface Member {
  id: string;
  name: string;
}

interface Balance {
  memberId: string;
  amount: number;
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
  balances: Balance[];
  expenses: Expense[];
}

interface Settlement {
  fromId: string;
  toId: string;
  amount: number;
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
  balanceClickable: {
    flex: 1,
    cursor: 'pointer',
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
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
  summarySection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  infoIcon: {
    padding: 4,
  },
  infoIconText: {
    fontSize: 18,
  },
  settlementInfo: {
    marginTop: 12,
  },
  settlementText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  settlementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#fff',
  },
  settlementCardContent: {
    flex: 1,
    marginRight: 12,
  },
  settleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    minWidth: 70,
    alignItems: 'center',
  },
  settleButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  calculateButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  calculateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '80%',
    maxWidth: 300,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  closeButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  infoContent: {
    marginBottom: 24,
    width: '100%',
  },
  infoParagraph: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    textAlign: 'left',
  },
});

const BalancesTab: React.FC<BalancesTabProps> = ({ group }) => {
  const { colors } = useTheme();
  const addExpense = useGroupStore((state) => state.addExpense);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [currentBalances, setCurrentBalances] = useState<Balance[]>(group.balances);
  const [isInfoModalVisible, setIsInfoModalVisible] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // Sync currentBalances with group.balances whenever the group changes
  // Only sync if no pending settlements to avoid losing local changes
  React.useEffect(() => {
    if (settlements.length === 0) {
      setCurrentBalances(group.balances);
    }
  }, [group.balances, settlements]);

  const getMemberName = (memberId: string) => {
    return group.members.find((m) => m.id === memberId)?.name || 'Unknown';
  };

  // Filter expenses paid by the selected member
  const getMemberExpenses = (memberId: string) => {
    return group.expenses.filter((expense) => expense.paidBy === memberId);
  };

  const handleMemberPress = (memberId: string) => {
    setSelectedMemberId(memberId);
  };

  const handleBackToBalances = () => {
    setSelectedMemberId(null);
  };

  // Greedy algorithm to calculate optimal settlements
  const calculateSettlements = (): Settlement[] => {
    // Create a copy of balances to work with
    const balances = currentBalances.map(b => ({ ...b }));
    const result: Settlement[] = [];

    while (true) {
      // Find the person with the maximum credit (positive balance)
      const maxCreditor = balances.reduce((max, b) => 
        b.amount > max.amount ? b : max, balances[0]);
      
      // Find the person with the maximum debit (negative balance)
      const maxDebtor = balances.reduce((min, b) => 
        b.amount < min.amount ? b : min, balances[0]);

      // If no more debts or credits, we're done
      if (maxCreditor.amount <= 0 || maxDebtor.amount >= 0) {
        break;
      }

      // Calculate the amount to settle (minimum of what debtor owes and creditor is owed)
      const settlementAmount = Math.min(
        Math.abs(maxDebtor.amount),
        maxCreditor.amount
      );

      // Add the settlement
      result.push({
        fromId: maxDebtor.memberId,
        toId: maxCreditor.memberId,
        amount: settlementAmount
      });

      // Update balances
      maxDebtor.amount += settlementAmount; // Less negative
      maxCreditor.amount -= settlementAmount; // Less positive

      // Round to avoid floating point issues
      maxDebtor.amount = Math.round(maxDebtor.amount * 100) / 100;
      maxCreditor.amount = Math.round(maxCreditor.amount * 100) / 100;
    }

    return result;
  };

  const handleSettle = (index: number) => {
    const settlement = settlements[index];
    if (!settlement) return;

    // Create a settlement expense in the database
    // The debtor (fromId) "pays" the creditor (toId) via a virtual expense
    // Use the same id scheme as addEditExpense (timestamp + sequence)
    const groupIdParts = (group.id || '').split('_');
    const groupTimestamp = groupIdParts[groupIdParts.length - 1] || Date.now().toString();
    const settlementExpenseNumber = String(group.expenses.length).padStart(3, '0');
    const settlementExpense = {
      id: `expen_${groupTimestamp}_${Date.now().toString()}_${settlementExpenseNumber}`,
      description: 'Liquidación de deuda',
      amount: settlement.amount,
      category: '💵', // Payment category
      paidBy: settlement.fromId, // Debtor pays
      sharedBy: [settlement.toId], // Creditor receives (only them)
      date: new Date().toISOString(), // Full ISO string for consistency
    };

    // Save to GunDB first
    try {
      const gun = getGun();
      void gun; // keep reference
      // Fire-and-forget; local store will be updated regardless
      putExpense(group.id, settlementExpense).catch((gunError) => {
        console.error('Error saving settlement expense to GunDB:', gunError);
      });
    } catch (gunError) {
      console.error('Error saving settlement expense to GunDB:', gunError);
    }

    // Add the expense to the local store
    addExpense(group.id, settlementExpense);

    // Remove the settled transaction
    const newSettlements = settlements.filter((_, i) => i !== index);

    // Sync currentBalances with group.balances from the store
    // This ensures we use the recalculated balances from the store
    setCurrentBalances(group.balances);
    setSettlements(newSettlements);
  };

  const handleCalculateSettlements = () => {
    const calculated = calculateSettlements();
    setSettlements(calculated);
  };

  const openInfoModal = () => {
    setIsInfoModalVisible(true);
  };

  const closeInfoModal = () => {
    setIsInfoModalVisible(false);
  };

  // If a member is selected, show their expenses
  if (selectedMemberId) {
    const memberExpenses = getMemberExpenses(selectedMemberId);
    const totalSpent = memberExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    return (
      <View style={[tabStyles.tabContent, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={tabStyles.backButton} onPress={handleBackToBalances}>
          <ThemedText style={tabStyles.backButtonText}>← Volver a saldos</ThemedText>
        </TouchableOpacity>

        <ThemedText style={[tabStyles.sectionTitle, { color: colors.text, marginBottom: 16, fontSize: 18 }]}>
          Gastos de {getMemberName(selectedMemberId)}
        </ThemedText>

        {memberExpenses.length === 0 ? (
          <ThemedText style={[tabStyles.settlementText, { color: colors.muted, textAlign: 'center', marginTop: 24 }]}>
            No hay gastos registrados para este miembro
          </ThemedText>
        ) : (
          <View style={tabStyles.expensesList}>
            {memberExpenses.map((expense) => (
              <View
                key={expense.id}
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
                  Pagado por {getMemberName(expense.paidBy)} · {new Date(expense.date).toLocaleDateString()}
                </ThemedText>
              </View>
            ))}
          </View>
        )}

        <View style={[tabStyles.summarySection, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 16 }]}>
          <ThemedText style={[tabStyles.sectionTitle, { color: colors.text }]}>Total pagado</ThemedText>
          <ThemedText style={[tabStyles.expenseAmount, { color: colors.primary, fontSize: 24, marginTop: 8 }]}>
            €{totalSpent.toFixed(2)}
          </ThemedText>
        </View>
      </View>
    );
  }

  // Default view: show balances
  return (
    <View style={[tabStyles.tabContent, { backgroundColor: colors.background }]}>
      <View style={tabStyles.balancesList}>
        <ThemedText style={[tabStyles.sectionTitle, { color: colors.text }]}>Saldos actuales</ThemedText>
        {group.balances.map((balance) => (
          <TouchableOpacity
            key={balance.memberId}
            style={[tabStyles.balanceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => handleMemberPress(balance.memberId)}
          >
            <View style={tabStyles.balanceClickable}>
              <ThemedText style={[tabStyles.balanceName, { color: colors.text }]}>
                {getMemberName(balance.memberId)}
              </ThemedText>
            </View>
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
          </TouchableOpacity>
        ))}
      </View>

      <View style={[tabStyles.summarySection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={tabStyles.sectionHeader}>
          <ThemedText style={[tabStyles.sectionTitle, { color: colors.text }]}>Liquidación óptima</ThemedText>
          <TouchableOpacity onPress={openInfoModal} style={tabStyles.infoIcon}>
            <ThemedText style={[tabStyles.infoIconText, { color: colors.primary }]}>ℹ️</ThemedText>
          </TouchableOpacity>
        </View>
        
        {settlements.length > 0 ? (
          // Show individual settlement cards
          settlements.map((settlement, index) => (
            <View
              key={`${settlement.fromId}-${settlement.toId}-${index}`}
              style={[tabStyles.settlementCard, { backgroundColor: colors.background, borderColor: colors.border }]}
            >
              <View style={tabStyles.settlementCardContent}>
                <ThemedText style={[tabStyles.settlementText, { color: colors.text }]}>
                  {getMemberName(settlement.fromId)} debe €{settlement.amount.toFixed(2)} a {getMemberName(settlement.toId)}
                </ThemedText>
              </View>
              <TouchableOpacity
                style={[tabStyles.settleButton, { backgroundColor: colors.primary }]}
                onPress={() => handleSettle(index)}
              >
                <ThemedText style={tabStyles.settleButtonText}>Saldar</ThemedText>
              </TouchableOpacity>
            </View>
          ))
        ) : currentBalances.filter((b) => b.amount < 0).length > 0 ? (
          // Show calculate button if there are debts but no settlements calculated yet
          <TouchableOpacity
            style={[tabStyles.calculateButton, { backgroundColor: colors.primary }]}
            onPress={handleCalculateSettlements}
          >
            <ThemedText style={tabStyles.calculateButtonText}>🔀 Calcular movimientos</ThemedText>
          </TouchableOpacity>
        ) : (
          <ThemedText style={[tabStyles.settlementText, { color: colors.muted }]}>
            ✅ Saldos equilibrados
          </ThemedText>
        )}
      </View>

      {/* Info Modal */}
      <Modal
        visible={isInfoModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeInfoModal}
      >
        <View style={[modalStyles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[modalStyles.modal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ThemedText style={[modalStyles.modalTitle, { color: colors.text }]}>
              ℹ️ Cómo funciona la liquidación óptima
            </ThemedText>
            <View style={modalStyles.infoContent}>
              <ThemedText style={[modalStyles.infoParagraph, { color: colors.text }]}>
                Se utiliza un <ThemedText style={{ fontWeight: '700', color: colors.primary }}>algoritmo greedy (voraz)</ThemedText> para calcular la forma más eficiente de saldar las deudas:
              </ThemedText>
              <ThemedText style={[modalStyles.infoParagraph, { color: colors.text }]}>
                1. Se identifica a la persona con <ThemedText style={{ fontWeight: '700', color: '#22c55e' }}>mayor saldo a favor</ThemedText> (más dinero debe recibir).
              </ThemedText>
              <ThemedText style={[modalStyles.infoParagraph, { color: colors.text }]}>
                2. Se identifica a la persona con <ThemedText style={{ fontWeight: '700', color: '#ef4444' }}>mayor saldo en contra</ThemedText> (más dinero debe).
              </ThemedText>
              <ThemedText style={[modalStyles.infoParagraph, { color: colors.text }]}>
                3. Se calcula un movimiento por el <ThemedText style={{ fontWeight: '600' }}>mínimo</ThemedText> entre lo que debe el deudor y lo que se le debe al acreedor.
              </ThemedText>
              <ThemedText style={[modalStyles.infoParagraph, { color: colors.text }]}>
                4. Se actualizan los saldos y se repite el proceso hasta que todas las deudas estén saldadas.
              </ThemedText>
              <ThemedText style={[modalStyles.infoParagraph, { color: colors.text }]}>
                Este algoritmo <ThemedText style={{ fontWeight: '700', color: colors.primary }}>minimiza el número total de movimientos</ThemedText> necesarios para dejar todas las cuentas en cero.
              </ThemedText>
            </View>
            <TouchableOpacity
              style={[modalStyles.closeButton, { backgroundColor: colors.primary }]}
              onPress={closeInfoModal}
            >
              <ThemedText style={modalStyles.closeButtonText}>Cerrar</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default BalancesTab;