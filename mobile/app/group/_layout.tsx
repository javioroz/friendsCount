import { Stack } from 'expo-router';
import { ThemeProvider, useTheme } from '@/src/contexts/ThemeContext';
import React from 'react';

const GroupLayoutInner = () => {
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
    >
      {/* Group screen will be rendered by [id].tsx */}
    </Stack>
  );
};

export default function GroupLayout() {
  return (
    <ThemeProvider>
      <GroupLayoutInner />
    </ThemeProvider>
  );
}