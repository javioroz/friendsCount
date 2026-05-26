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

const EMOJI_LIST = [
  '🏴‍☠️','🏠','🎉','🍕','🍔','🍺','🏖️','✈️','🚗','🌍','⭐','❤️','🔥',
  '⚽','🎮','🎵', '🎬','💼','🎨','🎓','💪','🎭','🏆','📚','🏥',
  '🇪🇸','🇵🇪','🇦🇷','🇨🇴','🇧🇷','🇮🇹','🇺🇸','🇬🇧','🇫🇷','🇩🇪','🇪🇺','🇨🇳','🇮🇳','🇯🇵','🇰🇷','🇹🇭',
];

const CURRENCIES = ['EUR', 'USD', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR', 'MXN'];

interface Member {
  id: string;
  name: string;
}

const CreateEditGroupScreen = () => {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  const { groups, addGroup, updateGroup, removeGroup } = useGroupStore();
  const { colors } = useTheme();
  const [groupName, setGroupName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(EMOJI_LIST[0]);
  const [selectedCurrency, setSelectedCurrency] = useState('EUR');
  const [apiKey, setApiKey] = useState('');
  const [showEmojiSelector, setShowEmojiSelector] = useState(false);
  const [showCurrencySelector, setShowCurrencySelector] = useState(false);
  const [memberInputs, setMemberInputs] = useState<string[]>(['']);

  const group = groupId ? groups.find((g) => g.id === groupId) : undefined;
  const isEditMode = Boolean(groupId);

  useEffect(() => {
    if (group) {
      setGroupName(group.name);
      setSelectedIcon(group.icon ?? EMOJI_LIST[0]);
      setSelectedCurrency(group.currency ?? 'EUR');
      setApiKey(group.llmApiKey ?? '');
      setMemberInputs(group.members.length ? group.members.map((member) => member.name) : ['']);
    } else if (!isEditMode) {
      setGroupName('');
      setSelectedIcon(EMOJI_LIST[0]);
      setSelectedCurrency('EUR');
      setApiKey('');
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

  const handleSaveGroup = async () => {
    console.log('🔵 handleSaveGroup iniciado');
    console.log('🔵 isEditMode:', isEditMode);
    console.log('🔵 groupName:', groupName);
    console.log('🔵 memberInputs:', memberInputs);
    
    if (!groupName.trim()) {
      console.log('🔴 Error: nombre de grupo vacío');
      Alert.alert('Error', 'Por favor ingresa el nombre del grupo');
      return;
    }

    const validMembers = memberInputs
      .filter((name) => name.trim())
      .map((name, index) => ({
        id: `member_${Date.now()}_${index}`,
        name: name.trim(),
        email: `${name.trim().toLowerCase().replace(/\s+/g, '.')}@group.local`,
      }));

    console.log('🔵 validMembers:', validMembers);

    if (validMembers.length === 0) {
      console.log('🔴 Error: no hay miembros válidos');
      Alert.alert('Error', 'Por favor agrega al menos un participante');
      return;
    }

    if (isEditMode) {
      if (!group) {
        Alert.alert('Error', 'Grupo no encontrado');
        return;
      }

      const updatedGroup = {
        ...group,
        name: groupName.trim(),
        icon: selectedIcon,
        currency: selectedCurrency,
        llmApiKey: apiKey.trim(),
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
              name: updatedGroup.name,
              icon: updatedGroup.icon,
              currency: updatedGroup.currency,
              createdAt: updatedGroup.createdAt,
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
        // Still update local store even if GunDB fails
      }

      updateGroup(group.id, updatedGroup);
      Alert.alert('Éxito', 'Ajustes guardados correctamente');
      router.back();
      return;
    }

    const newGroup = {
      id: `group_${Date.now()}`,
      name: groupName.trim(),
      icon: selectedIcon,
      currency: selectedCurrency,
      llmApiKey: apiKey.trim(),
      members: validMembers,
      expenses: [],
      favors: [],
      balances: validMembers.map((member) => ({
        memberId: member.id,
        amount: 0,
      })),
      rankings: [],
      createdAt: new Date().toISOString(),
    };

    console.log('🟢 Iniciando guardado en GunDB...');
    
    // Save to GunDB first
    try {
      const gun = getGun();
      console.log('🟢 Gun instance:', gun ? 'exists' : 'null');
      const groupRef = gun.get('friendscount').get('groups').get(newGroup.id);
      console.log('🟢 groupRef:', groupRef ? 'exists' : 'null');
      
      // Create a promise with timeout
      const putPromise = new Promise<void>((resolve, reject) => {
        console.log('🟢 Ejecutando groupRef.put()...');
        
        // Save each meta field individually to avoid GunDB reference issues
        const metaRef = groupRef.get('meta');
        const saveMeta = () => new Promise<void>((resolveMeta, rejectMeta) => {
          metaRef.get('id').put(newGroup.id);
          metaRef.get('name').put(newGroup.name);
          metaRef.get('icon').put(newGroup.icon);
          metaRef.get('currency').put(newGroup.currency);
          metaRef.get('createdAt').put(newGroup.createdAt);
          metaRef.get('createdBy').put('current_user');
          
          // Give GunDB a moment to persist
          setTimeout(resolveMeta, 500);
        });
        
        // Save members individually
        const saveMembers = () => new Promise<void>((resolveMembers, rejectMembers) => {
          const membersRef = groupRef.get('members');
          newGroup.members.forEach(member => {
            const memberRef = membersRef.get(member.id);
            memberRef.get('id').put(member.id);
            memberRef.get('name').put(member.name);
            memberRef.get('email').put(member.email);
          });
          
          // Give GunDB a moment to persist
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
      
      // Add timeout of 5 seconds
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          console.log('🔴 Timeout de 5 segundos alcanzado');
          reject(new Error('Timeout: GunDB put operation took too long'));
        }, 5000);
      });
      
      // Race between put and timeout
      await Promise.race([putPromise, timeoutPromise]);
      console.log('🟢 GunDB put completado exitosamente');
    } catch (error: any) {
      console.error('🔴 Error saving group to GunDB:', error);
      Alert.alert('Error', 'No se pudo guardar el grupo en el servidor. Se guardará solo localmente.');
    }

    console.log('🟢 Antes de addGroup, grupos en store:', useGroupStore.getState().groups.length);
    
    // Always add to local store (even if GunDB fails)
    console.log('📦 Añadiendo grupo al store local:', JSON.stringify(newGroup, null, 2));
    addGroup(newGroup);
    console.log('✅ addGroup llamado');
    
    const storeAfter = useGroupStore.getState();
    console.log('✅ Después de addGroup, grupos en store:', storeAfter.groups.length);
    console.log('✅ Grupos en store:', storeAfter.groups.map(g => ({ id: g.id, name: g.name })));
    
    // Navigate back first, then show success message
    console.log('🟢 Llamando a router.back()');
    router.back();
    setTimeout(() => {
      Alert.alert('Éxito', 'Grupo creado correctamente');
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
        <ThemedText style={{ color: colors.text, margin: 16 }}>Grupo no encontrado</ThemedText>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: isEditMode ? 'Editar grupo' : 'Crear nuevo grupo',
          headerBackTitle: 'Atrás',
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.groupNameAndIconRow}>
            <View style={styles.nameSection}>
              <ThemedText style={[styles.label, { color: colors.text }]}>Nombre del grupo</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    color: colors.text,
                  },
                ]}
                placeholder="Ej: Viaje Roma"
                placeholderTextColor={colors.muted}
                value={groupName}
                onChangeText={setGroupName}
              />
            </View>

            <View style={styles.iconSection}>
              <ThemedText style={[styles.label, { color: colors.text }]}>Icono</ThemedText>
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
            <ThemedText style={[styles.label, { color: colors.text }]}>Divisa para gastos</ThemedText>
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
            <ThemedText style={[styles.label, { color: colors.text }]}>API Key del LLM para favores</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  color: colors.text,
                },
              ]}
              placeholder="opcional para funciones con IA"
              placeholderTextColor={colors.muted}
              value={apiKey}
              onChangeText={setApiKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.formSection}>
            <ThemedText style={[styles.label, { color: colors.text }]}>Participantes</ThemedText>
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
              <ThemedText style={[styles.addMemberText, { color: colors.primary }]}>Añadir participante</ThemedText>
            </TouchableOpacity>
          </View>

          {isEditMode && group && (
            <View style={styles.formSection}>
              <ThemedText style={[styles.label, { color: colors.text }]}>ID del grupo</ThemedText>
              <View style={[styles.groupIdDisplay, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <ThemedText style={[styles.groupIdText, { color: colors.muted }]}>{group.id}</ThemedText>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: colors.primary }]}
            onPress={handleSaveGroup}
          >
            <ThemedText style={styles.createButtonText}> 
              {isEditMode ? 'Guardar ajustes del grupo' : 'Crear grupo'}
            </ThemedText>
          </TouchableOpacity>

          {isEditMode && (
            <TouchableOpacity
              style={[styles.deleteButton, { borderColor: '#ef4444' }]}
              onPress={() => {
                console.log('🗑️ Delete button pressed, isEditMode:', isEditMode, 'group:', group?.id);
                if (group) {
                  // Use native confirm() for web compatibility
                  const confirmed = window.confirm(
                    '¿Estás seguro de que quieres eliminar este grupo? Solo se eliminará de tu dispositivo local, no del servidor.'
                  );
                  if (confirmed) {
                    console.log('🗑️ Confirmed delete for group:', group.id);
                    removeGroup(group.id);
                    router.back();
                  }
                } else {
                  console.log('⚠️ No group found to delete');
                }
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
              <ThemedText style={[styles.deleteButtonText, { color: '#ef4444' }]}>Eliminar grupo</ThemedText>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.cancelButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
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
    fontSize: 36,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  emojiButton: {
    width: '30%',
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
});

export default CreateEditGroupScreen;
