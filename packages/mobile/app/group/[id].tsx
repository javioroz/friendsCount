import React from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Text,
  Image,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/src/components/ThemedText';
import { useGroupStore } from '@/src/stores/groupStore';
import { useTheme } from '@/src/contexts/ThemeContext';
import { ExpensesTab } from './expensesTab';
import { BalancesTab } from './balancesTab';
import { FavorsTab } from './favorsTab';
import { RankingsTab } from './rankingTab';
import { useTranslation } from 'react-i18next';

type TabType = 'expenses' | 'balances' | 'favors' | 'rankings';

const GroupScreen = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = React.useState<TabType>('expenses');
  const { groups } = useGroupStore();
  const { colors, isDarkMode } = useTheme();

  const group = groups.find((g) => g.id === id);

  const handleAddExpense = () => {
    router.push(`./addEditExpense?groupId=${id}`);
  };

  const handleAddFavor = () => {
    router.push(`./addEditFavor?groupId=${id}`);
  };

  const handleStartRaffle = () => {
    Alert.alert('Sorteo', 'Eligiendo al miembro más necesitado... 🎲');
  };

  const getTabIcon = (tab: TabType) => {
    switch (tab) {
      case 'expenses':
        return 'wallet';
      case 'balances':
        return 'bar-chart';
      case 'favors':
        return 'thumbs-up';
      case 'rankings':
        return 'dice';
      default:
        return 'ellipse';
    }
  };

  const getTabLabel = (tab: TabType) => {
    switch (tab) {
      case 'expenses':
        return t('tabs.expenses');
      case 'balances':
        return t('tabs.balances');
      case 'favors':
        return t('tabs.favors');
      case 'rankings':
        return t('tabs.rankings');
      default:
        return '';
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View style={styles.groupHeaderTitleContainer}>
              <Text style={styles.groupHeaderTitle}>  {group?.name ?? 'Grupo'}  </Text>
              <Text style={styles.groupHeaderIcon}>{group?.icon ?? '🏠'}</Text>
            </View>
          ),
          headerBackTitle: '',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.groupHeaderLeft}
            >
              <Ionicons name="arrow-back" size={22} color="#fff" />
              <Image
                source={isDarkMode ? require('@/assets/friendsCount_logo_dark.png') : require('@/assets/friendsCount_logo_light.png')}
                style={styles.groupHeaderLogo}
              />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push(`/createEditGroup?groupId=${id}`)}
              style={styles.groupHeaderRight}
            >
              <Ionicons name="settings" size={22} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />
      {group ? (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
            {activeTab === 'expenses' && (
              <ExpensesTab group={group} onAdd={handleAddExpense} />
            )}
            {activeTab === 'balances' && <BalancesTab group={group} />}
            {activeTab === 'favors' && (
              <FavorsTab group={group} onAdd={handleAddFavor} />
            )}
            {activeTab === 'rankings' && (
              <RankingsTab group={group} onStartRaffle={handleStartRaffle} />
            )}
          </ScrollView>

          {/* Floating Action Button for Expenses and Favors tabs */}
          {(activeTab === 'expenses' || activeTab === 'favors') && (
            <TouchableOpacity
              style={[styles.fabButton, { backgroundColor: colors.primary }]}
              onPress={activeTab === 'expenses' ? handleAddExpense : handleAddFavor}
            >
              <ThemedText style={styles.fabButtonText}>+</ThemedText>
            </TouchableOpacity>
          )}

          {/* Floating Bottom Tab Bar */}
          <View style={[styles.bottomTabBar, { backgroundColor: colors.surface + 'E6' }]}>
            {(['expenses', 'balances', 'favors', 'rankings'] as TabType[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.bottomTabButton,
                  activeTab === tab && styles.bottomTabButtonActive,
                ]}
                onPress={() => setActiveTab(tab)}
              >
                <Ionicons
                  name={getTabIcon(tab)}
                  size={22}
                  color={activeTab === tab ? colors.primary : colors.muted}
                />
                <ThemedText
                  style={[
                    styles.bottomTabButtonText,
                    {
                      color: activeTab === tab ? colors.primary : colors.muted,
                      fontWeight: activeTab === tab ? '600' : '500',
                    },
                  ]}
                >
                  {getTabLabel(tab)}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </SafeAreaView>
      ) : (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          <ThemedText style={{ color: colors.text }}>Grupo no encontrado</ThemedText>
        </SafeAreaView>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#999',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80, // Space for bottom tab bar
  },
  bottomTabBar: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  bottomTabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 16,
  },
  bottomTabButtonActive: {
    backgroundColor: 'rgba(128, 90, 213, 0.1)',
  },
  bottomTabButtonText: {
    fontSize: 10,
    marginTop: 4,
  },
  fabButton: {
    position: 'absolute',
    bottom: 140,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
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
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
  },
  groupHeaderLogo: {
    width: 28,
    height: 28,
    marginLeft: 10,
    resizeMode: 'contain',
  },
  groupHeaderTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupHeaderIcon: {
    fontSize: 18,
    marginRight: 8,
    color: '#fff',
  },
  groupHeaderTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  groupHeaderRight: {
    paddingRight: 10,
  },
});

export default GroupScreen;