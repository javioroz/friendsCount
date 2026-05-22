import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/src/components/ThemedText';
import { useTheme } from '@/src/contexts/ThemeContext';

interface Member {
  id: string;
  name: string;
}

interface AIResponse {
  message: string;
}

interface Favor {
  id: string;
  description: string;
  madeBy: string;
  manualScore?: number;
  aiResponse?: AIResponse & { score?: number };
}

interface Group {
  id: string;
  members: Member[];
  favors: Favor[];
}

interface FavorsTabProps {
  group: Group;
  onAdd: () => void;
}

const tabStyles = StyleSheet.create({
  tabContent: {
    padding: 16,
    position: 'relative',
  },
  favorsList: {
    marginBottom: 24,
  },
  favorCard: {
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
  favorHeader: {
    marginBottom: 8,
  },
  favorDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  favorDetail: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  aiResponse: {
    backgroundColor: '#f0f4ff',
    borderLeftWidth: 3,
    padding: 10,
    borderRadius: 4,
    marginTop: 8,
  },
  aiMessage: {
    fontSize: 12,
    color: '#333',
    fontStyle: 'italic',
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
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
});

export const FavorsTab: React.FC<FavorsTabProps> = ({ group, onAdd }) => {
  const { colors } = useTheme();
  const router = useRouter();

  const getMemberName = (memberId: string) => {
    return group.members.find((m) => m.id === memberId)?.name || 'Unknown';
  };

  const handleFavorPress = (favorId: string) => {
    router.push(`./addEditFavor?groupId=${group.id}&favorId=${favorId}`);
  };

  return (
    <View style={[tabStyles.tabContent, { backgroundColor: colors.background }]}>
      <View style={tabStyles.favorsList}>
        {group.favors.length === 0 ? (
          <ThemedText style={[tabStyles.emptyText, { color: colors.muted }]}>
            No hay favores registrados aún
          </ThemedText>
        ) : (
          group.favors.map((favor) => (
            <TouchableOpacity
              key={favor.id}
              onPress={() => handleFavorPress(favor.id)}
              style={[tabStyles.favorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={tabStyles.favorHeader}>
                <ThemedText style={[tabStyles.favorDescription, { color: colors.text }]}>
                  🌟 {favor.description}
                </ThemedText>
              </View>
              <ThemedText style={[tabStyles.favorDetail, { color: colors.muted }]}>
                Por: {getMemberName(favor.madeBy)}
              </ThemedText>
              <View style={tabStyles.scoreContainer}>
                <ThemedText style={[tabStyles.scoreLabel, { color: colors.muted }]}>
                  Puntuación:
                </ThemedText>
                <ThemedText style={[tabStyles.scoreValue, { color: colors.primary }]}>
                  {favor.aiResponse?.score !== undefined 
                    ? (favor.aiResponse.score > 0 ? `+${favor.aiResponse.score}` : `${favor.aiResponse.score}`)
                    : favor.manualScore !== undefined 
                      ? (favor.manualScore > 0 ? `+${favor.manualScore}` : `${favor.manualScore}`)
                      : '0'}
                </ThemedText>
              </View>
              {favor.aiResponse && (
                <View style={[tabStyles.aiResponse, { borderLeftColor: colors.primary, backgroundColor: colors.surface }]}>
                  <ThemedText style={[tabStyles.aiMessage, { color: colors.text }]}>
                    🤖 {favor.aiResponse.message}
                  </ThemedText>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </View>

      <TouchableOpacity style={[tabStyles.fabButton, { backgroundColor: colors.primary }]} onPress={onAdd}>
        <ThemedText style={tabStyles.fabButtonText}>+</ThemedText>
      </TouchableOpacity>
    </View>
  );
};