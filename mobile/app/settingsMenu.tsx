import React, { useState } from 'react';
import { View, TouchableOpacity, Modal, Text, Switch, ScrollView, StyleSheet, Platform, Alert as RNAlert, Image, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useGroupStore } from '@/src/stores/groupStore';
import * as FileSystem from 'expo-file-system';
import { useTranslation } from 'react-i18next';
import i18n from '@/src/i18n/i18n';

const BTC_ADDRESS = "bt1qk9fth93zngtxtyg72s5qjlsju70ufdltzqk4f0";

interface SettingsMenuProps {
  visible: boolean;
  onClose: () => void;
}

const SettingsMenu = ({ visible, onClose }: SettingsMenuProps) => {
  const { isDarkMode, colors, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    setLanguageMenuOpen(false);
  };

  const selectedLanguage = LANGUAGES.find((lang) => lang.code === i18n.language) ?? LANGUAGES[0];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalCloseArea} onPress={onClose} />
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}> 
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>{t('settings.settingsTitle')}</Text>
          <View style={styles.settingItem}>
            <View style={styles.rowBetween}>
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
            <TouchableOpacity
              style={[
                styles.languageSelectorButton,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
              onPress={() => setLanguageMenuOpen((prev) => !prev)}
            >
              <Text style={[styles.languageSelectorText, { color: colors.text }]}>
                {selectedLanguage.label}
              </Text>
              <Ionicons name={languageMenuOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.text} />
            </TouchableOpacity>

            {languageMenuOpen && (
              <View style={styles.languageDropdown}>
                {LANGUAGES.filter((lang) => lang.code !== selectedLanguage.code).map((lang) => (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.languageOption,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                      },
                    ]}
                    onPress={() => changeLanguage(lang.code)}
                  >
                    <Text style={[styles.languageOptionText, { color: colors.text }]}>
                      {lang.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
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

                  // Save to app's document directory (always works without special permissions)
                  const file = new FileSystem.File(FileSystem.Paths.document, fileName);
                  await file.write(data, { encoding: 'utf8' });
                  
                  // Inform user where file is saved
                  // Note: expo-sharing is not available in this build, but the file is saved
                  RNAlert.alert(
                    t('settings.exportSuccess'),
                    `Archivo guardado en documentos de la app: ${file.uri}`
                  );
                  return;
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
            <View style={styles.rowBetween}>
              <TouchableOpacity onPress={() => Linking.openURL(`bitcoin:${BTC_ADDRESS}?amount=0.0001&label=Support_FriendsCount&message=Donation_to_FriendsCount`)} style={{ flex: 1, marginRight: 10 }}>
                <Image source={require('../assets/bitcoin.png')} style={styles.developerImage} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => Linking.openURL('https://liberapay.com/PiratasLab/donate')} style={{ flex: 1, marginRight: 10 }}>
                <Image source={require('../assets/donate.png')} style={styles.developerImage} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
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

const styles = StyleSheet.create({
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
  rowBetween: {
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
  languageSelectorButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  languageSelectorText: {
    fontSize: 16,
    fontWeight: '500',
  },
  languageDropdown: {
    marginTop: 8,
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
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
  developerImage: {
    width: 100,
    height: 25,
    alignSelf: 'center',
    marginTop: 10,
    borderRadius: 5,
  },
});

export default SettingsMenu;
