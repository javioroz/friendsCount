import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedText } from '@/src/components/ThemedText';
import { useTheme } from '@/src/contexts/ThemeContext';

interface Member {
  id: string;
  name: string;
}

interface Ranking {
  memberId: string;
  score: number;
  nickname: string;
}

interface Group {
  members: Member[];
  rankings: Ranking[];
}

interface RankingsTabProps {
  group: Group;
  onStartRaffle: () => void;
}

const tabStyles = StyleSheet.create({
  tabContent: {
    padding: 16,
  },
  rankingsList: {
    marginBottom: 24,
  },
  rankingCard: {
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
  rankingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  rankingMedal: {
    fontSize: 20,
    marginRight: 8,
  },
  rankingInfo: {
    flex: 1,
  },
  rankingName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  rankingNickname: {
    fontSize: 12,
    color: '#999',
  },
  rankingScore: {
    fontSize: 14,
    fontWeight: '600',
  },
  scoreBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
  },
  raffleButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  raffleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export const RankingsTab: React.FC<RankingsTabProps> = ({ group, onStartRaffle }) => {
  const { colors } = useTheme();

  const getMemberName = (memberId: string) => {
    return group.members.find((m) => m.id === memberId)?.name || 'Unknown';
  };

  return (
    <View style={[tabStyles.tabContent, { backgroundColor: colors.background }]}>
      <View style={tabStyles.rankingsList}>
        {group.rankings.map((ranking, index) => {
          const medals = ['🥇', '🥈', '🥉'];
          const medal = medals[index] || '  ';
          const barWidth = (ranking.score / (group.rankings[0]?.score || 100)) * 100;

          return (
            <View
              key={ranking.memberId}
              style={[tabStyles.rankingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={tabStyles.rankingHeader}>
                <ThemedText style={tabStyles.rankingMedal}>{medal}</ThemedText>
                <View style={tabStyles.rankingInfo}>
                  <ThemedText style={[tabStyles.rankingName, { color: colors.text }]}>
                    {getMemberName(ranking.memberId)}
                  </ThemedText>
                  <ThemedText style={[tabStyles.rankingNickname, { color: colors.muted }]}>
                    "{ranking.nickname}"
                  </ThemedText>
                </View>
                <ThemedText style={[tabStyles.rankingScore, { color: colors.primary }]}>
                  {ranking.score}
                </ThemedText>
              </View>
              <View style={[tabStyles.scoreBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    tabStyles.scoreBarFill,
                    { width: `${barWidth}%`, backgroundColor: colors.primary },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>

      <TouchableOpacity
        style={[tabStyles.raffleButton, { backgroundColor: colors.primary }]}
        onPress={onStartRaffle}
      >
        <ThemedText style={tabStyles.raffleButtonText}>🎲 Iniciar sorteo</ThemedText>
      </TouchableOpacity>
    </View>
  );
};