import React from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
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
  date: string;
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
  container: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  favorsList: {},
  dateHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
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

  // Sort favors by date (most recent first) and group by date
  const getGroupedFavors = () => {
    const sorted = [...group.favors].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    let currentGroup: { date: string; label: string; favors: typeof sorted } | null = null;
    const result: Array<{ date: string; label: string; favors: typeof sorted }> = [];

    sorted.forEach((favor) => {
      const dateObj = new Date(favor.date);
      const dateKey = dateObj.toISOString().split('T')[0];
      
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let label: string;
      if (dateObj.toDateString() === today.toDateString()) {
        label = 'Hoy';
      } else if (dateObj.toDateString() === yesterday.toDateString()) {
        label = 'Ayer';
      } else {
        label = dateKey; // Use YYYY-MM-DD format
      }

      if (!currentGroup || dateKey !== currentGroup.date) {
        currentGroup = { date: dateKey, label, favors: [] };
        result.push(currentGroup);
      }
      currentGroup.favors.push(favor);
    });

    return result;
  };

  const groupedFavors = getGroupedFavors();

  return (
    <View style={[tabStyles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={tabStyles.tabContent}>
        <View style={tabStyles.favorsList}>
          {groupedFavors.length === 0 ? (
            <ThemedText style={[tabStyles.emptyText, { color: colors.muted }]}>
              No hay favores registrados aún
            </ThemedText>
          ) : (
            groupedFavors.map((group) => (
              <View key={group.date}>
                <ThemedText style={[tabStyles.dateHeader, { color: colors.text }]}>
                  {group.label}
                </ThemedText>
                {group.favors.map((favor) => (
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
                ))}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};
