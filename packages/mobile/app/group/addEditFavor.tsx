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
  Switch,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/src/components/ThemedText';
import { useGroupStore } from '@/src/stores/groupStore';
import { useTheme } from '@/src/contexts/ThemeContext';

const SCORE_OPTIONS = Array.from({ length: 21 }, (_, index) => 10 - index);

const AddEditFavorScreen = () => {
  const router = useRouter();
  const { groupId, favorId } = useLocalSearchParams<{ groupId?: string; favorId?: string }>();
  const { groups, addFavor, updateFavor } = useGroupStore();
  const { colors } = useTheme();

  const group = groupId ? groups.find((g) => g.id === groupId) : undefined;
  const isEditMode = Boolean(favorId);

  const [description, setDescription] = useState('');
  const [madeBy, setMadeBy] = useState<string | null>(null);
  const [affectedMembers, setAffectedMembers] = useState<string[]>([]);
  const [useIA, setUseIA] = useState(false);
  const [manualScore, setManualScore] = useState<number | null>(0);
  const [showMakerSelector, setShowMakerSelector] = useState(false);

  useEffect(() => {
    if (!group) return;

    const defaultMemberId = group.members[0]?.id ?? null;
    setMadeBy(defaultMemberId);
    setAffectedMembers(group.members.map((member) => member.id));

    if (isEditMode && favorId) {
      const favor = group.favors.find((f) => f.id === favorId);
      if (favor) {
        setDescription(favor.description);
        setMadeBy(favor.madeBy);
        setAffectedMembers(favor.forMembers.length > 0 ? favor.forMembers : group.members.map((member) => member.id));
        setUseIA(favor.isAIUsed ?? false);
        setManualScore(favor.manualScore ?? 0);
      }
    }
  }, [group, isEditMode, favorId]);

  const toggleMember = (memberId: string) => {
    setAffectedMembers((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId]
    );
  };

  const handleSaveFavor = () => {
    if (!groupId || !group) {
      Alert.alert('Error', 'Grupo no encontrado');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Por favor ingresa una descripción');
      return;
    }

    if (!madeBy) {
      Alert.alert('Error', 'Selecciona quién hizo el favor');
      return;
    }

    if (affectedMembers.length === 0) {
      Alert.alert('Error', 'Selecciona al menos una persona afectada');
      return;
    }

    const favor = {
      id: isEditMode && favorId ? favorId : `favor_${Date.now()}`,
      groupId,
      description: description.trim(),
      madeBy,
      forMembers: affectedMembers,
      date: new Date().toISOString(),
      isAIUsed: useIA,
      manualScore: useIA ? undefined : manualScore ?? 0,
    } as any;

    if (isEditMode && favorId) {
      updateFavor(groupId, favor);
      Alert.alert('Éxito', 'Favor actualizado');
    } else {
      addFavor(groupId, favor);
      Alert.alert('Éxito', 'Favor añadido');
    }

    router.back();
  };

  if (!group) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
        <ThemedText style={{ color: colors.text, margin: 16 }}>Grupo no encontrado</ThemedText>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: isEditMode ? 'Editar favor' : 'Añadir favor' }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.formSection}>
            <ThemedText style={[styles.label, { color: colors.text }]}>Descripción</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
              placeholder="Ej: Lavó los platos"
              placeholderTextColor={colors.muted}
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <View style={styles.formSection}>
            <ThemedText style={[styles.label, { color: colors.text }]}>Hecho por</ThemedText>
            <TouchableOpacity
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, justifyContent: 'center' }]}
              onPress={() => setShowMakerSelector((prev) => !prev)}
            >
              <Text style={{ color: colors.text }}>
                {group.members.find((member) => member.id === madeBy)?.name ?? 'Seleccionar'}
              </Text>
            </TouchableOpacity>
            {showMakerSelector && (
              <View style={{ marginTop: 8 }}>
                {group.members.map((member) => (
                  <TouchableOpacity
                    key={member.id}
                    style={styles.selectorOption}
                    onPress={() => {
                      setMadeBy(member.id);
                      setShowMakerSelector(false);
                    }}
                  >
                    <Text style={{ color: colors.text }}>{member.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.formSection}>
            <ThemedText style={[styles.label, { color: colors.text }]}>Afecta a</ThemedText>
            {group.members.map((member) => {
              const checked = affectedMembers.includes(member.id);
              return (
                <TouchableOpacity
                  key={member.id}
                  style={[styles.checkboxRow, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  onPress={() => toggleMember(member.id)}
                >
                  <Text style={{ color: colors.text }}>{member.name}</Text>
                  <Text style={{ color: checked ? colors.primary : colors.muted }}>
                    {checked ? '☑' : '☐'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.formSection}>
            <View style={styles.rowBetween}>
              <ThemedText style={[styles.label, { color: colors.text }]}>Utilizar IA</ThemedText>
              <Switch value={useIA} onValueChange={setUseIA} thumbColor={useIA ? colors.primary : colors.muted} />
            </View>
          </View>

          {!useIA && (
            <View style={styles.formSection}>
              <ThemedText style={[styles.label, { color: colors.text }]}>Puntuación manual</ThemedText>
              <View style={styles.scoreGrid}>
                {SCORE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.scoreOption,
                      {
                        backgroundColor: manualScore === option ? colors.primary : colors.surface,
                        borderColor: manualScore === option ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setManualScore(option)}
                  >
                    <Text style={{ color: manualScore === option ? '#fff' : colors.text }}>{option > 0 ? `+${option}` : option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={handleSaveFavor}
          >
            <ThemedText style={styles.saveButtonText}>{isEditMode ? 'Guardar favor' : 'Añadir favor'}</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.back()}
          >
            <ThemedText style={[styles.cancelButtonText, { color: colors.text }]}>Cancelar</ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  formSection: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, minHeight: 48 },
  selectorOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  checkboxRow: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scoreOption: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 20,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddEditFavorScreen;
