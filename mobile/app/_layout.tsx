import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ThemeProvider, useTheme } from '@/src/contexts/ThemeContext';
import { useThemeStore } from '@/src/stores/themeStore';
import { useLanguageStore } from '@/src/stores/languageStore';
import SettingsMenu from '@/src/components/settingsMenu';

const HeaderRightButton = ({ onPress }: { onPress: () => void }) => {
  return (
    <TouchableOpacity onPress={onPress} style={styles.headerButton}>
      <Ionicons name="menu" size={24} color="#fff" />
    </TouchableOpacity>
  );
};

const AppContent = () => {
  const { isDarkMode, colors, hasHydrated, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const languageHydrated = useLanguageStore((state) => state.hasHydrated);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Rendering before the stored language loads would flash the default copy.
  if (!hasHydrated || !languageHydrated) {
    return <View style={[styles.container, { backgroundColor: colors.background }]} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsMenu visible={isModalVisible} onClose={() => setIsModalVisible(false)} />
      <Stack
        screenOptions={({ route }) => ({
          headerStyle: {
            backgroundColor: colors.headerBackground,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerShown: route.name === 'index',
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
            title: t('header.createGroup'),
            headerBackTitle: t('header.back'),
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="joinGroup"
          options={{
            title: t('header.joinGroup'),
            headerBackTitle: t('header.back'),
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="debug"
          options={{
            title: t('header.debug'),
            headerBackTitle: t('header.back'),
            headerShown: true,
          }}
        />
      </Stack>
    </View>
  );
};

const RootLayout = () => {
  const hasHydrated = useThemeStore((state) => state.hasHydrated);

  return (
    <SafeAreaProvider initialMetrics={hasHydrated ? initialWindowMetrics : null}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
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
