import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Link } from '@/src/components/Link';
import { ThemedText } from '@/src/components/ThemedText';
import { useGroupStore } from '@/src/stores/groupStore';
import { useAllGroupsSync } from '@/src/services/useGroupSync';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Group, Member } from '@/src/types';

const GroupsScreen = () => {
  const router = useRouter();
  const { groups, addGroup, setCurrentGroup } = useGroupStore();
  const { colors } = useTheme();
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // Sync all groups with GunDB
  useAllGroupsSync();
  
  // Initialize with mock data on first load
  useEffect(() => {
    if (!hasInitialized && groups.length === 0) {
      const mockGroups: Group[] = [
        {
          id: 'group1',
          name: 'Viaje de amigos',
          icon: '🚗',
          currency: 'EUR',
          members: [
            { id: 'user1', name: 'Carlos', email: 'carlos@example.com' },
            { id: 'user2', name: 'Marta', email: 'marta@example.com' },
            { id: 'user3', name: 'Luis', email: 'luis@example.com' },
          ],
          expenses: [
            {
              id: 'exp1',
              groupId: 'group1',
              description: 'Cena en trattoria',
              amount: 45.5,
              paidBy: 'user1',
              sharedBy: ['user1', 'user2', 'user3'],
              date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              category: '🍔',
            },
            {
              id: 'exp2',
              groupId: 'group1',
              description: 'Taxi al aeropuerto',
              amount: 23.0,
              paidBy: 'user2',
              sharedBy: ['user2', 'user1'],
              date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
              category: '🚗',
            },
          ],
          favors: [
            {
              id: 'favor1',
              groupId: 'group1',
              description: 'Fregó el baño a las 3am',
              madeBy: 'user1',
              date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
              aiResponse: {
                score: 5,
                message: 'Un héroe sin capa que limpió hasta la frustración. ¡Merece un monumento!',
                nickname: 'El Fregón',
              },
            },
            {
              id: 'favor2',
              groupId: 'group1',
              description: 'Hizo la comida',
              madeBy: 'user2',
              date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
              manualScore: 2,
            }
          ],
          balances: [
            { memberId: 'user1', amount: 45.2 },
            { memberId: 'user2', amount: -12.3 },
            { memberId: 'user3', amount: -8.4 },
          ],
          rankings: [
            { memberId: 'user1', nickname: 'El Fregón', score: 5 },
            { memberId: 'user2', nickname: 'La Ausente', score: 2 },
            { memberId: 'user3', nickname: 'El Nuevo', score: 0 },
          ],
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'group2',
          name: 'Piso compartido',
          icon: '🏠',
          currency: 'EUR',
          members: [
            { id: 'user1', name: 'Carlos', email: 'carlos@example.com' },
            { id: 'user4', name: 'Sofia', email: 'sofia@example.com' },
            { id: 'user5', name: 'Pablo', email: 'pablo@example.com' },
          ],
          expenses: [
            {
              id: 'exp3',
              groupId: 'group2',
              description: 'Alquiler',
              amount: 900.0,
              paidBy: 'user4',
              sharedBy: ['user1', 'user4', 'user5'],
              date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
              category: '🏠',
            },
          ],
          favors: [],
          balances: [
            { memberId: 'user1', amount: -300 },
            { memberId: 'user4', amount: 600 },
            { memberId: 'user5', amount: -300 },
          ],
          rankings: [
            { memberId: 'user1', nickname: 'El Silencioso', score: 100 },
            { memberId: 'user4', nickname: 'La Pagadora', score: 200 },
            { memberId: 'user5', nickname: 'El Ocupado', score: 80 },
          ],
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];
      
      mockGroups.forEach((group) => {
        addGroup(group);
      });
      setHasInitialized(true);
    }
  }, [hasInitialized, groups.length, addGroup]);
  
  const handleGroupPress = (groupId: string) => {
    setCurrentGroup(groupId);
  };
  
  const handleCreateGroup = () => {
    router.push('/createEditGroup');
  };
  
  const handleJoinGroup = () => {
    router.push('/joinGroup');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText style={[styles.subtitle, { color: colors.text }]}>Tus grupos</ThemedText>
        </View>

        <View style={styles.groupsList}>
          {groups.map((group) => (
            <Link
              key={group.id}
              href={`/group/${group.id}`}
              style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => handleGroupPress(group.id)}
            >
              <View style={styles.groupInfo}>
                <View style={styles.groupTitleRow}>
                  <ThemedText style={[styles.groupIcon, { color: colors.text }]}>{group.icon}</ThemedText>
                  <ThemedText style={[styles.groupName, { color: colors.text }]}>{group.name}</ThemedText>
                </View>
                <ThemedText style={[styles.memberCount, { color: colors.muted }]}> 
                  {group.members.length} miembro{group.members.length !== 1 ? 's' : ''}
                </ThemedText>
              </View>
              <View style={styles.groupArrow}>
                <ThemedText style={{ color: colors.muted }}>→</ThemedText>
              </View>
            </Link>
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleCreateGroup}
          >
            <ThemedText style={styles.buttonText}>+ Crear grupo</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleJoinGroup}
          >
            <ThemedText style={[styles.buttonText, { color: colors.text }]}>+ Unirse a grupo</ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  groupsList: {
    marginBottom: 24,
  },
  groupCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  groupInfo: {
    flex: 1,
  },
  groupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  groupIcon: {
    fontSize: 20,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 0,
  },
  memberCount: {
    fontSize: 13,
    color: '#666',
  },
  groupArrow: {
    marginLeft: 12,
    color: '#999',
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default GroupsScreen;
