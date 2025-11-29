// Modern gradient and color utilities for the app

export const modernGradients = {
  primary: 'bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500',
  secondary: 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500',
  success: 'bg-gradient-to-br from-green-400 to-emerald-600',
  danger: 'bg-gradient-to-br from-red-400 to-rose-600',
  warning: 'bg-gradient-to-br from-amber-400 to-orange-600',
  info: 'bg-gradient-to-br from-cyan-400 to-blue-600',
  dark: 'bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900',
  
  // Card backgrounds
  cardPrimary: 'bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-gray-900',
  cardSecondary: 'bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-gray-900',
  cardAccent: 'bg-gradient-to-br from-white to-pink-50 dark:from-gray-800 dark:to-gray-900',
  
  // Overlay gradients
  overlay: 'bg-gradient-to-t from-black/60 via-black/30 to-transparent',
};

export const modernShadows = {
  sm: 'shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50',
  md: 'shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50',
  lg: 'shadow-2xl shadow-gray-300/50 dark:shadow-black/50',
  colored: 'shadow-xl shadow-blue-500/20 dark:shadow-blue-500/40',
};

export const hoverEffects = {
  scale: 'hover:scale-105 transition-transform duration-300 ease-out',
  lift: 'hover:-translate-y-1 transition-all duration-300 ease-out',
  glow: 'hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300',
  pulse: 'hover:animate-pulse',
};

export const transitions = {
  smooth: 'transition-all duration-300 ease-out',
  fast: 'transition-all duration-150 ease-out',
  slow: 'transition-all duration-500 ease-out',
};
