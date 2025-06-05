'use client';

import { Suspense } from 'react';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/contexts/auth-context';
import Navbar from '@/components/layout/navbar';
import { Toaster } from '@/components/ui/toaster';
import { Loader2 } from 'lucide-react';

export function RootClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <Suspense fallback={
          <div className="h-16 w-full bg-background/80 backdrop-blur-sm">
            <div className="container flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </div>
        }>
          <Navbar />
          {children}
          <Toaster />
        </Suspense>
      </AuthProvider>
    </ThemeProvider>
  );
}