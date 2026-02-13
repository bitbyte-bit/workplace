import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Theme, fetchTheme, saveTheme } from '../services/db';

interface ThemeColors {
  primary: string;
  primaryHover: string;
  primaryLight: string;
  secondary: string;
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceBorder: string;
  text: string;
  textMuted: string;
  textInverse: string;
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  colors: ThemeColors;
}

const themeColors: Record<Theme, ThemeColors> = {
  light: {
    primary: '#2563eb',
    primaryHover: '#1d4ed8',
    primaryLight: '#3b82f6',
    secondary: '#64748b',
    background: '#f8fafc',
    backgroundAlt: '#f1f5f9',
    surface: '#ffffff',
    surfaceBorder: '#e2e8f0',
    text: '#0f172a',
    textMuted: '#64748b',
    textInverse: '#ffffff',
  },
  dark: {
    primary: '#3b82f6',
    primaryHover: '#60a5fa',
    primaryLight: '#60a5fa',
    secondary: '#94a3b8',
    background: '#0f172a',
    backgroundAlt: '#1e293b',
    surface: '#1e293b',
    surfaceBorder: '#334155',
    text: '#f1f5f9',
    textMuted: '#94a3b8',
    textInverse: '#0f172a',
  },
  blue: {
    primary: '#0ea5e9',
    primaryHover: '#0284c7',
    primaryLight: '#38bdf8',
    secondary: '#7dd3fc',
    background: '#0c4a6e',
    backgroundAlt: '#0369a1',
    surface: '#0284c7',
    surfaceBorder: '#0ea5e9',
    text: '#f0f9ff',
    textMuted: '#bae6fd',
    textInverse: '#0c4a6e',
  },
  green: {
    primary: '#22c55e',
    primaryHover: '#16a34a',
    primaryLight: '#4ade80',
    secondary: '#86efac',
    background: '#14532d',
    backgroundAlt: '#166534',
    surface: '#15803d',
    surfaceBorder: '#22c55e',
    text: '#f0fdf4',
    textMuted: '#bbf7d0',
    textInverse: '#14532d',
  },
  purple: {
    primary: '#a855f7',
    primaryHover: '#9333ea',
    primaryLight: '#c084fc',
    secondary: '#d8b4fe',
    background: '#4c1d95',
    backgroundAlt: '#5b21b6',
    surface: '#7c3aed',
    surfaceBorder: '#a855f7',
    text: '#faf5ff',
    textMuted: '#e9d5ff',
    textInverse: '#4c1d95',
  },
  warm: {
    primary: '#f59e0b',
    primaryHover: '#d97706',
    primaryLight: '#fbbf24',
    secondary: '#fcd34d',
    background: '#451a03',
    backgroundAlt: '#78350f',
    surface: '#92400e',
    surfaceBorder: '#f59e0b',
    text: '#fffbeb',
    textMuted: '#fde68a',
    textInverse: '#451a03',
  },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [themeLoaded, setThemeLoaded] = useState(false);

  // Load theme from database on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await fetchTheme();
        setThemeState(savedTheme);
      } catch (error) {
        console.error('Failed to load theme from database:', error);
      } finally {
        setThemeLoaded(true);
      }
    };
    loadTheme();
  }, []);

  const setTheme = useCallback(async (newTheme: Theme) => {
    setThemeState(newTheme);
    await saveTheme(newTheme);
  }, []);

  useEffect(() => {
    const colors = themeColors[theme];
    
    // Apply CSS custom properties
    const root = document.documentElement;
    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--color-primary-hover', colors.primaryHover);
    root.style.setProperty('--color-primary-light', colors.primaryLight);
    root.style.setProperty('--color-secondary', colors.secondary);
    root.style.setProperty('--color-background', colors.background);
    root.style.setProperty('--color-background-alt', colors.backgroundAlt);
    root.style.setProperty('--color-surface', colors.surface);
    root.style.setProperty('--color-surface-border', colors.surfaceBorder);
    root.style.setProperty('--color-text', colors.text);
    root.style.setProperty('--color-text-muted', colors.textMuted);
    root.style.setProperty('--color-text-inverse', colors.textInverse);
    
    // Update body classes
    document.body.className = `bg-[var(--color-background)] text-[var(--color-text)]`;
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, colors: themeColors[theme] }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
