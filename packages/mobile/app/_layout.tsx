import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Modal, Text, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from '@/src/contexts/ThemeContext';

const HeaderRightButton = ({ onPress }: { onPress: () => void }) => {
  return (
    <TouchableOpacity onPress={onPress} style={styles.headerButton}>
      <Ionicons name="menu" size={24} color="#fff" />
    </TouchableOpacity>
  );
};

const AppContent = () => {
  const { isDarkMode, colors, toggleTheme } = useTheme();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isTabsTop, setIsTabsTop] = useState(false);

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
            <Text style={[styles.modalTitle, { color: colors.text }]}>Ajustes de la aplicación</Text>
            <View style={styles.settingItem}>
              <Text style={[styles.settingText, { color: colors.text }]}>Cambiar modo oscuro / claro</Text>
              <Switch
                value={isDarkMode}
                onValueChange={toggleTheme}
                trackColor={{ false: '#767577', true: colors.secondary }}
                thumbColor={isDarkMode ? '#f5dd4b' : '#f4f3f4'}
              />
            </View>
            <View style={styles.settingItem}>
              <Text style={[styles.settingText, { color: colors.text }]}>Cambiar pestañas arriba / abajo</Text>
              <Switch
                value={isTabsTop}
                onValueChange={setIsTabsTop}
                trackColor={{ false: '#767577', true: colors.secondary }}
                thumbColor={isTabsTop ? '#f5dd4b' : '#f4f3f4'}
              />
            </View>
            <View style={styles.settingItem}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Información sobre el desarrollador:</Text>
              <Text style={[styles.modalText, { color: colors.text }]}>
                Esta app fue desarrollada por PiratasLab, si te gusta invítanos a un café.
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
            title: 'FriendsCount',
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
  modalText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#6b7280',
  },
});

export default RootLayout;
