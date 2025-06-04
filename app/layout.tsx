import './globals.css';
import type { Metadata } from 'next';
import { Inter as FontSans } from 'next/font/google';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Dynamically import heavy components
const ThemeProvider = dynamic(() => import('@/components/theme/theme-provider'), {
  ssr: false,
  loading: () => null
});

const AuthProvider = dynamic(() => import('@/contexts/auth-context'), {
  ssr: false,
  loading: () => null
});

const Navbar = dynamic(() => import('@/components/layout/navbar'), {
  loading: () => (
    <div className="h-16 w-full bg-background/80 backdrop-blur-sm">
      <div className="container flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    </div>
  )
});

const Toaster = dynamic(() => 
  import('@/components/ui/toaster').then(mod => ({ default: mod.Toaster })), 
  {
    ssr: false,
    loading: () => null
  }
);

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'StoryCanvas - AI Storybook Generator',
  description: 'Create beautiful cartoon storybooks with AI using your own images',
  keywords: ['AI', 'storybook', 'children', 'cartoon', 'generator', 'DALL-E', 'OpenAI'],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={cn('antialiased', fontSans.variable)}>
      <head />
      <body className="min-h-screen bg-background font-sans">
        <Suspense fallback={null}>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              <Navbar />
              {children}
              <Toaster />
            </AuthProvider>
          </ThemeProvider>
        </Suspense>
      </body>
    </html>
  );
}