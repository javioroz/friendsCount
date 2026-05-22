import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ThemeColors {
  background: string;
  primary: string;
  secondary: string;
  text: string;
  headerBackground: string;
  surface: string;
  border: string;
  muted: string;
}

const lightTheme: ThemeColors = {
  background: '#dcebfeff',
  primary: '#003888ff',
  secondary: '#289dfeff',
  text: '#374151',
  headerBackground: '#003888ff',
  surface: '#ffffff',
  border: '#d1d5db',
  muted: '#6b7280',
};

const darkTheme: ThemeColors = {
  background: '#042340ff',
  primary: '#00a7a9ff',
  secondary: '#0081f9ff',
  text: '#ffffff',
  headerBackground: '#00a7a9ff',
  surface: '#0b1a37',
  border: '#1c3358',
  muted: '#94a3b8',
};

interface ThemeContextType {
  isDarkMode: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const colors = isDarkMode ? darkTheme : lightTheme;

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};