import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { ThemedText } from '@/src/components/ThemedText';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

interface Member {
  id: string;
  name: string;
}

interface Ranking {
  memberId: string;
  score: number;
  nickname: string;
}

interface Favor {
  id: string;
  description: string;
  madeBy: string;
  date: string;
  isAIUsed?: boolean;
  manualScore?: number;
  aiResponse?: {
    score: number;
    message: string;
    nickname: string;
  };
}

interface Group {
  members: Member[];
  rankings: Ranking[];
  favors: Favor[];
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
  summarySection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  infoIcon: {
    padding: 4,
  },
  infoIconText: {
    fontSize: 18,
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  favorDescription: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    color: '#333',
  },
  favorScore: {
    fontSize: 14,
    fontWeight: '600',
  },
  favorDetail: {
    fontSize: 12,
    color: '#999',
  },
  aiBadge: {
    fontSize: 10,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginLeft: 8,
  },
  rankingClickable: {
    cursor: 'pointer',
  },
});

export const RankingsTab: React.FC<RankingsTabProps> = ({ group, onStartRaffle }) => {
  const { colors } = useTheme();
  const [raffleResult, setRaffleResult] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isInfoModalVisible, setIsInfoModalVisible] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const { t } = useTranslation();

  const getMemberName = (memberId: string) => {
    return group.members.find((m) => m.id === memberId)?.name || 'Unknown';
  };

  // Filter favors made by the selected member
  const getMemberFavors = (memberId: string) => {
    return group.favors.filter((favor) => favor.madeBy === memberId);
  };

  const handleMemberPress = (memberId: string) => {
    setSelectedMemberId(memberId);
  };

  const handleBackToRankings = () => {
    setSelectedMemberId(null);
  };

  const performRaffle = () => {
    if (group.rankings.length === 0) return;

    // Calculate total points (treating 0 as 1 for each member)
    const totalPoints = group.rankings.reduce((sum, r) => sum + Math.max(r.score, 1), 0);

    // Calculate inverse weights: members with more points have less probability
    // Weight = totalPoints - memberScore (so higher score = lower weight)
    const weights = group.rankings.map((ranking) => {
      const effectiveScore = Math.max(ranking.score, 1); // Treat 0 as 1
      return totalPoints - effectiveScore;
    });

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    if (totalWeight === 0) {
      // All members have the same score (all equal to totalPoints, which is unlikely)
      // Fall back to equal probability
      const randomIndex = Math.floor(Math.random() * group.rankings.length);
      const winner = group.rankings[randomIndex];
      showResult(winner);
      return;
    }

    // Weighted random selection
    let random = Math.random() * totalWeight;
    let winner = group.rankings[0];

    for (let i = 0; i < group.rankings.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        winner = group.rankings[i];
        break;
      }
    }

    showResult(winner);
    onStartRaffle?.();
  };

  const showResult = (winner: Ranking) => {
    setRaffleResult(getMemberName(winner.memberId));
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setRaffleResult(null);
  };

  const openInfoModal = () => {
    setIsInfoModalVisible(true);
  };

  const closeInfoModal = () => {
    setIsInfoModalVisible(false);
  };

  // If a member is selected, show their favors
  if (selectedMemberId) {
    const memberFavors = getMemberFavors(selectedMemberId);
    const totalScore = memberFavors.reduce((sum, favor) => {
      return sum + (favor.aiResponse?.score ?? favor.manualScore ?? 0);
    }, 0);

    return (
      <View style={[tabStyles.tabContent, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={tabStyles.backButton} onPress={handleBackToRankings}>
          <ThemedText style={tabStyles.backButtonText}>← Volver a clasificación</ThemedText>
        </TouchableOpacity>

        <ThemedText style={[tabStyles.sectionTitle, { color: colors.text, marginBottom: 16, fontSize: 18 }]}>
          Favores de {getMemberName(selectedMemberId)}
        </ThemedText>

        {memberFavors.length === 0 ? (
          <ThemedText style={[tabStyles.favorDetail, { color: colors.muted, textAlign: 'center', marginTop: 24 }]}>
            No hay favores registrados para este miembro
          </ThemedText>
        ) : (
          <View style={tabStyles.favorsList}>
            {memberFavors.map((favor) => {
              const score = favor.aiResponse?.score ?? favor.manualScore ?? 0;
              const scoreColor = score > 0 ? '#22c55e' : score < 0 ? '#ef4444' : colors.muted;

              return (
                <View
                  key={favor.id}
                  style={[tabStyles.favorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={tabStyles.favorHeader}>
                    <ThemedText style={[tabStyles.favorDescription, { color: colors.text }]}>
                      {favor.description}
                    </ThemedText>
                    <ThemedText style={[tabStyles.favorScore, { color: scoreColor }]}>
                      {score > 0 ? '+' : ''}{score}
                    </ThemedText>
                  </View>
                  {favor.aiResponse && (
                    <ThemedText style={[tabStyles.favorDetail, { color: colors.muted, fontStyle: 'italic', marginBottom: 4 }]}>
                      "{favor.aiResponse.message}"
                    </ThemedText>
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ThemedText style={[tabStyles.favorDetail, { color: colors.muted }]}>
                      {new Date(favor.date).toLocaleDateString()}
                    </ThemedText>
                    {favor.isAIUsed && (
                      <View style={[tabStyles.aiBadge, { backgroundColor: colors.primary + '20' }]}>
                        <ThemedText style={[tabStyles.aiBadge, { color: colors.primary, fontSize: 10 }]}>
                          IA
                        </ThemedText>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={[tabStyles.summarySection, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 16 }]}>
          <ThemedText style={[tabStyles.sectionTitle, { color: colors.text }]}>Puntuación total</ThemedText>
          <ThemedText style={[tabStyles.favorScore, { color: colors.primary, fontSize: 24, marginTop: 8 }]}>
            {totalScore > 0 ? '+' : ''}{totalScore}
          </ThemedText>
        </View>
      </View>
    );
  }

  // Default view: show rankings
  return (
    <View style={[tabStyles.tabContent, { backgroundColor: colors.background }]}>
      <View style={tabStyles.rankingsList}>
        {group.rankings.map((ranking, index) => {
          const medals = ['🥇', '🥈', '🥉'];
          const medal = medals[index] || '  ';
          const barWidth = (ranking.score / (group.rankings[0]?.score || 100)) * 100;

          return (
            <TouchableOpacity
              key={ranking.memberId}
              style={[tabStyles.rankingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => handleMemberPress(ranking.memberId)}
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
            </TouchableOpacity>
          );
        })}
      </View>
      {/* Raffle Section */}
      <View style={[tabStyles.summarySection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Info Section */}
        <View style={tabStyles.sectionHeader}>
          <ThemedText style={[tabStyles.sectionTitle, { color: colors.text }]}>{t('rankings.nextTask')}</ThemedText>
          <TouchableOpacity onPress={openInfoModal} style={tabStyles.infoIcon}>
            <ThemedText style={[tabStyles.infoIconText, { color: colors.primary }]}>ℹ️</ThemedText>
          </TouchableOpacity>
        </View>
        {/* Raffle button*/}
        <TouchableOpacity
          style={[tabStyles.raffleButton, { backgroundColor: colors.primary }]}
          onPress={performRaffle}
        >
          <ThemedText style={tabStyles.raffleButtonText}>{t('rankings.startRaffle')}</ThemedText>
        </TouchableOpacity>
      </View>
      {/* Raffle Result Modal */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={[modalStyles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[modalStyles.modal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ThemedText style={[modalStyles.modalTitle, { color: colors.text }]}>
              🎉 ¡Resultado del Sorteo!
            </ThemedText>
            <ThemedText style={[modalStyles.winnerName, { color: colors.primary }]}>
              {raffleResult}
            </ThemedText>
            <ThemedText style={[modalStyles.modalSubtitle, { color: colors.muted }]}>
              Ha sido elegido/a para el próximo sorteo
            </ThemedText>
            <TouchableOpacity
              style={[modalStyles.closeButton, { backgroundColor: colors.primary }]}
              onPress={closeModal}
            >
              <ThemedText style={modalStyles.closeButtonText}>Cerrar</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Info Modal */}
      <Modal
        visible={isInfoModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeInfoModal}
      >
        <View style={[modalStyles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[modalStyles.modal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ThemedText style={[modalStyles.modalTitle, { color: colors.text }]}>
              ℹ️ Cómo funciona el sorteo
            </ThemedText>
            <View style={modalStyles.infoContent}>
              <ThemedText style={[modalStyles.infoParagraph, { color: colors.text }]}>
                El sorteo utiliza un sistema ponderado inverso para seleccionar al ganador:
              </ThemedText>
              <ThemedText style={[modalStyles.infoParagraph, { color: colors.text }]}>
                • Los miembros con <ThemedText style={{ fontWeight: '700', color: colors.primary }}>más puntos</ThemedText> tienen <ThemedText style={{ fontWeight: '700', color: '#ef4444' }}>menos probabilidad</ThemedText> de ser elegidos.
              </ThemedText>
              <ThemedText style={[modalStyles.infoParagraph, { color: colors.text }]}>
                • Los miembros con <ThemedText style={{ fontWeight: '700', color: colors.primary }}>menos puntos</ThemedText> tienen <ThemedText style={{ fontWeight: '700', color: '#22c55e' }}>más probabilidad</ThemedText> de ser elegidos.
              </ThemedText>
              <ThemedText style={[modalStyles.infoParagraph, { color: colors.text }]}>
                Esto asegura que las tareas se distribuyan de manera más equitativa entre todos los miembros del grupo.
              </ThemedText>
              <ThemedText style={[modalStyles.infoParagraph, { color: colors.text }]}>
                <ThemedText style={{ fontWeight: '600' }}>Nota:</ThemedText> Los miembros con 0 puntos se consideran como si tuvieran 1 punto para el cálculo.
              </ThemedText>
            </View>
            <TouchableOpacity
              style={[modalStyles.closeButton, { backgroundColor: colors.primary }]}
              onPress={closeInfoModal}
            >
              <ThemedText style={modalStyles.closeButtonText}>Cerrar</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '80%',
    maxWidth: 300,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  winnerName: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  closeButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  infoContent: {
    marginBottom: 24,
    width: '100%',
  },
  infoParagraph: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    textAlign: 'left',
  },
});
