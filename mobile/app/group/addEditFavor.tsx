import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Text,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/src/components/ThemedText';
import { useGroupStore } from '@/src/stores/groupStore';
import { useTheme } from '@/src/contexts/ThemeContext';
import { callLLMForFavorEvaluation } from '@/src/services/llmService';
import { getGun } from '@/src/services/gunService';
import { putFavor } from '@/src/services/gunService';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

const SCORE_OPTIONS = Array.from({ length: 21 }, (_, index) => 10 - index);

const AddEditFavorScreen = () => {
  const router = useRouter();
  const { groupId, favorId } = useLocalSearchParams<{ groupId?: string; favorId?: string }>();
  const { groups, addFavor, updateFavor, removeFavor } = useGroupStore();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const group = groupId ? groups.find((g) => g.id === groupId) : undefined;
  const isEditMode = Boolean(favorId);

  const [description, setDescription] = useState('');
  const [madeBy, setMadeBy] = useState<string | null>(null);
  const [favorDate, setFavorDate] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  });
  const [useIA, setUseIA] = useState(false);
  const [manualScore, setManualScore] = useState<number | null>(0);
  const [showMakerSelector, setShowMakerSelector] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!group) return;

    if (isEditMode && favorId) {
      const favor = group.favors.find((f) => f.id === favorId);
      if (favor) {
        setDescription(favor.description);
        setMadeBy(favor.madeBy);
        setUseIA(favor.isAIUsed ?? false);
        setManualScore(favor.manualScore ?? 0);
        if (favor.date) {
          setFavorDate(favor.date.split('T')[0]); // Extract YYYY-MM-DD from ISO string
        }
      }
    }
    // For new favors, madeBy stays null (empty) until user selects
  }, [group, isEditMode, favorId]);

  const handleSaveFavor = async () => {
    if (!groupId || !group) {
      Alert.alert(t('alert.error'), t('favors.groupNotFound'));
      return;
    }

    if (!description.trim()) {
      Alert.alert(t('alert.error'), t('favors.noDescription'));
      return;
    }

    if (!madeBy) {
      Alert.alert(t('alert.error'), t('favors.selectWhoMade'));
      return;
    }

    // Convert the date string to ISO format (assuming midnight UTC)
    const dateISOString = new Date(favorDate + 'T00:00:00Z').toISOString();

    // Check if group has API key when using IA
    if (useIA && !group.meta.llmApiKey) {
      Alert.alert(t('alert.error'), t('favors.noApiKey'));
      return;
    }

    setIsLoading(true);

    // Extract timestamp from group id to build favor ids that share the group's timestamp
    const groupIdParts = (groupId || '').split('_');
    const groupTimestamp = groupIdParts[groupIdParts.length - 1] || Date.now().toString();
    const nextFavorNumber = String(group.favors.length).padStart(3, '0');
    const newFavorId = `favor_${groupTimestamp}_${Date.now().toString()}_${nextFavorNumber}`;

    try {
      const favorIdValue = isEditMode && favorId ? favorId : newFavorId;
      const member = group.members.find(m => m.id === madeBy);

      if (!member) {
        Alert.alert(t('alert.error'), t('favors.memberNotFound'));
        setIsLoading(false);
        return;
      }

      let aiResponse = null;

      // If using IA, call the LLM API
      if (useIA) {
        try {
          const favorForAI = {
            id: favorIdValue,
            groupId,
            description: description.trim(),
            madeBy,
            date: dateISOString,
          };

          aiResponse = await callLLMForFavorEvaluation(group, favorForAI, member);
        } catch (llmError: any) {
          console.error('Error calling LLM:', llmError);
          
          // Extract meaningful error message
          let errorMessage = llmError.message || t('aiErrors.unknown');
          
          // Check for specific error types
          if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
            errorMessage = t('aiErrors.unauthorized');
          } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
            errorMessage = t('aiErrors.forbidden');
          } else if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
            errorMessage = t('aiErrors.notFound');
          } else if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests') || errorMessage.includes('insufficient_quota') || errorMessage.includes('exceeded your current quota')) {
            errorMessage = t('aiErrors.quotaExceeded');
          } else if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
            errorMessage = t('aiErrors.serverError');
          } else if (errorMessage.includes('invalid JSON') || errorMessage.includes('parse')) {
            errorMessage = t('aiErrors.invalidJSON');
          } else if (errorMessage.includes('network') || errorMessage.includes('Network') || errorMessage.includes('fetch')) {
            errorMessage = t('aiErrors.networkError');
          } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
            errorMessage = t('aiErrors.timeout');
          }
          
          Alert.alert(
            t('favors.aiErrorTitle'),
            t('favors.aiErrorIntro', { error: errorMessage }),
            [
              { text: t('app.cancel'), style: 'cancel' },
              {
                text: t('favors.saveWithoutAI'),
                onPress: async () => {
                  const favorWithoutAI: any = {
                    id: favorIdValue,
                    description: description.trim(),
                    madeBy,
                    date: dateISOString,
                    isAIUsed: false,
                    manualScore: 0,
                  };

                  if (isEditMode && favorId) {
                    updateFavor(groupId, favorWithoutAI);
                  } else {
                    addFavor(groupId, favorWithoutAI);
                  }
                  setIsLoading(false);
                  router.back();
                },
              },
            ]
          );
          setIsLoading(false);
          return;
        }
      }

      // Create the favor object (no groupId, the relationship is implicit via the parent group)
      // IMPORTANT: Avoid setting fields to `undefined` - GunDB does not allow that.
      // Only include optional fields when they have a real value.
      const favor: any = {
        id: favorIdValue,
        description: description.trim(),
        madeBy,
        date: dateISOString,
        isAIUsed: useIA,
      };

      if (!useIA) {
        favor.manualScore = manualScore ?? 0;
      }

      if (aiResponse) {
        favor.aiResponse = {
          score: aiResponse.score[madeBy] ?? 0,
          message: aiResponse.comment,
          nickname: aiResponse.nicknames[madeBy] || '',
        };
      }

      // Save to GunDB
      try {
        const gun = getGun();
        await putFavor(groupId, favor);
      } catch (gunError) {
        console.error('Error saving favor to GunDB:', gunError);
        // Continue anyway, local store will be updated
      }

      // Update local store
      if (isEditMode && favorId) {
        updateFavor(groupId, favor);
        Alert.alert(t('alert.success'), t('favors.updated'));
      } else {
        addFavor(groupId, favor);
        Alert.alert(t('alert.success'), t('favors.added'));
      }

      setIsLoading(false);
      router.back();
    } catch (error) {
      console.error('Unexpected error saving favor:', error);
      setIsLoading(false);
      Alert.alert(t('alert.error'), t('favors.unexpectedError'));
    }
  };

  const handleDeleteFavor = (favorId: string | undefined) => {
      if (!groupId || !favorId) {
        Alert.alert( t('favors.error'), t('favors.deleteError'));
        return;
      }
  
      Alert.alert(
        t('favors.deleteTitle'),
        t('favors.deleteConfirm'),
        [
          { text: t('favors.cancel'), style: 'cancel' },
          {
            text: t('favors.delete'),
            style: 'destructive',
            onPress: () => {
              removeFavor(groupId, favorId);
              router.back();
            },
          },
        ]
      );
    };

  if (!group) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.container, { backgroundColor: colors.background }]}> 
        <ThemedText style={{ color: colors.text, margin: 16 }}>{t('app.groupNotFound')}</ThemedText>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: isEditMode ? t('favors.edit') : t('favors.add') }} />
      <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.container, { backgroundColor: colors.background }]}> 
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.formSection}>
            <ThemedText style={[styles.label, { color: colors.text }]}>{t('favors.description')}</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
              placeholder={t('favors.descriptionPlaceholder')}
              placeholderTextColor={colors.muted}
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <View style={styles.formSection}>
            <ThemedText style={[styles.label, { color: colors.text }]}>{t('favors.madeBy')}</ThemedText>
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
            <ThemedText style={[styles.label, { color: colors.text }]}>{t('favors.date')}</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
              placeholder={t('expenses.date') + ' (YYYY-MM-DD)'}
              placeholderTextColor={colors.muted}
              value={favorDate}
              onChangeText={setFavorDate}
              keyboardType="ascii-capable"
            />
          </View>

          <View style={styles.formSection}>
            <View style={styles.rowBetween}>
              <ThemedText style={[styles.label, { color: colors.text }]}>{t('favors.useAI')}</ThemedText>
              <Switch value={useIA} onValueChange={setUseIA} thumbColor={useIA ? colors.primary : colors.muted} />
            </View>
          </View>

          {!useIA && (
            <View style={styles.formSection}>
              <ThemedText style={[styles.label, { color: colors.text }]}>{t('favors.manualScore')}</ThemedText>
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
            style={[styles.saveButton, { backgroundColor: colors.primary, opacity: isLoading ? 0.6 : 1 }]}
            onPress={handleSaveFavor}
            disabled={isLoading}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#fff" />
                <ThemedText style={[styles.saveButtonText, { marginLeft: 8 }]}>{t('favors.processingAI')}</ThemedText>
              </View>
            ) : (
              <ThemedText style={styles.saveButtonText}>{isEditMode ? t('favors.save') : t('favors.add')}</ThemedText>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.back()}
          >
            <ThemedText style={[styles.cancelButtonText, { color: colors.text }]}>{t('app.cancel')}</ThemedText>
          </TouchableOpacity>
          {isEditMode && (
            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: '#ef4444' }]}
              onPress={() => handleDeleteFavor(favorId)}
            >
              <Ionicons name="trash-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <ThemedText style={styles.deleteButtonText}>{t('favors.delete')}</ThemedText>
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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
    color: '#fff' },
});

export default AddEditFavorScreen;