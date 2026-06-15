import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Text,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/src/components/ThemedText';
import { useGroupStore } from '@/src/stores/groupStore';
import { useTheme } from '@/src/contexts/ThemeContext';
import { getGun } from '@/src/services/gunService';
import { putExpense } from '@/src/services/gunService';
import { useTranslation } from 'react-i18next';

const getCategoryEmojis = (t: (key: string) => string) => [
  { emoji: '🍺', label: t('categories.bars') },
  { emoji: '🍔', label: t('categories.restaurants') },
  { emoji: '🛒', label: t('categories.groceries') },
  { emoji: '🏠', label: t('categories.housing') },
  { emoji: '🚗', label: t('categories.transport') },
  { emoji: '🎬', label: t('categories.entertainment') },
  { emoji: '🩹', label: t('categories.health') },
  { emoji: '🧼', label: t('categories.cleaning') },
  { emoji: '👕', label: t('categories.clothing') },
  { emoji: '📚', label: t('categories.education') },
  { emoji: '💵', label: t('categories.payments') },
  { emoji: '💰', label: t('categories.other') },
];

const AddEditExpenseScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const groupId = params.groupId as string | undefined;
  const expenseId = params.expenseId as string | undefined;
  const { groups, addExpense, updateExpense, removeExpense } = useGroupStore();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const CATEGORY_EMOJIS = getCategoryEmojis(t);
  const group = groupId ? groups.find((g) => g.id === groupId) : undefined;
  const isEdit = Boolean(expenseId);

  const [description, setDescription] = useState('');
  const [amountText, setAmountText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('💰');
  const [paidBy, setPaidBy] = useState<string | null>(null);
  const [dateText, setDateText] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showPayerSelector, setShowPayerSelector] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);

  useEffect(() => {
    if (group) {
      setSelectedMembers(group.members.map((m) => m.id));
    }

    if (isEdit && group && expenseId) {
      const exp = group.expenses.find((e) => e.id === expenseId);
      if (exp) {
        setDescription(exp.description);
        setAmountText((exp.amount || 0).toFixed(2));
        setSelectedCategory(exp.category ?? '💰');
        setPaidBy(exp.paidBy);
        const sharedMembers = Array.isArray(exp.sharedBy) 
          ? exp.sharedBy 
          : group.members.map((m) => m.id);
        setSelectedMembers(sharedMembers);
        setDateText(exp.date ? exp.date.split('T')[0] : new Date().toISOString().split('T')[0]);
      }
    } else {
      // default date to today
      setDateText(new Date().toISOString().split('T')[0]);
      // paidBy stays null (empty) for new expenses
    }
  }, [group, isEdit, expenseId]);

  const handleAmountChange = (text: string) => {
    // Allow only digits and dot
    const filtered = text.replace(/[^0-9.]/g, '');
    setAmountText(filtered);
  };

  const handleAddExpense = async () => {
    if (!groupId || !group) {
      Alert.alert( t('alert.error'), 'Grupo no encontrado');
      return;
    }

    if (!description.trim()) {
      Alert.alert( t('alert.error'), t('expenses.noDescription') );
      return;
    }

    const amount = parseFloat(parseFloat(amountText || '0').toFixed(2));
    if (!amount || amount <= 0) {
      Alert.alert( t('alert.error'), 'Por favor ingresa un importe válido');
      return;
    }

    if (!paidBy) {
      Alert.alert( t('alert.error'), 'Selecciona quién pagó');
      return;
    }

    // Extract timestamp from group id (e.g. "group_1780914236947" -> "1780914236947")
    const groupIdParts = groupId.split('_');
    const groupTimestamp = groupIdParts[groupIdParts.length - 1] || Date.now().toString();
    const nextExpenseNumber = String(group.expenses.length).padStart(3, '0');
    const newExpenseId = `expen_${groupTimestamp}_${Date.now().toString()}_${nextExpenseNumber}`;

    const expenseIdValue = isEdit && expenseId ? expenseId : newExpenseId;
    const expense: any = {
      id: expenseIdValue,
      description: description.trim(),
      amount,
      category: selectedCategory,
      paidBy,
      sharedBy: selectedMembers.length ? selectedMembers : group.members.map((m) => m.id),
      date: dateText ? new Date(dateText).toISOString() : new Date().toISOString(),
    };

    // Save to GunDB first (same approach as addEditFavor with putFavor)
    try {
      const gun = getGun();
      await putExpense(groupId, expense);
    } catch (gunError) {
      console.error('Error saving expense to GunDB:', gunError);
      // Continue anyway, local store will be updated
    }

    // Update local store
    if (isEdit && expenseId) {
      updateExpense(groupId, expense);
    } else {
      addExpense(groupId, expense);
    }
    Alert.alert(t('alert.success'), isEdit ? 'Gasto actualizado' : 'Gasto añadido');
    router.back();
  };

  const handleDeleteExpense = () => {
    if (!groupId || !expenseId) {
      Alert.alert( t('expenses.error'), 'No se pudo eliminar el gasto. Inténtalo de nuevo.');
      return;
    }

    Alert.alert(
      t('expenses.deleteTitle'),
      t('expenses.deleteConfirm'),
      [
        { text: t('expenses.cancel'), style: 'cancel' },
        {
          text: t('expenses.delete'),
          style: 'destructive',
          onPress: () => {
            removeExpense(groupId, expenseId);
            router.back();
          },
        },
      ]
    );
  };

  if (!group) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
        <ThemedText style={{ color: colors.text, margin: 16 }}>{t('expenses.groupNotFound')}</ThemedText>
      </SafeAreaView>
    );
  }

  const renderCategoryGrid = () => (
    <View style={styles.categoryGrid}>
      {CATEGORY_EMOJIS.map((cat) => (
        <TouchableOpacity
          key={cat.emoji}
          style={[
            styles.categoryButton,
            {
              backgroundColor: selectedCategory === cat.emoji ? colors.primary : colors.surface,
              borderColor: selectedCategory === cat.emoji ? colors.primary : colors.border,
            },
          ]}
          onPress={() => {
            setSelectedCategory(cat.emoji);
            setShowCategorySelector(false);
          }}
        >
          <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
          <Text style={[styles.categoryLabel, { color: selectedCategory === cat.emoji ? '#fff' : colors.text }]}>
            {cat.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: isEdit ? t('expenses.edit') : t('expenses.add') }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.descriptionAndCategoryRow}>
            <View style={styles.descriptionSection}>
              <ThemedText style={[styles.label, { color: colors.text }]}>{t('expenses.description')}</ThemedText>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
                placeholder={t('expenses.descriptionPlaceholder')}
                placeholderTextColor={colors.muted}
                value={description}
                onChangeText={setDescription}
              />
            </View>

            <View style={styles.categorySection}>
              <ThemedText style={[styles.label, { color: colors.text }]}>{t('expenses.category')}</ThemedText>
              <TouchableOpacity
                style={[
                  styles.categorySelectorCompact,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  },
                ]}
                onPress={() => setShowCategorySelector(!showCategorySelector)}
              >
                <Text style={styles.selectedCategoryEmoji}>{selectedCategory}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showCategorySelector && renderCategoryGrid()}

          {/* Amount and Currency in one row */}
          <View style={styles.twoColumnRow}>
            <View style={styles.formColumnWide}>
              <ThemedText style={[styles.label, { color: colors.text }]}>{t('expenses.amount')}</ThemedText>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
                placeholder="0.00"
                placeholderTextColor={colors.muted}
                value={amountText}
                onChangeText={handleAmountChange}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.formColumnNarrow}>
              <ThemedText style={[styles.label, { color: colors.text }]}>{t('expenses.currency')}</ThemedText>
              <View style={[styles.currencyDisplay, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <ThemedText style={{ fontWeight: '600', color: colors.primary }}>{group.meta.currency ?? 'EUR'}</ThemedText>
              </View>
            </View>
          </View>

          {/* PaidBy and Date in one row */}
          <View style={styles.twoColumnRow}>
            <View style={styles.formColumn}>
              <ThemedText style={[styles.label, { color: colors.text }]}>{t('expenses.paidBy')}</ThemedText>
              <TouchableOpacity
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, justifyContent: 'center' }]}
                onPress={() => setShowPayerSelector(!showPayerSelector)}
              >
                <Text style={{ color: colors.text }}>{group.members.find((m) => m.id === paidBy)?.name ?? 'Seleccionar'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.formColumn}>
              <ThemedText style={[styles.label, { color: colors.text }]}>{t('expenses.date')}</ThemedText>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.muted}
                value={dateText}
                onChangeText={setDateText}
              />
            </View>
          </View>
          {showPayerSelector && (
            <View style={{ marginBottom: 16, marginLeft: 0, marginRight: 0 }}>
              {group.members.map((member) => (
                <TouchableOpacity key={member.id} style={[styles.payerOption, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={() => { setPaidBy(member.id); setShowPayerSelector(false); }}>
                  <Text style={{ color: colors.text }}>{member.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.formSection}>
            <ThemedText style={[styles.label, { color: colors.text }]}>{t('expenses.splitAmong')}</ThemedText>
            {group.members.map((member) => {
              const checked = selectedMembers.includes(member.id);
              return (
                <TouchableOpacity
                  key={member.id}
                  style={[styles.payerOption, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                  onPress={() => {
                    if (checked) setSelectedMembers(selectedMembers.filter((id) => id !== member.id));
                    else setSelectedMembers([...selectedMembers, member.id]);
                  }}
                >
                  <Text style={{ color: colors.text }}>{member.name}</Text>
                  {checked ? (
                    <Ionicons name="checkbox" size={20} color={colors.primary} />
                  ) : (
                    <Ionicons name="square-outline" size={20} color={colors.muted} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: colors.primary }]}
            onPress={handleAddExpense}
          >
            <ThemedText style={styles.createButtonText}>{isEdit ? t('expenses.saveChanges') : t('expenses.add')}</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.back()}
          >
            <ThemedText style={[styles.cancelButtonText, { color: colors.text }]}>{t('expenses.cancel')}</ThemedText>
          </TouchableOpacity>

          {isEdit && (
            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: '#ef4444' }]}
              onPress={handleDeleteExpense}
            >
              <Ionicons name="trash-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <ThemedText style={styles.deleteButtonText}>{t('expenses.delete')}</ThemedText>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  formSection: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, minHeight: 48 },
  descriptionAndCategoryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  descriptionSection: {
    flex: 1,
  },
  categorySection: {
    width: 100,
  },
  categorySelectorCompact: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 48,
  },
  selectedCategoryEmoji: {
    fontSize: 24,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 30,
    gap: 6,
  },
  categoryButton: {
    width: '15%',
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    marginBottom: 8,
  },
  categoryEmoji: {
    fontSize: 32,
  },
  categoryLabel: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  formColumn: {
    flex: 1,
  },
  formColumnWide: {
    flex: 2,
  },
  formColumnNarrow: {
    width: 100,
  },
  currencyDisplay: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payerOption: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  createButton: { 
    paddingVertical: 14, 
    paddingHorizontal: 16, 
    borderRadius: 8, 
    alignItems: 'center', 
    marginBottom: 12 
  },
  createButtonText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#fff' 
  },
  cancelButton: { 
    paddingVertical: 14, 
    paddingHorizontal: 16, 
    borderRadius: 8, 
    borderWidth: 1, 
    alignItems: 'center', 
    marginBottom: 12 
  },
  cancelButtonText: { 
    fontSize: 16, 
    fontWeight: '600' 
  },
  deleteButton: { 
    paddingVertical: 14, 
    paddingHorizontal: 16, 
    borderRadius: 8, 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center', 
    marginBottom: 20 
  },
  deleteButtonText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#fff' 
  },
});

export default AddEditExpenseScreen;