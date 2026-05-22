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
      console.log('Joining group:', groupIdInput.trim());
      
      // First, let's try to get the group data
      const groupRef = gun.get('friendscount').get('groups').get(groupIdInput.trim());
      
      // Request the data
      groupRef.on((data: any, id: string) => {
        console.log('Received data for group:', id, data);
      });

      // Wait for the group data to be fetched
      const groupData = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.log('Timeout waiting for group data');
          reject(new Error('Timeout - No se recibió respuesta del servidor. Asegúrate de que el servidor GunDB está ejecutándose.'));
        }, 15000); // 15 second timeout

        // Use once to get data only once
        groupRef.once((data: any, id: string) => {
          console.log('Got data with once:', id, data);
          clearTimeout(timeout);
          if (data && data.meta) {
            resolve(data);
          } else {
            reject(new Error('Grupo no encontrado. Verifica que el ID es correcto y que el grupo existe en el servidor.'));
          }
        });
      });

      console.log('Group data received:', groupData);

      // Transform GunDB data to Group structure
      const members: Record<string, Member> = groupData.members || {};
      const expenses: Record<string, Expense> = groupData.expenses || {};
      const favors: Record<string, Favor> = groupData.favors || {};
      const rankings: Record<string, MemberRanking> = groupData.rankings || {};

      // Build balances from members
      const balances: Balance[] = Object.values(members).map(member => ({
        memberId: member.id,
        amount: 0,
      }));

      const group: Group = {
        id: groupData.meta.id,
        name: groupData.meta.name,
        icon: groupData.meta.icon,
        currency: groupData.meta.currency,
        createdAt: groupData.meta.createdAt,
        members: Object.values(members),
        expenses: Object.values(expenses),
        favors: Object.values(favors),
        balances,
        rankings: Object.values(rankings),
      };

      console.log('Adding group to store:', group);
      // Add group to store (this will sync it to the main screen)
      addGroup(group);

      Alert.alert('Éxito', 'Te has unido al grupo correctamente');
      router.back();
    } catch (error: any) {
      console.error('Error joining group:', error);
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