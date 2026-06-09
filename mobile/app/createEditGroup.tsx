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
  Modal,
  Linking,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/src/components/ThemedText';
import { useGroupStore } from '@/src/stores/groupStore';
import { useTheme } from '@/src/contexts/ThemeContext';
import { getGun } from '@/src/services/gunService';
import { useTranslation } from 'react-i18next';
import { Clipboard } from 'react-native';

const EMOJI_LIST = [
  '🏴‍☠️','🏠','🎉','🍕','🍔','🍺','🏖️','✈️','🚗','🌍','⭐','❤️','🔥',
  '⚽','🎮','🎵', '🎬','💼','🎨','🎓','💪','🎭','🏆','📚','🏥',
  '🇪🇸','🇵🇪','🇦🇷','🇨🇴','🇧🇷','🇮🇹','🇺🇸','🇬🇧','🇫🇷','🇩🇪','🇪🇺','🇨🇳','🇮🇳','🇯🇵','🇰🇷','🇹🇭',
];

const CURRENCIES = ['EUR', 'USD', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR', 'MXN'];

const CreateEditGroupScreen = () => {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  const { groups, addGroup, updateGroup, removeGroup } = useGroupStore();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [groupName, setGroupName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(EMOJI_LIST[0]);
  const [selectedCurrency, setSelectedCurrency] = useState('EUR');
  const [useAI, setUseAI] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [llmModel, setLlmModel] = useState('');
  const [llmEndpoint, setLlmEndpoint] = useState('');
  const [showEmojiSelector, setShowEmojiSelector] = useState(false);
  const [showCurrencySelector, setShowCurrencySelector] = useState(false);
  const [showApiInfoModal, setShowApiInfoModal] = useState(false);
  const [memberInputs, setMemberInputs] = useState<string[]>(['']);

  const group = groupId ? groups.find((g) => g.id === groupId) : undefined;
  const isEditMode = Boolean(groupId);

  useEffect(() => {
    if (group) {
      setGroupName(group.meta.name);
      setSelectedIcon(group.meta.icon ?? EMOJI_LIST[0]);
      setSelectedCurrency(group.meta.currency ?? 'EUR');
      setUseAI(Boolean(group.meta.llmApiKey));
      setApiKey(group.meta.llmApiKey ?? '');
      setLlmModel(group.meta.llmModel ?? '');
      setLlmEndpoint(group.meta.llmEndpoint ?? '');
      setMemberInputs(group.members.length ? group.members.map((member) => member.name) : ['']);
    } else if (!isEditMode) {
      setGroupName('');
      setSelectedIcon(EMOJI_LIST[0]);
      setSelectedCurrency('EUR');
      setUseAI(false);
      setApiKey('');
      setLlmModel('');
      setLlmEndpoint('');
      setMemberInputs(['']);
    }
  }, [group, isEditMode]);

  const handleAddMemberField = () => {
    setMemberInputs([...memberInputs, '']);
  };

  const handleRemoveMemberField = (index: number) => {
    setMemberInputs(memberInputs.filter((_, i) => i !== index));
  };

  const handleMemberNameChange = (index: number, text: string) => {
    const newInputs = [...memberInputs];
    newInputs[index] = text;
    setMemberInputs(newInputs);
  };

  // Helper to extract the numeric timestamp from a group id of the form "group_<timestamp>"
  const extractTimestampFromGroupId = (id: string): string => {
    const parts = id.split('_');
    return parts[parts.length - 1] || Date.now().toString();
  };

  const handleSaveGroup = async () => {
    console.log('🔵 handleSaveGroup iniciado');
    console.log('🔵 isEditMode:', isEditMode);
    console.log('🔵 groupName:', groupName);
    console.log('🔵 memberInputs:', memberInputs);
    
    if (!groupName.trim()) {
      console.log('🔴 Error: nombre de grupo vacío');
      Alert.alert(t('alert.error'), 'Por favor ingresa el nombre del grupo');
      return;
    }

    if (isEditMode) {
      if (!group) {
        Alert.alert(t('alert.error'), 'Grupo no encontrado');
        return;
      }

      const timestamp = extractTimestampFromGroupId(group.id);

      // Reuse existing member ids when possible, otherwise create new ones with the same timestamp
      const validMembers = memberInputs
        .filter((name) => name.trim())
        .map((name, index) => {
          const existingMember = group.members[index];
          return {
            id: existingMember?.id ?? `member_${timestamp}_${String(index).padStart(3, '0')}`,
            name: name.trim(),
          };
        });

      console.log('🔵 validMembers:', validMembers);

      if (validMembers.length === 0) {
        console.log('🔴 Error: no hay miembros válidos');
        Alert.alert(t('alert.error'), 'Por favor agrega al menos un participante');
        return;
      }

      const updatedGroup = {
        ...group,
        meta: {
          ...group.meta,
          name: groupName.trim(),
          icon: selectedIcon,
          currency: selectedCurrency,
          llmApiKey: apiKey.trim(),
          llmModel: llmModel.trim(),
          llmEndpoint: llmEndpoint.trim(),
        },
        members: validMembers,
        balances: validMembers.map((member) => ({
          memberId: member.id,
          amount: 0,
        })),
      };

      // Update in GunDB
      try {
        const gun = getGun();
        const groupRef = gun.get('friendscount').get('groups').get(group.id);
        
        await new Promise<void>((resolve, reject) => {
          groupRef.put({
            meta: {
              id: group.id,
              name: updatedGroup.meta.name,
              icon: updatedGroup.meta.icon,
              currency: updatedGroup.meta.currency,
              llmApiKey: updatedGroup.meta.llmApiKey,
              llmModel: updatedGroup.meta.llmModel,
              llmEndpoint: updatedGroup.meta.llmEndpoint,
              createdAt: updatedGroup.meta.createdAt,
            },
            members: updatedGroup.members.reduce((acc, member) => {
              acc[member.id] = member;
              return acc;
            }, {} as Record<string, typeof validMembers[0]>),
            expenses: updatedGroup.expenses.reduce((acc, expense) => {
              acc[expense.id] = expense;
              return acc;
            }, {} as Record<string, typeof updatedGroup.expenses[0]>),
            favors: updatedGroup.favors.reduce((acc, favor) => {
              acc[favor.id] = favor;
              return acc;
            }, {} as Record<string, typeof updatedGroup.favors[0]>),
            rankings: updatedGroup.rankings.reduce((acc, ranking) => {
              acc[ranking.memberId] = ranking;
              return acc;
            }, {} as Record<string, typeof updatedGroup.rankings[0]>),
          }, (ack: any) => {
            if (ack.err) {
              reject(new Error(ack.err));
            } else {
              resolve();
            }
          });
        });
      } catch (error: any) {
        console.error('Error updating group in GunDB:', error);
      }

      updateGroup(group.id, updatedGroup);
      Alert.alert(t('alert.success'), 'Ajustes guardados correctamente');
      router.back();
      return;
    }

    const timestamp = Date.now().toString();
    const newGroupId = `group_${timestamp}`;

    const validMembers = memberInputs
      .filter((name) => name.trim())
      .map((name, index) => ({
        id: `member_${timestamp}_${String(index).padStart(3, '0')}`,
        name: name.trim(),
      }));

    console.log('🔵 validMembers:', validMembers);

    if (validMembers.length === 0) {
      console.log('🔴 Error: no hay miembros válidos');
      Alert.alert(t('alert.error'), 'Por favor agrega al menos un participante');
      return;
    }

    const newGroup = {
      id: newGroupId,
      meta: {
        name: groupName.trim(),
        icon: selectedIcon,
        currency: selectedCurrency,
        llmApiKey: apiKey.trim(),
        llmModel: llmModel.trim(),
        llmEndpoint: llmEndpoint.trim(),
        createdAt: new Date().toISOString(),
      },
      members: validMembers,
      expenses: [],
      favors: [],
      balances: validMembers.map((member) => ({
        memberId: member.id,
        amount: 0,
      })),
      rankings: [],
    };

    console.log('🟢 Iniciando guardado en GunDB...');
    
    // Save to GunDB first
    try {
      const gun = getGun();
      console.log('🟢 Gun instance:', gun ? 'exists' : 'null');
      const groupRef = gun.get('friendscount').get('groups').get(newGroup.id);
      console.log('🟢 groupRef:', groupRef ? 'exists' : 'null');
      
      const putPromise = new Promise<void>((resolve, reject) => {
        console.log('🟢 Ejecutando groupRef.put()...');
        
        // Save each meta field individually to avoid GunDB reference issues
        const metaRef = groupRef.get('meta');
        const saveMeta = () => new Promise<void>((resolveMeta, rejectMeta) => {
          metaRef.get('id').put(newGroup.id);
          metaRef.get('name').put(newGroup.meta.name);
          metaRef.get('icon').put(newGroup.meta.icon);
          metaRef.get('currency').put(newGroup.meta.currency);
          if (newGroup.meta.llmApiKey) {
            metaRef.get('llmApiKey').put(newGroup.meta.llmApiKey);
          }
          if (newGroup.meta.llmModel) {
            metaRef.get('llmModel').put(newGroup.meta.llmModel);
          }
          if (newGroup.meta.llmEndpoint) {
            metaRef.get('llmEndpoint').put(newGroup.meta.llmEndpoint);
          }
          metaRef.get('createdAt').put(newGroup.meta.createdAt);
          metaRef.get('createdBy').put('current_user');
          
          setTimeout(resolveMeta, 500);
        });
        
        // Save members individually
        const saveMembers = () => new Promise<void>((resolveMembers, rejectMembers) => {
          const membersRef = groupRef.get('members');
          newGroup.members.forEach(member => {
            const memberRef = membersRef.get(member.id);
            memberRef.get('id').put(member.id);
            memberRef.get('name').put(member.name);
          });
          
          setTimeout(resolveMembers, 500);
        });
        
        // Execute in sequence
        saveMeta()
          .then(() => saveMembers())
          .then(() => {
            console.log('🟢 Meta y miembros guardados correctamente');
            resolve();
          })
          .catch(err => {
            console.log('🔴 Error guardando datos:', err);
            reject(err);
          });
      });
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          console.log('🔴 Timeout de 5 segundos alcanzado');
          reject(new Error('Timeout: GunDB put operation took too long'));
        }, 5000);
      });
      
      await Promise.race([putPromise, timeoutPromise]);
      console.log('🟢 GunDB put completado exitosamente');
    } catch (error: any) {
      console.error('🔴 Error saving group to GunDB:', error);
      Alert.alert(t('alert.error'), 'No se pudo guardar el grupo en el servidor. Se guardará solo localmente.');
    }

    console.log('🟢 Antes de addGroup, grupos en store:', useGroupStore.getState().groups.length);
    
    console.log('📦 Añadiendo grupo al store local:', JSON.stringify(newGroup, null, 2));
    addGroup(newGroup);
    console.log('✅ addGroup llamado');
    
    const storeAfter = useGroupStore.getState();
    console.log('✅ Después de addGroup, grupos en store:', storeAfter.groups.length);
    console.log('✅ Grupos en store:', storeAfter.groups.map(g => ({ id: g.id, name: g.meta.name })));
    
    console.log('🟢 Llamando a router.back()');
    router.back();
    setTimeout(() => {
      Alert.alert(t('alert.success'), 'Grupo creado correctamente');
    }, 100);
  };

  const renderEmojiGrid = () => (
    <View style={styles.emojiGrid}>
      {EMOJI_LIST.map((emoji) => (
        <TouchableOpacity
          key={emoji}
          style={[
            styles.emojiButton,
            selectedIcon === emoji && {
              backgroundColor: colors.primary,
              borderColor: colors.primary,
            },
          ]}
          onPress={() => {
            setSelectedIcon(emoji);
            setShowEmojiSelector(false);
          }}
        >
          <Text style={styles.emojiText}>{emoji}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderCurrencySelector = () => (
    <View style={styles.currencyGrid}>
      {CURRENCIES.map((currency) => (
        <TouchableOpacity
          key={currency}
          style={[
            styles.currencyButton,
            {
              backgroundColor: selectedCurrency === currency ? colors.primary : colors.surface,
              borderColor: selectedCurrency === currency ? colors.primary : colors.border,
            },
          ]}
          onPress={() => {
            setSelectedCurrency(currency);
            setShowCurrencySelector(false);
          }}
        >
          <ThemedText
            style={[
              styles.currencyText,
              {
                color: selectedCurrency === currency ? '#fff' : colors.text,
                fontWeight: selectedCurrency === currency ? '600' : '400',
              },
            ]}
          >
            {currency}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (isEditMode && !group) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ThemedText style={{ color: colors.text, margin: 16 }}>{t('createEditGroup.groupNotFound')}</ThemedText>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: isEditMode ? t('createEditGroup.edit') : t('createEditGroup.create'),
          headerBackTitle: 'Atrás',
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.groupNameAndIconRow}>
            <View style={styles.nameSection}>
              <ThemedText style={[styles.label, { color: colors.text }]}>{t('createEditGroup.groupName')}</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    color: colors.text,
                  },
                ]}
                placeholder={t('createEditGroup.namePlaceholder')}
                placeholderTextColor={colors.muted}
                value={groupName}
                onChangeText={setGroupName}
              />
            </View>

            <View style={styles.iconSection}>
              <ThemedText style={[styles.label, { color: colors.text }]}>{t('createEditGroup.icon')}</ThemedText>
              <TouchableOpacity
                style={[
                  styles.iconSelectorCompact,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  },
                ]}
                onPress={() => setShowEmojiSelector(!showEmojiSelector)}
              >
                <Text style={styles.selectedEmojiLarge}>{selectedIcon}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showEmojiSelector && renderEmojiGrid()}

          <View style={styles.formSection}>
            <ThemedText style={[styles.label, { color: colors.text }]}>{t('createEditGroup.currency')}</ThemedText>
            <TouchableOpacity
              style={[
                styles.currencySelectorButton,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
              onPress={() => setShowCurrencySelector(!showCurrencySelector)}
            >
              <ThemedText style={[styles.currencySelectorText, { color: colors.text }]}>
                {selectedCurrency}
              </ThemedText>
              <Ionicons
                name={showCurrencySelector ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.text}
              />
            </TouchableOpacity>

            {showCurrencySelector && renderCurrencySelector()}
          </View>

          <View style={styles.formSection}>
            <ThemedText style={[styles.label, { color: colors.text }]}>{t('createEditGroup.participants')}</ThemedText>
            {memberInputs.map((memberName, index) => (
              <View key={index} style={styles.memberInputRow}>
                <TextInput
                  style={[
                    styles.memberInput,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                      color: colors.text,
                    },
                  ]}
                  placeholder={`Participante ${index + 1}`}
                  placeholderTextColor={colors.muted}
                  value={memberName}
                  onChangeText={(text) => handleMemberNameChange(index, text)}
                />
                {memberInputs.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeMemberButton}
                    onPress={() => handleRemoveMemberField(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <TouchableOpacity
              style={[styles.addMemberButton, { borderColor: colors.primary }]}
              onPress={handleAddMemberField}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <ThemedText style={[styles.addMemberText, { color: colors.primary }]}>{t('createEditGroup.addParticipant')}</ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.formSection}>
            <View style={styles.rowBetween}>
              <ThemedText style={[styles.label, { color: colors.text }]}>{t('createEditGroup.useAI')}</ThemedText>
              <Switch
                value={useAI}
                onValueChange={setUseAI}
                thumbColor={useAI ? colors.primary : colors.muted}
              />
            </View>
          </View>

          {useAI && (
            <>
              <View style={styles.formSection}>
                <View style={styles.labelWithInfo}>
                  <ThemedText style={[styles.label, { color: colors.text }]}>{t('createEditGroup.llmApiKey')}</ThemedText>
                  <TouchableOpacity onPress={() => setShowApiInfoModal(true)}>
                    <Ionicons name="information-circle" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                      color: colors.text,
                    },
                  ]}
                  placeholder={t('createEditGroup.llmApiKeyPlaceholder')}
                  placeholderTextColor={colors.muted}
                  value={apiKey}
                  onChangeText={setApiKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                />
              </View>

              <View style={styles.formSection}>
                <ThemedText style={[styles.label, { color: colors.text }]}>{t('createEditGroup.llmModel')}</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                      color: colors.text,
                    },
                  ]}
                  placeholder={t('createEditGroup.llmModelPlaceholder')}
                  placeholderTextColor={colors.muted}
                  value={llmModel}
                  onChangeText={setLlmModel}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.formSection}>
                <ThemedText style={[styles.label, { color: colors.text }]}>{t('createEditGroup.llmEndpoint')}</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                      color: colors.text,
                    },
                  ]}
                  placeholder={t('createEditGroup.llmEndpointPlaceholder')}
                  placeholderTextColor={colors.muted}
                  value={llmEndpoint}
                  onChangeText={setLlmEndpoint}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
              </View>
            </>
          )}

          {isEditMode && group && (
            <View style={styles.formSection}>
              <ThemedText style={[styles.label, { color: colors.text }]}>{t('createEditGroup.groupId')}</ThemedText>
              <View style={styles.rowBetween}>
                <View style={[styles.groupIdDisplay, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <ThemedText style={[styles.groupIdText, { color: colors.muted }]}>{group.id}                 </ThemedText>
                </View>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={() => {
                    Clipboard.setString(group.id);
                    Alert.alert(t('createEditGroup.groupIdCopied'));
                  }}
                >
                  <Ionicons name="copy" size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: colors.primary }]}
            onPress={handleSaveGroup}
          >
            <ThemedText style={styles.createButtonText}>
              {isEditMode ? t('createEditGroup.saveSettings') : t('createEditGroup.create')}
            </ThemedText>
          </TouchableOpacity>

          {isEditMode && (
            <TouchableOpacity
              style={[styles.deleteButton, { borderColor: '#ef4444' }]}
              onPress={() => {
                console.log('🗑️ Delete button pressed, isEditMode:', isEditMode, 'group:', group?.id);
                if (group) {
                  Alert.alert(
                    t('createEditGroup.deleteTitle'),
                    t('createEditGroup.deleteConfirm'),
                    [
                      { text: t('createEditGroup.cancel'), style: 'cancel' },
                      {
                        text: t('createEditGroup.delete'),
                        style: 'destructive',
                        onPress: () => {
                          console.log('🗑️ Confirmed delete for group:', group.id);
                          removeGroup(group.id);
                          router.back();
                        },
                      },
                    ]
                  );
                } else {
                  console.log('⚠️ No group found to delete');
                }
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
              <ThemedText style={[styles.deleteButtonText, { color: '#ef4444' }]}>{t('createEditGroup.delete')}</ThemedText>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.cancelButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => router.back()}
          >
            <ThemedText style={[styles.cancelButtonText, { color: colors.text }]}>{t('createEditGroup.cancel')}</ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      {/* API Info Modal */}
      <Modal
        visible={showApiInfoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowApiInfoModal(false)}
      >
        <View style={apiModalStyles.overlay}>
          <View style={[apiModalStyles.modal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={apiModalStyles.header}>
              <ThemedText style={[apiModalStyles.title, { color: colors.text }]}>
                ℹ️ Cómo obtener tu API Key
              </ThemedText>
              <TouchableOpacity onPress={() => setShowApiInfoModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={apiModalStyles.content}>
              {/* OpenAI */}
              <View style={apiModalStyles.providerSection}>
                <View style={apiModalStyles.providerHeader}>
                  <ThemedText style={[apiModalStyles.providerName, { color: colors.text }]}>🤖 OpenAI (GPT)</ThemedText>
                </View>
                <ThemedText style={[apiModalStyles.description, { color: colors.muted }]}>
                  Crea una cuenta en OpenAI y genera una API key en el dashboard.
                </ThemedText>
                <TouchableOpacity
                  style={[apiModalStyles.linkButton, { borderColor: colors.primary }]}
                  onPress={() => Linking.openURL('https://platform.openai.com/api-keys')}
                >
                  <ThemedText style={[apiModalStyles.linkText, { color: colors.primary }]}>
                    platform.openai.com/api-keys →
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {/* Claude */}
              <View style={apiModalStyles.providerSection}>
                <View style={apiModalStyles.providerHeader}>
                  <ThemedText style={[apiModalStyles.providerName, { color: colors.text }]}>🧠 Claude (Anthropic)</ThemedText>
                </View>
                <ThemedText style={[apiModalStyles.description, { color: colors.muted }]}>
                  Regístrate en Anthropic y crea una API key desde tu perfil.
                </ThemedText>
                <TouchableOpacity
                  style={[apiModalStyles.linkButton, { borderColor: colors.primary }]}
                  onPress={() => Linking.openURL('https://console.anthropic.com/settings/keys')}
                >
                  <ThemedText style={[apiModalStyles.linkText, { color: colors.primary }]}>
                    console.anthropic.com/settings/keys →
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {/* Gemini */}
              <View style={apiModalStyles.providerSection}>
                <View style={apiModalStyles.providerHeader}>
                  <ThemedText style={[apiModalStyles.providerName, { color: colors.text }]}>💎 Gemini (Google)</ThemedText>
                </View>
                <ThemedText style={[apiModalStyles.description, { color: colors.muted }]}>
                  Obtén una API key de Gemini desde Google AI Studio.
                </ThemedText>
                <TouchableOpacity
                  style={[apiModalStyles.linkButton, { borderColor: colors.primary }]}
                  onPress={() => Linking.openURL('https://aistudio.google.com/app/apikey')}
                >
                  <ThemedText style={[apiModalStyles.linkText, { color: colors.primary }]}>
                    aistudio.google.com/app/apikey →
                  </ThemedText>
                </TouchableOpacity>
              </View>

              <View style={apiModalStyles.infoBox}>
                <ThemedText style={[apiModalStyles.infoText, { color: colors.muted }]}>
                  💡 Una vez obtenida la API key, pégala en el campo "LLM API Key" y guarda los ajustes del grupo.
                </ThemedText>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  groupNameAndIconRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  nameSection: {
    flex: 1,
  },
  iconSection: {
    width: 100,
  },
  formSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 48,
  },
  iconSelectorCompact: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 48,
  },
  selectedEmojiLarge: {
    fontSize: 24,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  emojiButton: {
    width: '8%',
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emojiText: {
    fontSize: 32,
  },
  currencySelectorButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  currencySelectorText: {
    fontSize: 16,
    fontWeight: '500',
  },
  currencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  currencyButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  currencyText: {
    fontSize: 14,
  },
  memberInputRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 48,
  },
  removeMemberButton: {
    padding: 4,
  },
  addMemberButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  addMemberText: {
    fontSize: 14,
    fontWeight: '600',
  },
  copyButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 20,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  groupIdDisplay: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 48,
    justifyContent: 'center',
  },
  groupIdText: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  labelWithInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
});

const apiModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    maxHeight: 400,
  },
  providerSection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  providerHeader: {
    marginBottom: 8,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    marginBottom: 10,
    lineHeight: 20,
  },
  linkButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
});

export default CreateEditGroupScreen;
