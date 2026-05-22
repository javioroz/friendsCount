import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { ThemedText } from '@/src/components/ThemedText';
import { useTheme } from '@/src/contexts/ThemeContext';
import { getGun } from '@/src/services/gunService';

const DebugScreen = () => {
  const { colors } = useTheme();
  const [groups, setGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Desconectado');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const fetchGroups = async () => {
    setIsLoading(true);
    setGroups([]);
    addLog('Conectando a GunDB...');

    try {
      const gun = getGun();
      
      // Check connection
      setConnectionStatus('Conectando...');
      
      const groupsRef = gun.get('friendscount').get('groups');
      const fetchedGroups: any[] = [];

      // Use map to iterate over all groups
      await new Promise<void>((resolve) => {
        let resolved = false;
        const timeout = setTimeout(() => {
          if (!resolved) {
            addLog('Timeout esperando grupos');
            resolve();
          }
        }, 5000);

        groupsRef.map().once((group: any, id: string) => {
          if (group) {
            addLog(`Grupo encontrado: ${id} - ${JSON.stringify(group).substring(0, 100)}...`);
            fetchedGroups.push({ id, ...group });
          }
        });

        // Wait a bit for all groups to be fetched
        setTimeout(() => {
          clearTimeout(timeout);
          resolved = true;
          addLog(`Total grupos encontrados: ${fetchedGroups.length}`);
          resolve();
        }, 3000);
      });

      setGroups(fetchedGroups);
      setConnectionStatus('Conectado');
      addLog('Grupos actualizados');
    } catch (error: any) {
      addLog(`Error: ${error.message}`);
      setConnectionStatus('Error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Debug GunDB',
          headerBackTitle: 'Atrás',
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView 
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={fetchGroups}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
              Estado de la conexión
            </ThemedText>
            <View style={[styles.statusBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ThemedText style={[styles.statusText, { color: connectionStatus === 'Conectado' ? '#22c55e' : '#ef4444' }]}>
                {connectionStatus}
              </ThemedText>
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
              Grupos en GunDB
            </ThemedText>
            <ThemedText style={[styles.hint, { color: colors.muted }]}>
              Desliza hacia abajo para actualizar
            </ThemedText>
            
            {isLoading && <ActivityIndicator style={styles.loader} color={colors.primary} />}
            
            {groups.length === 0 && !isLoading ? (
              <ThemedText style={[styles.emptyText, { color: colors.muted }]}>
                No se encontraron grupos
              </ThemedText>
            ) : (
              groups.map((group) => (
                <View key={group.id} style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <ThemedText style={[styles.groupId, { color: colors.text }]}>
                    {group.id}
                  </ThemedText>
                  {group.meta && (
                    <ThemedText style={[styles.groupName, { color: colors.muted }]}>
                      {group.meta.name} ({group.meta.icon})
                    </ThemedText>
                  )}
                </View>
              ))
            )}
          </View>

          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
              Logs
            </ThemedText>
            <View style={[styles.logBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {logs.map((log, index) => (
                <ThemedText key={index} style={[styles.logLine, { color: colors.muted }]}>
                  {log}
                </ThemedText>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.testButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              const gun = getGun();
              const testId = `test_${Date.now()}`;
              gun.get('friendscount').get('test').get(testId).put({ 
                message: 'Test message', 
                timestamp: new Date().toISOString() 
              });
              addLog(`Test escrito: ${testId}`);
            }}
          >
            <ThemedText style={styles.testButtonText}>Escribir dato de prueba</ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  statusBox: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    marginBottom: 12,
  },
  loader: {
    marginVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
  groupCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  groupId: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  groupName: {
    fontSize: 12,
    marginTop: 4,
  },
  logBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    maxHeight: 200,
  },
  logLine: {
    fontSize: 11,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  testButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 40,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default DebugScreen;