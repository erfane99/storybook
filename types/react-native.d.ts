declare module 'react-native' {
  export const Platform: {
    OS: 'web' | 'ios' | 'android';
    select: <T extends Record<string, any>>(obj: T) => T[keyof T];
  };
}