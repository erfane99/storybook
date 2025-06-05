export const isNative = () => {
  if (typeof window === 'undefined') return false;
  return 'ReactNativeWebView' in window;
};

export * from './universal';