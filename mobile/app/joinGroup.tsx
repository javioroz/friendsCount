import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ThemedText } from '@/src/components/ThemedText';
import { useGroupStore } from '@/src/stores/groupStore';
import { useTheme } from '@/src/contexts/ThemeContext';
import { getGun } from '@/src/services/gunService';
import { Group, Member, Expense, Favor, MemberRanking, Balance } from '@/src/types';

const JoinGroupScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { addGroup } = useGroupStore();
  const [groupIdInput, setGroupIdInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleJoinGroup = async () => {
    if (!groupIdInput.trim()) {
      Alert.alert('Error', 'Por favor introduce un ID de grupo');
      return;
    }

    setIsLoading(true);

    try {
      const gun = getGun();
      const groupId = groupIdInput.trim();
      console.log('🔵 Joining group:', groupId);
      
      const groupRef = gun.get('friendscount').get('groups').get(groupId);
      
      // Read meta fields individually
      const readMetaField = (field: string) => new Promise<string>((resolve) => {
        groupRef.get('meta').get(field).once((value: any) => {
          console.log(`🟢 Meta ${field}:`, value);
          resolve(value);
        });
      });
      
      // Read members
      const readMembers = () => new Promise<Member[]>((resolve) => {
        const members: Member[] = [];
        const membersRef = groupRef.get('members');
        
        // First, get all member IDs
        membersRef.map().once((memberData: any, memberId: string) => {
          if (memberId) {
            console.log('🟢 Found member ID:', memberId);
          }
        });
        
        // Wait a bit then read each member
        setTimeout(() => {
          membersRef.map().once((memberData: any, memberId: string) => {
            if (memberId && memberData) {
              // Read member fields individually
              groupRef.get('members').get(memberId).get('id').once((id: any) => {
                groupRef.get('members').get(memberId).get('name').once((name: any) => {
                  members.push({
                    id: id || memberId,
                    name: name || 'Unknown',
                  });
                  
                  if (members.length >= 10) { // Max members limit
                    resolve(members);
                  }
                });
              });
            }
          });
          
          // Timeout for members
          setTimeout(() => {
            console.log('🟢 Members collected:', members);
            resolve(members);
          }, 2000);
        }, 500);
      });
      
      // Read all meta fields
      console.log('🟢 Reading meta fields...');
      const [id, name, icon, currency, createdAt] = await Promise.all([
        readMetaField('id'),
        readMetaField('name'),
        readMetaField('icon'),
        readMetaField('currency'),
        readMetaField('createdAt'),
      ]);
      
      console.log('🟢 Meta read complete:', { id, name, icon, currency, createdAt });
      
      if (!id || !name) {
        throw new Error('Grupo no encontrado. Verifica que el ID es correcto.');
      }
      
      // Read members
      console.log('🟢 Reading members...');
      const members = await readMembers();
      console.log('🟢 Members read complete:', members.length, 'members');
      
      // Build the group using the new meta structure
      const group: Group = {
        id: id as string,
        meta: {
          name: name as string,
          icon: (icon as string) || '🏠',
          currency: (currency as string) || 'EUR',
          createdAt: (createdAt as string) || new Date().toISOString(),
        },
        members: members,
        expenses: [],
        favors: [],
        balances: members.map(m => ({ memberId: m.id, amount: 0 })),
        rankings: [],
      };
      
      console.log('🟢 Group built:', group);
      console.log('📦 Adding group to store...');
      addGroup(group);
      console.log('✅ Group added to store');
      
      Alert.alert('Éxito', 'Te has unido al grupo correctamente');
      router.back();
    } catch (error: any) {
      console.error('🔴 Error joining group:', error);
      Alert.alert('Error', error.message || 'No se pudo conectar con el servidor');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Unirse a Grupo',
          headerBackTitle: 'Atrás',
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <ThemedText style={[styles.title, { color: colors.text }]}>
            Unirse a un grupo existente
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.muted }]}>
            Introduce el ID del grupo al que quieres unirte
          </ThemedText>

          <View style={styles.formSection}>
            <ThemedText style={[styles.label, { color: colors.text }]}>
              ID del grupo
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  color: colors.text,
                },
              ]}
              placeholder="Ej: group_1234567890"
              placeholderTextColor={colors.muted}
              value={groupIdInput}
              onChangeText={setGroupIdInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.joinButton,
              { backgroundColor: colors.primary, opacity: isLoading ? 0.6 : 1 },
            ]}
            onPress={handleJoinGroup}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.joinButtonText}>Unirse a grupo</ThemedText>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.cancelButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => router.back()}
            disabled={isLoading}
          >
            <ThemedText style={[styles.cancelButtonText, { color: colors.text }]}>
              Cancelar
            </ThemedText>
          </TouchableOpacity>
        </View>
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
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 32,
    textAlign: 'center',
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
  joinButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  joinButtonText: {
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
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default JoinGroupScreen;