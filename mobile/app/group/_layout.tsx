import { Stack } from 'expo-router';
import { useTheme } from '@/src/contexts/ThemeContext';
import React from 'react';

const GroupLayout = () => {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.headerBackground,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    />
  );
};

export default GroupLayout;
