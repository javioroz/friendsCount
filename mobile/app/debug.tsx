import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGroupStore } from '@/src/stores/groupStore';
import { Stack } from 'expo-router';
import { getGun, checkConnection, getRelayUrl, getRelayUrlIssue } from '@/src/services/gunService';
import type { RelayConfigIssue } from '@/src/services/gunService';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme, type ThemeColors } from '@/src/contexts/ThemeContext';

interface GunGroup {
  id: string;
  name: string;
  icon: string;
  currency: string;
  createdAt: string;
  memberCount: number;
}

const DebugScreen = () => {
  const { t } = useTranslation();
  const { groups, currentGroupId } = useGroupStore();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [gunConnectionStatus, setGunConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [gunUrl, setGunUrl] = useState('');
  const [gunUrlError, setGunUrlError] = useState<RelayConfigIssue | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // La URL y cualquier error de configuracion los decide gunService, que es
    // el modulo que realmente construye la conexion. Aqui solo se muestran.
    setGunUrl(getRelayUrl());
    setGunUrlError(getRelayUrlIssue());

    // Check connection status
    checkConnection().then(connected => {
      setGunConnectionStatus(connected ? 'connected' : 'disconnected');
    }).catch(() => {
      setGunConnectionStatus('disconnected');
    });
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    // Refresh connection status
    checkConnection().then(connected => {
      setGunConnectionStatus(connected ? 'connected' : 'disconnected');
    }).catch(() => {
      setGunConnectionStatus('disconnected');
    });
    setTimeout(() => setRefreshing(false), 1000);
  };

  const renderConnectionStatus = () => {
    switch (gunConnectionStatus) {
      case 'checking':
        return (
          <View style={[styles.statusCard, styles.statusCardWarning]}>
            <ActivityIndicator size="small" color="#f59e0b" />
            <Text style={[styles.statusText, { color: '#f59e0b' }]}>{t('debug.checking')}</Text>
          </View>
        );
      case 'connected':
        return (
          <View style={[styles.statusCard, styles.statusCardSuccess]}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={[styles.statusText, { color: '#10b981' }]}>{t('debug.connected')}</Text>
          </View>
        );
      case 'disconnected':
        return (
          <View style={[styles.statusCard, styles.statusCardError]}>
            <Ionicons name="close-circle" size={20} color="#ef4444" />
            <Text style={[styles.statusText, { color: '#ef4444' }]}>{t('debug.disconnected')}</Text>
          </View>
        );
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: t('header.debug'),
          headerBackTitle: t('header.back'),
        }}
      />
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* GunDB Connection Status */}
          <View style={styles.section}>
            <Text style={styles.title}>{t('debug.gunStatus')}</Text>

            <View style={styles.infoCard}>
              <Text style={styles.label}>{t('debug.serverUrl')}</Text>
              <Text style={[styles.value, { fontSize: 12 }]} numberOfLines={1}>{gunUrl}</Text>
            </View>

            {gunUrlError !== null && (
              <View style={[styles.infoCard, { borderColor: '#ef4444' }]}>
                <Text style={[styles.statusText, { color: '#ef4444' }]}>{t('debug.relayConfigError')}</Text>
                <Text style={[styles.value, { fontSize: 11, textAlign: 'left', color: '#ef4444' }]}>
                  {gunUrlError === 'invalidBuild'
                    ? t('debug.relayInvalidBuild')
                    : t('debug.relayCleartext')}
                </Text>
              </View>
            )}

            {renderConnectionStatus()}

            <View style={styles.infoCard}>
              <Text style={styles.label}>{t('debug.groupsInGunDB')}</Text>
              <Text style={styles.value}>{groups.length} {t('debug.sameAsLocalStore')}</Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.label}>{t('debug.note')}</Text>
              <Text style={[styles.value, { fontSize: 11, textAlign: 'left' }]}>{t('debug.gunNote')}</Text>
            </View>
          </View>

          {/* Local Store Status */}
          <View style={styles.section}>
            <Text style={styles.title}>{t('debug.localStoreStatus')}</Text>

            <View style={styles.infoCard}>
              <Text style={styles.label}>{t('debug.totalGroups')}</Text>
              <Text style={styles.value}>{groups.length}</Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.label}>{t('debug.currentGroup')}</Text>
              <Text style={styles.value}>{currentGroupId || t('debug.none')}</Text>
            </View>
          </View>

          {/* Local Groups List */}
          <View style={styles.section}>
            <Text style={styles.title}>{t('debug.localGroupsList')}</Text>
            {groups.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>{t('debug.noGroups')}</Text>
              </View>
            ) : (
              groups.map((group, index) => (
                <View key={group.id} style={styles.groupCard}>
                  <Text style={styles.groupHeader}>
                    {t('debug.groupTitle', { index: index + 1 })} {group.meta.icon} {group.meta.name}
                  </Text>
                  <Text style={styles.groupInfo}>{t('debug.idLabel', { id: group.id })}</Text>
                  <Text style={styles.groupInfo}>{t('debug.membersCount', { count: group.members.length })}</Text>
                  <Text style={styles.groupInfo}>
                    {t('debug.membersNames', { names: group.members.map(m => m.name).join(', ') })}
                  </Text>
                  <Text style={styles.groupInfo}>{t('debug.currency', { currency: group.meta.currency })}</Text>
                  <Text style={styles.groupInfo}>
                    {t('debug.created', { date: new Date(group.meta.createdAt).toLocaleString() })}
                  </Text>
                  {group.id === currentGroupId && (
                    <Text style={styles.currentBadge}>{t('debug.currentGroupBadge')}</Text>
                  )}
                </View>
              ))
            )}
          </View>

          {/* JSON Export */}
          <View style={styles.section}>
            <Text style={styles.title}>{t('debug.jsonData')}</Text>
            <View style={styles.jsonContainer}>
              <Text style={styles.jsonText}>
                {JSON.stringify(
                  {
                    gunDB: {
                      url: gunUrl,
                      connected: gunConnectionStatus === 'connected',
                      groupCount: groups.length,
                    },
                    localStore: {
                      totalGroups: groups.length,
                      currentGroupId,
                      groups: groups.map(g => ({
                        id: g.id,
                        name: g.meta.name,
                        icon: g.meta.icon,
                        members: g.members.length,
                        currency: g.meta.currency,
                      })),
                    },
                  },
                  null,
                  2
                )}
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 16,
    },
    section: {
      marginBottom: 24,
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 12,
      color: colors.text,
    },
    subtitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
      color: colors.muted,
      marginTop: 12,
    },
    infoCard: {
      backgroundColor: colors.surface,
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    label: {
      fontSize: 14,
      color: colors.muted,
    },
    value: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
      textAlign: 'right',
      marginLeft: 8,
    },
    statusCard: {
      padding: 12,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    statusCardSuccess: {
      backgroundColor: '#d1fae5',
      borderWidth: 1,
      borderColor: '#10b981',
    },
    statusCardWarning: {
      backgroundColor: '#fef3c7',
      borderWidth: 1,
      borderColor: '#f59e0b',
    },
    statusCardError: {
      backgroundColor: '#fee2e2',
      borderWidth: 1,
      borderColor: '#ef4444',
    },
    statusText: {
      fontSize: 14,
      fontWeight: '600',
    },
    groupCard: {
      backgroundColor: colors.surface,
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    groupHeader: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    groupInfo: {
      fontSize: 13,
      color: colors.muted,
      marginBottom: 4,
    },
    currentBadge: {
      backgroundColor: '#10b981',
      color: '#fff',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      fontSize: 12,
      fontWeight: '600',
      alignSelf: 'flex-start',
      marginTop: 8,
    },
    emptyCard: {
      backgroundColor: colors.surface,
      padding: 24,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: colors.muted,
      fontStyle: 'italic',
    },
    jsonContainer: {
      backgroundColor: '#1e293b',
      padding: 12,
      borderRadius: 8,
      overflow: 'hidden',
    },
    jsonText: {
      fontFamily: 'monospace',
      fontSize: 11,
      color: '#e2e8f0',
      lineHeight: 14,
    },
  });

export default DebugScreen;