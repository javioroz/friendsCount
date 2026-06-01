import { Stack } from 'expo-router';
import { useTheme } from '@/src/contexts/ThemeContext';

export default function GroupLayout() {
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
}
