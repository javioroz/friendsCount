import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Modal, Text, Switch, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from '@/src/contexts/ThemeContext';
import { useGroupStore } from '@/src/stores/groupStore';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform, Alert as RNAlert } from 'react-native';
import { useTranslation } from 'react-i18next';
import i18n from '@/src/i18n/i18n';

const HeaderRightButton = ({ onPress }: { onPress: () => void }) => {
  return (
    <TouchableOpacity onPress={onPress} style={styles.headerButton}>
      <Ionicons name="menu" size={24} color="#fff" />
    </TouchableOpacity>
  );
};

const LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'pt', label: 'Português' },
  { code: 'it', label: 'Italiano' },
  { code: 'de', label: 'Deutsch' },
  { code: 'eo', label: 'Esperanto' },
];

const AppContent = () => {
  const { isDarkMode, colors, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalCloseArea}
            onPress={() => setIsModalVisible(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <TouchableOpacity
              onPress={() => setIsModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('settings.settingsTitle')}</Text>
            <View style={styles.settingItem}>
              <View style={styles.settingRow}>
                <Text style={[styles.settingText, { color: colors.text }]}>{t('settings.darkMode')}</Text>
                <Switch
                  value={isDarkMode}
                  onValueChange={toggleTheme}
                  trackColor={{ false: '#767577', true: colors.secondary }}
                  thumbColor={isDarkMode ? '#f5dd4b' : '#f4f3f4'}
                />
              </View>
            </View>
            <View style={styles.settingItem}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>{t('settings.language')}</Text>
              <ScrollView horizontal={false} style={{ maxHeight: 320 }}>
                {LANGUAGES.map((lang) => (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.languageOption,
                      i18n.language === lang.code && { backgroundColor: colors.primary + '20' },
                    ]}
                    onPress={() => changeLanguage(lang.code)}
                  >
                    <Text
                      style={[
                        styles.languageOptionText,
                        { color: colors.text },
                        i18n.language === lang.code && { fontWeight: 'bold', color: colors.primary },
                      ]}
                    >
                      {lang.label}
                    </Text>
                    {i18n.language === lang.code && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={styles.settingItem}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>{t('settings.exportGroups')}</Text>
              <TouchableOpacity
                style={[styles.exportButton, { borderColor: colors.primary }]}
                onPress={async () => {
                  try {
                    const groups = useGroupStore.getState().groups;
                    const data = JSON.stringify(groups, null, 2);
                    const fileName = `friendscount-groups-${new Date().toISOString().slice(0,19).replace(/[:T]/g, '-')}.json`;

                    if (Platform.OS === 'web') {
                      const blob = new Blob([data], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = fileName;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      URL.revokeObjectURL(url);
                      RNAlert.alert(t('settings.exportSuccess'), t('settings.exportedToDownloads'));
                      return;
                    }

                    // Try to write directly to Downloads on Android if possible
                    if (Platform.OS === 'android') {
                      try {
                        const downloadsFile = new FileSystem.File(`file:///storage/emulated/0/Download`, fileName);
                        downloadsFile.write(data, { encoding: 'utf8' });
                        RNAlert.alert(t('settings.exportSuccess'), `${t('settings.exportedTo') || 'Exportado a'}: ${downloadsFile.uri}`);
                        return;
                      } catch (err) {
                        console.warn('Direct Android download write failed, falling back to app document directory', err);
                      }
                    }

                    // Fallback: write to app document directory and open share dialog
                    const file = new FileSystem.File(FileSystem.Paths.document, fileName);
                    file.write(data, { encoding: 'utf8' });
                    if (await Sharing.isAvailableAsync()) {
                      await Sharing.shareAsync(file.uri, { mimeType: 'application/json' });
                    }
                    RNAlert.alert(t('settings.exportSuccess'), t('settings.checkShareOrDownloads'));
                  } catch (error: any) {
                    console.error('Export error', error);
                    RNAlert.alert(t('alert.error'), t('settings.exportFailed') || 'No se pudo exportar la base de datos.');
                  }
                }}
              >
                <Text style={[styles.exportButtonText, { color: colors.primary }]}>{t('settings.export')}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingItem}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>{t('settings.developerInfo')}</Text>
              <Text style={[styles.modalText, { color: colors.text }]}>
                {t('settings.developerText')}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
      <Stack
        screenOptions={({ route }) => ({
          headerStyle: {
            backgroundColor: colors.headerBackground,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerShown: !route.name?.startsWith('group'),
        })}
      >
        <Stack.Screen
          name="index"
          options={{
            title: ' FriendsCount ',
            headerShown: true,
            headerLeft: () => (
              <Image
                source={isDarkMode ? require('@/assets/friendsCount_logo_dark.png') : require('@/assets/friendsCount_logo_light.png')}
                style={styles.headerLogo}
              />
            ),
            headerRight: () => <HeaderRightButton onPress={() => setIsModalVisible(true)} />,
          }}
        />
        <Stack.Screen
          name="createEditGroup"
          options={{
            title: 'Crear grupo',
            headerBackTitle: 'Atrás',
          }}
        />
        <Stack.Screen
          name="joinGroup"
          options={{
            title: 'Unirse a grupo',
            headerBackTitle: 'Atrás',
          }}
        />
        <Stack.Screen
          name="debug"
          options={{
            title: 'Debug - Store Local',
            headerBackTitle: 'Atrás',
          }}
        />
      </Stack>
    </View>
  );
};

const RootLayout = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerLogo: {
    width: 32,
    height: 32,
    marginLeft: 10,
    resizeMode: 'contain',
  },
  headerButton: {
    marginRight: 10,
  },
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  modalCloseArea: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '70%',
    backgroundColor: '#fff',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#374151',
  },
  settingItem: {
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row', 
    justifyContent: 'space-between',
  },
  settingText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 10,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 10,
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  languageOptionText: {
    fontSize: 15,
  },
  modalText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#6b7280',
  },
  exportButton: {
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RootLayout;
