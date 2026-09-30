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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  favorDescriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  favorDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  favorScore: {
    fontSize: 14,
    fontWeight: '700',
  },
  favorDetail: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
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

const FavorsTab: React.FC<FavorsTabProps> = ({ group, onAdd }) => {
  const { colors } = useTheme();
  const router = useRouter();

  const getMemberName = (memberId: string) => {
    return group.members.find((m) => m.id === memberId)?.name || 'Unknown';
  };

  const handleFavorPress = (favorId: string) => {
    router.push(`./addEditFavor?groupId=${group.id}&favorId=${favorId}`);
  };

  // Sort favors by date (most recent first), then by id suffix within the same day
  const getGroupedFavors = () => {
    const extractSuffixNumber = (id: string) => {
      const match = id.match(/_(\d+)$/);
      return match ? Number(match[1]) : 0;
    };

    const sorted = [...group.favors].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) {
        return dateB - dateA;
      }
      const suffixA = extractSuffixNumber(a.id);
      const suffixB = extractSuffixNumber(b.id);
      if (suffixA !== suffixB) {
        return suffixB - suffixA;
      }
      return b.id.localeCompare(a.id);
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
                {group.favors.map((favor) => {
                  const scoreValue = favor.aiResponse?.score !== undefined 
                    ? (favor.aiResponse.score > 0 ? `+${favor.aiResponse.score}` : `${favor.aiResponse.score}`)
                    : favor.manualScore !== undefined 
                      ? (favor.manualScore > 0 ? `+${favor.manualScore}` : `${favor.manualScore}`)
                      : '0';

                  return (
                    <TouchableOpacity
                      key={favor.id}
                      onPress={() => handleFavorPress(favor.id)}
                      style={[tabStyles.favorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                      <View style={tabStyles.favorHeader}>
                        <View style={tabStyles.favorDescriptionRow}>
                          <ThemedText style={{ fontSize: 18, marginRight: 8 }}>🌟</ThemedText>
                          <ThemedText style={[tabStyles.favorDescription, { color: colors.text }]}>
                            {favor.description}
                          </ThemedText>
                        </View>
                        <ThemedText style={[tabStyles.favorScore, { color: colors.primary }]}>
                          {scoreValue}
                        </ThemedText>
                      </View>
                      <ThemedText style={[tabStyles.favorDetail, { color: colors.muted }]}>
                        Hecho por: {getMemberName(favor.madeBy)}
                      </ThemedText>
                      {favor.aiResponse && (
                        <View style={[tabStyles.aiResponse, { borderLeftColor: colors.primary, backgroundColor: colors.surface }]}>
                          <ThemedText style={[tabStyles.aiMessage, { color: colors.text }]}>
                            🤖 {favor.aiResponse.message}
                          </ThemedText>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default FavorsTab;