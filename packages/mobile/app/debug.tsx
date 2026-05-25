import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useGroupStore } from '@/src/stores/groupStore';
import { Stack } from 'expo-router';
import { getGun, checkConnection } from '@/src/services/gunService';
import { Ionicons } from '@expo/vector-icons';

interface GunGroup {
  id: string;
  name: string;
  icon: string;
  currency: string;
  createdAt: string;
  memberCount: number;
}

const DebugScreen = () => {
  const { groups, currentGroupId } = useGroupStore();
  const [gunConnectionStatus, setGunConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [gunUrl, setGunUrl] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Get Gun URL from environment or default
    const gunRelayUrl = process.env.EXPO_PUBLIC_GUN_RELAY || 'ws://localhost:3001/gun';
    setGunUrl(gunRelayUrl);

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
            <Text style={[styles.statusText, { color: '#f59e0b' }]}>Verificando conexión...</Text>
          </View>
        );
      case 'connected':
        return (
          <View style={[styles.statusCard, styles.statusCardSuccess]}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={[styles.statusText, { color: '#10b981' }]}>Conectado a GunDB</Text>
          </View>
        );
      case 'disconnected':
        return (
          <View style={[styles.statusCard, styles.statusCardError]}>
            <Ionicons name="close-circle" size={20} color="#ef4444" />
            <Text style={[styles.statusText, { color: '#ef4444' }]}>Desconectado de GunDB</Text>
          </View>
        );
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Debug - Store Local',
          headerBackTitle: 'Atrás',
        }}
      />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* GunDB Connection Status */}
          <View style={styles.section}>
            <Text style={styles.title}>🔗 Estado de GunDB</Text>
            
            <View style={styles.infoCard}>
              <Text style={styles.label}>URL del servidor:</Text>
              <Text style={[styles.value, { fontSize: 12 }]} numberOfLines={1}>{gunUrl}</Text>
            </View>

            {renderConnectionStatus()}

            <View style={styles.infoCard}>
              <Text style={styles.label}>Grupos en GunDB:</Text>
              <Text style={styles.value}>{groups.length} (mismo que store local)</Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.label}>Nota:</Text>
              <Text style={[styles.value, { fontSize: 11, textAlign: 'left' }]}>Los grupos en GunDB se sincronizan con el store local</Text>
            </View>
          </View>

          {/* Local Store Status */}
          <View style={styles.section}>
            <Text style={styles.title}>📦 Estado del Store Local</Text>
            
            <View style={styles.infoCard}>
              <Text style={styles.label}>Total de grupos:</Text>
              <Text style={styles.value}>{groups.length}</Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.label}>Grupo actual:</Text>
              <Text style={styles.value}>{currentGroupId || 'Ninguno'}</Text>
            </View>
          </View>

          {/* Local Groups List */}
          <View style={styles.section}>
            <Text style={styles.title}>📋 Lista de Grupos Locales</Text>
            {groups.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No hay grupos en el store local</Text>
              </View>
            ) : (
              groups.map((group, index) => (
                <View key={group.id} style={styles.groupCard}>
                  <Text style={styles.groupHeader}>
                    Grupo #{index + 1}: {group.icon} {group.name}
                  </Text>
                  <Text style={styles.groupInfo}>ID: {group.id}</Text>
                  <Text style={styles.groupInfo}>Miembros: {group.members.length}</Text>
                  <Text style={styles.groupInfo}>
                    Miembros: {group.members.map(m => m.name).join(', ')}
                  </Text>
                  <Text style={styles.groupInfo}>Divisa: {group.currency}</Text>
                  <Text style={styles.groupInfo}>
                    Creado: {new Date(group.createdAt).toLocaleString()}
                  </Text>
                  {group.id === currentGroupId && (
                    <Text style={styles.currentBadge}>← Grupo Actual</Text>
                  )}
                </View>
              ))
            )}
          </View>

          {/* JSON Export */}
          <View style={styles.section}>
            <Text style={styles.title}>🔍 Datos en JSON</Text>
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
                        name: g.name,
                        icon: g.icon,
                        members: g.members.length,
                        currency: g.currency,
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#666',
    marginTop: 12,
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
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
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  groupHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  groupInfo: {
    fontSize: 13,
    color: '#666',
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
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
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