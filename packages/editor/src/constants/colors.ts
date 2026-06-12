// Color types
export type TextColor =
  | 'default'
  | 'gray'
  | 'brown'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'red';

export type BackgroundColor =
  | 'default'
  | 'gray_background'
  | 'brown_background'
  | 'orange_background'
  | 'yellow_background'
  | 'green_background'
  | 'blue_background'
  | 'purple_background'
  | 'pink_background'
  | 'red_background';

export const TEXT_COLORS: { value: TextColor; labelKey: string; colorClass: string }[] = [
  { value: 'default', labelKey: 'editor.colors.defaultText', colorClass: 'text-black dark:text-gray-100' },
  { value: 'gray', labelKey: 'editor.colors.grayText', colorClass: 'text-gray-500' },
  { value: 'brown', labelKey: 'editor.colors.brownText', colorClass: 'text-amber-700' },
  { value: 'orange', labelKey: 'editor.colors.orangeText', colorClass: 'text-orange-600' },
  { value: 'yellow', labelKey: 'editor.colors.yellowText', colorClass: 'text-yellow-600' },
  { value: 'green', labelKey: 'editor.colors.greenText', colorClass: 'text-green-600' },
  { value: 'blue', labelKey: 'editor.colors.blueText', colorClass: 'text-blue-600' },
  { value: 'purple', labelKey: 'editor.colors.purpleText', colorClass: 'text-purple-600' },
  { value: 'pink', labelKey: 'editor.colors.pinkText', colorClass: 'text-pink-600' },
  { value: 'red', labelKey: 'editor.colors.redText', colorClass: 'text-red-600' },
];

export const BACKGROUND_COLORS: { value: BackgroundColor; labelKey: string; colorClass: string }[] = [
  { value: 'default', labelKey: 'editor.colors.defaultBackground', colorClass: 'bg-transparent' },
  { value: 'gray_background', labelKey: 'editor.colors.grayBackground', colorClass: 'bg-gray-100 dark:bg-gray-800' },
  {
    value: 'brown_background',
    labelKey: 'editor.colors.brownBackground',
    colorClass: 'bg-amber-50 dark:bg-amber-900/20',
  },
  {
    value: 'orange_background',
    labelKey: 'editor.colors.orangeBackground',
    colorClass: 'bg-orange-50 dark:bg-orange-900/20',
  },
  {
    value: 'yellow_background',
    labelKey: 'editor.colors.yellowBackground',
    colorClass: 'bg-yellow-50 dark:bg-yellow-900/20',
  },
  {
    value: 'green_background',
    labelKey: 'editor.colors.greenBackground',
    colorClass: 'bg-green-50 dark:bg-green-900/20',
  },
  { value: 'blue_background', labelKey: 'editor.colors.blueBackground', colorClass: 'bg-blue-50 dark:bg-blue-900/20' },
  {
    value: 'purple_background',
    labelKey: 'editor.colors.purpleBackground',
    colorClass: 'bg-purple-50 dark:bg-purple-900/20',
  },
  { value: 'pink_background', labelKey: 'editor.colors.pinkBackground', colorClass: 'bg-pink-50 dark:bg-pink-900/20' },
  { value: 'red_background', labelKey: 'editor.colors.redBackground', colorClass: 'bg-red-50 dark:bg-red-900/20' },
];

export const COLLABORATION_COLORS = [
  '#10b981', // green-500
  '#3b82f6', // blue-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#ef4444', // red-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#14b8a6', // teal-500
  '#6366f1', // indigo-500
  '#84cc16', // lime-500
  '#a855f7', // purple-500
];

export const getCollaborationColor = (userId: number | string | undefined): string => {
  let index = 0;
  if (typeof userId === 'number') {
    index = userId;
  } else if (typeof userId === 'string') {
    for (let i = 0; i < userId.length; i++) index = (index + userId.charCodeAt(i)) | 0;
  }
  return COLLABORATION_COLORS[Math.abs(index) % COLLABORATION_COLORS.length];
};

export const PAIR_COLORS = [
  '#6366f1', // indigo
  '#f59e0b', // amber
  '#ec4899', // pink
  '#14b8a6', // teal
  '#8b5cf6', // violet
  '#f97316', // orange
  '#06b6d4', // cyan
  '#d946ef', // fuchsia
  '#0ea5e9', // sky
  '#a3e635', // lime
  '#e11d48', // rose
  '#0d9488', // teal-dark
  '#7c3aed', // purple
  '#ea580c', // orange-dark
  '#2563eb', // blue
  '#c026d3', // fuchsia-dark
]

// Design System Theme Colors
export const theme = {
  // Primary colors
  primaryBlue: '#31A2FF',
  primaryBlueHover: '#0086F4',
  primaryBlueLight: '#68BBFE',
  primaryBlueDisabled: '#92CEFF',
  primaryBlueBg: '#EFF9FF',
  backgroundBlue: '#D7EFFF',

  // Accent colors
  pinkAccent: '#FF50AA',
  errorPink: '#FF50AA',

  // Text colors
  darkText: '#293241',
  grayText: '#4B5566',
  placeholderText: '#8896A6',

  // Background & border colors
  inputBg: '#FAFBFC',
  lightGray: '#ECF0F7',
  borderColor: '#C5CCD6',
  white: '#FFFFFF',
} as const

export type ThemeColor = keyof typeof theme

