// types/react-native.d.ts

// Existing shim for React Native Platform detection
declare module 'react-native' {
  export const Platform: {
    OS: 'web' | 'ios' | 'android';
    select: <T extends Record<string, any>>(obj: T) => T[keyof T];
  };
}

// ✅ Shim for AsyncStorage (native-only)
declare module '@react-native-async-storage/async-storage' {
  const AsyncStorage: any;
  export default AsyncStorage;
}

// ✅ Shim for URL polyfill (native-only)
declare module 'react-native-url-polyfill/auto' {
  const polyfill: any;
  export default polyfill;
}

// ✅ Global variable shim used for ReactNativeWebView detection
declare var ReactNativeWebView: any;