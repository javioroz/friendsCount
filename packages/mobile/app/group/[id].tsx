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

type TabType = 'expenses' | 'balances' | 'favors' | 'rankings';

const GroupScreen = () => {
  const router = useRouter();
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
          <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            {['expenses', 'balances', 'favors', 'rankings'].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabButton,
                  activeTab === tab && { borderBottomColor: colors.primary },
                ]}
                onPress={() => setActiveTab(tab as TabType)}
              >
                <ThemedText
                  style={[
                    styles.tabButtonText,
                    {
                      color: activeTab === tab ? colors.primary : colors.muted,
                      fontWeight: activeTab === tab ? '600' : '500',
                    },
                  ]}
                >
                  {tab === 'expenses' && 'Gastos'}
                  {tab === 'balances' && 'Saldos'}
                  {tab === 'favors' && 'Favores'}
                  {tab === 'rankings' && 'Clasificación'}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={styles.content}>
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